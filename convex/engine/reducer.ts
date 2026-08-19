/**
 * Pure, deterministic reducer for Dreamcats (new edition).
 *
 * This is the single source of truth for game rules. Convex mutations,
 * hotseat/solo play, and bots all drive the game exclusively through
 * `createGame` and `applyEvent`. Illegal events throw EngineError and must
 * leave callers' state untouched (the reducer never mutates its input).
 */

import { buildDeck, nextSeed, shuffle } from "./deck";
import { dreamScore, scoreRound } from "./scoring";
import {
  Card,
  DreamSlot,
  EngineError,
  EngineState,
  GameConfig,
  GameEvent,
} from "./types";

export const DREAM_SIZE = 4;
export const INITIAL_PEEKS = 2;

const DEFAULT_CONFIG: GameConfig = { targetScore: 100, wrongCallPenalty: 5 };

const fail = (code: string, message: string): never => {
  throw new EngineError(code, message);
};

/** State is plain JSON; cloning keeps the reducer pure. */
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const dealRound = (
  state: EngineState,
): Pick<EngineState, "drawPile" | "discardPile" | "seed"> & {
  dreams: DreamSlot[][];
} => {
  const seed = nextSeed(state.seed);
  const deck = shuffle(buildDeck(), seed);
  const dreams = state.players.map(() =>
    deck.splice(0, DREAM_SIZE).map((card) => ({ card, knownTo: [] as number[] })),
  );
  const discardPile = [deck.pop() as Card];
  return { seed, drawPile: deck, discardPile, dreams };
};

export const createGame = (
  players: { id: string; name: string }[],
  seed: number,
  config?: Partial<GameConfig>,
): EngineState => {
  if (players.length < 2 || players.length > 4) {
    fail("player_count", "Dreamcats supports 2-4 players");
  }
  const base: EngineState = {
    config: { ...DEFAULT_CONFIG, ...config },
    seed,
    round: 1,
    phase: "peeking",
    players: players.map((p) => ({
      id: p.id,
      name: p.name,
      dream: [],
      totalScore: 0,
      roundScores: [],
      peekedSlots: [],
    })),
    drawPile: [],
    discardPile: [],
    currentPlayer: 0,
    held: null,
    heldSource: null,
    take2Cards: null,
    swap2First: null,
    callerIndex: null,
    roundEnder: null,
    lastAction: null,
    roundResults: null,
    winners: null,
  };
  const { seed: newSeed, drawPile, discardPile, dreams } = dealRound(base);
  base.seed = newSeed;
  base.drawPile = drawPile;
  base.discardPile = discardPile;
  base.players.forEach((p, i) => (p.dream = dreams[i]));
  return base;
};

const requirePhase = (state: EngineState, ...phases: EngineState["phase"][]) => {
  if (!phases.includes(state.phase)) {
    fail(
      "wrong_phase",
      `Event not allowed in phase "${state.phase}" (expected ${phases.join("/")})`,
    );
  }
};

const requireSlot = (state: EngineState, player: number, slot: number) => {
  const p = state.players[player] ?? fail("bad_player", `No player ${player}`);
  if (slot < 0 || slot >= p.dream.length) {
    fail("bad_slot", `Player ${player} has no slot ${slot}`);
  }
};

/** Ends the current player's turn; ends the round if the draw pile is empty. */
const endTurn = (state: EngineState) => {
  state.held = null;
  state.heldSource = null;
  state.take2Cards = null;
  state.swap2First = null;
  if (state.drawPile.length === 0) {
    state.roundEnder = state.currentPlayer;
    endRound(state, true);
    return;
  }
  state.currentPlayer = (state.currentPlayer + 1) % state.players.length;
  state.phase = "awaitTurn";
};

const endRound = (state: EngineState, byDeckExhaustion: boolean) => {
  const raws = state.players.map((p) => dreamScore(p.dream));
  const results = scoreRound(raws, state.callerIndex, state.config.wrongCallPenalty);
  results.forEach((r, i) => {
    state.players[i].totalScore += r.added;
    state.players[i].roundScores.push(r.added);
  });
  state.roundResults = results;
  state.lastAction = { type: "roundEnded", byDeckExhaustion };
  const gameOver = state.players.some(
    (p) => p.totalScore >= state.config.targetScore,
  );
  if (gameOver) {
    const best = Math.min(...state.players.map((p) => p.totalScore));
    state.winners = state.players
      .map((p, i) => ({ p, i }))
      .filter(({ p }) => p.totalScore === best)
      .map(({ i }) => i);
    state.phase = "gameOver";
  } else {
    state.phase = "roundEnd";
  }
};

/** Puts `card` into `slot` of the current player's dream; old card → discard. */
const swapIntoDream = (state: EngineState, card: Card, slot: number) => {
  const player = state.players[state.currentPlayer];
  const replaced = player.dream[slot].card;
  player.dream[slot] = { card, knownTo: [state.currentPlayer] };
  state.discardPile.push(replaced);
  state.lastAction = {
    type: "swapped",
    player: state.currentPlayer,
    slot,
    discarded: replaced,
  };
};

export const applyEvent = (
  prevState: EngineState,
  event: GameEvent,
  /**
   * Player index performing the event, for authorization. Omit for trusted
   * callers (tests, bots driving their own turn).
   */
  actor?: number,
): EngineState => {
  const state = clone(prevState);

  // Authorization: outside "peeking", only the current player may act.
  if (actor !== undefined) {
    if (event.type === "peek") {
      if (event.player !== actor) fail("not_yours", "Can only peek your own dream");
    } else if (event.type !== "nextRound" && actor !== state.currentPlayer) {
      fail("not_your_turn", `It is player ${state.currentPlayer}'s turn`);
    }
  }

  switch (event.type) {
    case "peek": {
      requirePhase(state, "peeking");
      requireSlot(state, event.player, event.slot);
      const player = state.players[event.player];
      if (player.peekedSlots.length >= INITIAL_PEEKS) {
        fail("peeks_used", "Already peeked 2 cards");
      }
      if (player.peekedSlots.includes(event.slot)) {
        fail("already_peeked", "Slot already peeked");
      }
      player.peekedSlots.push(event.slot);
      const knownTo = player.dream[event.slot].knownTo;
      if (!knownTo.includes(event.player)) knownTo.push(event.player);
      state.lastAction = {
        type: "peeked",
        player: event.player,
        slot: event.slot,
        targetPlayer: event.player,
      };
      if (state.players.every((p) => p.peekedSlots.length >= INITIAL_PEEKS)) {
        state.phase = "awaitTurn";
      }
      return state;
    }

    case "drawDeck": {
      requirePhase(state, "awaitTurn");
      const card = state.drawPile.pop() ?? fail("deck_empty", "Draw pile is empty");
      state.held = card;
      state.heldSource = "deck";
      state.phase = "holdingDeck";
      state.lastAction = { type: "drewDeck", player: state.currentPlayer };
      return state;
    }

    case "drawDiscard": {
      requirePhase(state, "awaitTurn");
      const card =
        state.discardPile.pop() ?? fail("discard_empty", "Discard pile is empty");
      state.held = card;
      state.heldSource = "discard";
      state.phase = "holdingDiscard";
      state.lastAction = { type: "drewDiscard", player: state.currentPlayer, card };
      return state;
    }

    case "swapHeld": {
      requirePhase(state, "holdingDeck", "holdingDiscard", "choose1Swap");
      requireSlot(state, state.currentPlayer, event.slot);
      const held = state.held ?? fail("no_held", "No held card");
      swapIntoDream(state, held, event.slot);
      endTurn(state);
      return state;
    }

    case "discardHeld": {
      // Only cards taken from the deck (directly or via take_2) may be
      // discarded; a discard-pile take and a choose_1 pick must be swapped in.
      requirePhase(state, "holdingDeck");
      const held = state.held ?? fail("no_held", "No held card");
      state.discardPile.push(held);
      state.lastAction = { type: "discarded", player: state.currentPlayer, card: held };
      endTurn(state);
      return state;
    }

    case "activateSpecial": {
      requirePhase(state, "holdingDeck");
      const held = state.held ?? fail("no_held", "No held card");
      if (held.kind !== "special" || !held.special) {
        fail("not_special", "Held card has no special power");
      }
      // The special is discarded first, then its power resolves.
      state.discardPile.push(held);
      state.held = null;
      state.heldSource = null;
      state.lastAction = {
        type: "activated",
        player: state.currentPlayer,
        special: held.special!,
      };
      switch (held.special!) {
        case "choose_1":
          state.phase = "choose1Pick";
          return state;
        case "take_2": {
          const taken = state.drawPile.splice(-2).reverse();
          if (taken.length === 0) {
            // Nothing left to take; the power fizzles and the turn (and
            // round, via deck exhaustion) ends.
            endTurn(state);
            return state;
          }
          if (taken.length === 1) {
            state.held = taken[0];
            state.heldSource = "take2";
            state.phase = "holdingDeck";
            return state;
          }
          state.take2Cards = taken;
          state.phase = "take2Pick";
          return state;
        }
        case "peek_1":
          state.phase = "peek1Target";
          return state;
        case "swap_2":
          state.phase = "swap2First";
          return state;
      }
      return state;
    }

    case "choose1Pick": {
      requirePhase(state, "choose1Pick");
      const card = state.discardPile[event.discardIndex];
      if (!card) fail("bad_discard_index", `No discard card at ${event.discardIndex}`);
      state.discardPile.splice(event.discardIndex, 1);
      state.held = card;
      state.heldSource = "choose1";
      state.phase = "choose1Swap";
      state.lastAction = { type: "choose1Picked", player: state.currentPlayer, card };
      return state;
    }

    case "take2Pick": {
      requirePhase(state, "take2Pick");
      const cards = state.take2Cards ?? fail("no_take2", "No take_2 in progress");
      const kept = cards[event.index] ?? fail("bad_index", "Pick 0 or 1");
      const other = cards[1 - event.index];
      state.discardPile.push(other);
      state.take2Cards = null;
      state.held = kept;
      state.heldSource = "take2";
      state.phase = "holdingDeck";
      state.lastAction = {
        type: "take2Kept",
        player: state.currentPlayer,
        discarded: other,
      };
      return state;
    }

    case "peek1Target": {
      requirePhase(state, "peek1Target");
      requireSlot(state, event.player, event.slot);
      const knownTo = state.players[event.player].dream[event.slot].knownTo;
      if (!knownTo.includes(state.currentPlayer)) knownTo.push(state.currentPlayer);
      state.lastAction = {
        type: "peeked",
        player: state.currentPlayer,
        slot: event.slot,
        targetPlayer: event.player,
      };
      endTurn(state);
      return state;
    }

    case "swap2Select": {
      requirePhase(state, "swap2First", "swap2Second");
      requireSlot(state, event.player, event.slot);
      if (state.phase === "swap2First") {
        state.swap2First = { player: event.player, slot: event.slot };
        state.phase = "swap2Second";
        return state;
      }
      const first = state.swap2First ?? fail("no_first", "No first selection");
      if (first.player === event.player && first.slot === event.slot) {
        fail("same_slot", "Pick two different cards");
      }
      const a = state.players[first.player].dream[first.slot];
      const b = state.players[event.player].dream[event.slot];
      state.players[first.player].dream[first.slot] = b;
      state.players[event.player].dream[event.slot] = a;
      state.lastAction = {
        type: "swap2Done",
        player: state.currentPlayer,
        a: first,
        b: { player: event.player, slot: event.slot },
      };
      endTurn(state);
      return state;
    }

    case "callPobudka": {
      requirePhase(state, "awaitTurn");
      state.callerIndex = state.currentPlayer;
      state.roundEnder = state.currentPlayer;
      state.lastAction = { type: "pobudka", player: state.currentPlayer };
      endRound(state, false);
      return state;
    }

    case "nextRound": {
      requirePhase(state, "roundEnd");
      const starter =
        ((state.roundEnder ?? state.currentPlayer) + 1) % state.players.length;
      state.round += 1;
      state.phase = "peeking";
      state.currentPlayer = starter;
      state.callerIndex = null;
      state.roundEnder = null;
      state.roundResults = null;
      state.lastAction = null;
      state.held = null;
      state.heldSource = null;
      state.take2Cards = null;
      state.swap2First = null;
      const { seed, drawPile, discardPile, dreams } = dealRound(state);
      state.seed = seed;
      state.drawPile = drawPile;
      state.discardPile = discardPile;
      state.players.forEach((p, i) => {
        p.dream = dreams[i];
        p.peekedSlots = [];
      });
      return state;
    }
  }
  return fail("unknown_event", `Unknown event ${(event as { type: string }).type}`);
};

/** Convenience for UIs/bots: which event types the actor may emit right now. */
export const legalEventTypes = (
  state: EngineState,
  actor: number,
): GameEvent["type"][] => {
  const isCurrent = actor === state.currentPlayer;
  switch (state.phase) {
    case "peeking":
      return state.players[actor].peekedSlots.length < INITIAL_PEEKS ? ["peek"] : [];
    case "awaitTurn":
      if (!isCurrent) return [];
      return [
        ...(state.drawPile.length > 0 ? (["drawDeck"] as const) : []),
        ...(state.discardPile.length > 0 ? (["drawDiscard"] as const) : []),
        "callPobudka",
      ];
    case "holdingDeck":
      if (!isCurrent) return [];
      return [
        "swapHeld",
        "discardHeld",
        ...(state.held?.kind === "special" ? (["activateSpecial"] as const) : []),
      ];
    case "holdingDiscard":
    case "choose1Swap":
      return isCurrent ? ["swapHeld"] : [];
    case "choose1Pick":
      return isCurrent ? ["choose1Pick"] : [];
    case "take2Pick":
      return isCurrent ? ["take2Pick"] : [];
    case "peek1Target":
      return isCurrent ? ["peek1Target"] : [];
    case "swap2First":
    case "swap2Second":
      return isCurrent ? ["swap2Select"] : [];
    case "roundEnd":
      return ["nextRound"];
    case "gameOver":
      return [];
  }
};

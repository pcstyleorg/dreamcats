/**
 * Heuristic bot for local play. Fair: it only "knows" cards whose slot
 * `knownTo` includes its own index — the same memory rules a human has.
 */

import {
  Card,
  EngineState,
  GameEvent,
  dreamScore,
} from "../../convex/engine";

/** Estimated cats a card contributes (hourglass parity is unknowable alone). */
const cardEval = (card: Card): number =>
  card.kind === "hourglass" ? 7 : card.value;

const UNKNOWN_ESTIMATE = 5;

const slotEval = (state: EngineState, player: number, slot: number): number => {
  const s = state.players[player].dream[slot];
  return s.knownTo.includes(player) ? cardEval(s.card) : UNKNOWN_ESTIMATE;
};

/** The slot the bot most wants to get rid of. */
const worstSlot = (state: EngineState, player: number): number => {
  const dream = state.players[player].dream;
  let best = 0;
  for (let i = 1; i < dream.length; i++) {
    if (slotEval(state, player, i) > slotEval(state, player, best)) best = i;
  }
  return best;
};

const lowestDiscardIndex = (state: EngineState): number => {
  let best = 0;
  state.discardPile.forEach((c, i) => {
    if (cardEval(c) < cardEval(state.discardPile[best])) best = i;
  });
  return best;
};

const shouldActivate = (state: EngineState, me: number, held: Card): boolean => {
  switch (held.special) {
    case "peek_1":
      return state.players[me].dream.some((s) => !s.knownTo.includes(me));
    case "take_2":
      return state.drawPile.length > 0;
    case "choose_1": {
      const bestDiscard = cardEval(state.discardPile[lowestDiscardIndex(state)]);
      return bestDiscard + 1 < slotEval(state, me, worstSlot(state, me));
    }
    case "swap_2":
      // Only worth it to dump a known-terrible card on someone else.
      return slotEval(state, me, worstSlot(state, me)) >= 8;
    default:
      return false;
  }
};

/** Decides the bot's next event, or null when it has nothing to do. */
export const chooseBotEvent = (
  state: EngineState,
  me: number,
): GameEvent | null => {
  switch (state.phase) {
    case "awaitTurn": {
      const dream = state.players[me].dream;
      const allKnown = dream.every((s) => s.knownTo.includes(me));
      if (allKnown && dreamScore(dream) <= 6) return { type: "callPobudka" };
      const top = state.discardPile[state.discardPile.length - 1];
      if (top && cardEval(top) <= 2) {
        const w = worstSlot(state, me);
        if (slotEval(state, me, w) > cardEval(top) + 1) {
          return { type: "drawDiscard" };
        }
      }
      return { type: "drawDeck" };
    }

    case "holdingDiscard":
      return { type: "swapHeld", slot: worstSlot(state, me) };

    case "holdingDeck": {
      const held = state.held;
      if (!held) return null;
      if (held.kind === "special" && shouldActivate(state, me, held)) {
        return { type: "activateSpecial" };
      }
      const w = worstSlot(state, me);
      if (cardEval(held) < slotEval(state, me, w)) {
        return { type: "swapHeld", slot: w };
      }
      return { type: "discardHeld" };
    }

    case "choose1Pick":
      return { type: "choose1Pick", discardIndex: lowestDiscardIndex(state) };

    case "choose1Swap":
      return { type: "swapHeld", slot: worstSlot(state, me) };

    case "take2Pick": {
      const cards = state.take2Cards;
      if (!cards) return null;
      return {
        type: "take2Pick",
        index: cardEval(cards[0]) <= cardEval(cards[1]) ? 0 : 1,
      };
    }

    case "peek1Target": {
      const unknown = state.players[me].dream.findIndex(
        (s) => !s.knownTo.includes(me),
      );
      if (unknown >= 0) return { type: "peek1Target", player: me, slot: unknown };
      const opp = (me + 1) % state.players.length;
      return {
        type: "peek1Target",
        player: opp,
        slot: Math.floor(Math.random() * state.players[opp].dream.length),
      };
    }

    case "swap2First":
      return { type: "swap2Select", player: me, slot: worstSlot(state, me) };

    case "swap2Second": {
      const first = state.swap2First;
      const opponents = state.players
        .map((_, i) => i)
        .filter((i) => i !== me && i !== first?.player);
      const target =
        opponents[Math.floor(Math.random() * opponents.length)] ??
        (me + 1) % state.players.length;
      return {
        type: "swap2Select",
        player: target,
        slot: Math.floor(Math.random() * state.players[target].dream.length),
      };
    }

    default:
      return null;
  }
};

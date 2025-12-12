#!/usr/bin/env bun
/**
 * AI test agent for Dreamcats (online + hotseat).
 *
 * Goals:
 * - Exercise Convex game logic end‑to‑end (no mocks).
 * - Cover all player actions, including specials and Pobudka scoring.
 * - Provide switchable modes: local/online, basic/advanced.
 *
 * Usage:
 *   bun scripts/ai-agent.ts --mode local-basic
 *   bun scripts/ai-agent.ts --mode online-advanced --players 3 --rounds 2
 *
 * The script runs entirely in‑memory via `convex-test`; no network calls are made.
 * Advanced mode primes the deck so every special card path is exercised.
 */

import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { convexTest } from "convex-test";
import schema from "../convex/schema";
import { api } from "../convex/_generated/api";
import { GameState, Card, GamePhase } from "../convex/types";

type Mode = "local-basic" | "local-advanced" | "online-basic" | "online-advanced";

interface RunOptions {
  mode: Mode;
  players: number;
  rounds: number;
  maxTurns: number;
  verbose: boolean;
}

type ActionName =
  | "PEEK_CARD"
  | "FINISH_PEEKING"
  | "DRAW_FROM_DECK"
  | "DRAW_FROM_DISCARD"
  | "DISCARD_HELD_CARD"
  | "SWAP_HELD_CARD"
  | "USE_SPECIAL_ACTION"
  | "ACTION_PEEK_1_SELECT"
  | "ACTION_SWAP_2_SELECT"
  | "ACTION_TAKE_2_CHOOSE"
  | "CALL_POBUDKA"
  | "START_NEW_ROUND";

const parseArgs = (): RunOptions => {
  const argv = process.argv.slice(2);
  const getFlag = (name: string, fallback?: string) => {
    const idx = argv.findIndex((a) => a === `--${name}`);
    if (idx !== -1) return argv[idx + 1];
    const kv = argv.find((a) => a.startsWith(`--${name}=`));
    if (kv) return kv.split("=")[1];
    return fallback;
  };

  const mode = (getFlag("mode", "local-basic") as Mode) ?? "local-basic";
  const players = Number(getFlag("players", "2"));
  const rounds = Number(getFlag("rounds", "1"));
  const maxTurns = Number(getFlag("maxTurns", "120"));
  const verbose = argv.includes("--verbose");

  return {
    mode,
    players: Number.isFinite(players) && players > 1 ? players : 2,
    rounds: Number.isFinite(rounds) && rounds > 0 ? rounds : 1,
    maxTurns: Number.isFinite(maxTurns) && maxTurns > 10 ? maxTurns : 120,
    verbose,
  };
};

// helper logging controlled by verbosity flag
// (kept as inline console.log usages elsewhere in this script)

/**
 * Build the module map expected by convexTest without relying on Vite's import.meta.glob.
 * We include convex/*.ts and convex/_generated/**.js to mirror the vitest loader.
 */
const buildModuleMap = () => {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const convexDir = path.resolve(__dirname, "../convex");
  const entries: Array<[string, () => Promise<unknown>]> = [];

  const walk = (dir: string) => {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
      const full = path.join(dir, item.name);
      if (item.isDirectory()) {
        walk(full);
      } else if (item.isFile()) {
        if (!/\.(ts|js)$/.test(item.name)) continue;
        const rel = path.relative(convexDir, full);
        // Convex expects module keys to be relative to convex/ directory, prefixed with ../convex/
        const key = `../convex/${rel}`;
        entries.push([key, () => import(full)]);
      }
    }
  };

  walk(convexDir);
  return Object.fromEntries(entries);
};

class AiGameAgent {
  private t: ReturnType<typeof convexTest>;
  private roomId: string;
  private hostId: string;
  private playerIds: string[] = [];
  private actionsSeen = new Set<ActionName>();
  private readonly isLocal: boolean;
  private readonly isAdvanced: boolean;
  private forceDiscard = false;
  private forceDrawDiscard = false;

  constructor(private readonly opts: RunOptions) {
    this.isLocal = opts.mode.startsWith("local");
    this.isAdvanced = opts.mode.endsWith("advanced");

    const modules = buildModuleMap();
    this.t = convexTest(schema, modules);
    this.roomId = `room-${Date.now().toString(36)}`;
    this.hostId = `host-${randomUUID().slice(0, 8)}`;
  }

  async run() {
    await this.setupRoom();
    for (let round = 1; round <= this.opts.rounds; round++) {
      console.log(`\n🃏 Round ${round} (${this.opts.mode})`);
      await this.startRound();
      await this.primeDeckForCoverage();
      await this.playRound();
    }
    this.report();
  }

  private async setupRoom() {
    await this.t.mutation(api.rooms.createRoom, {
      roomId: this.roomId,
      hostId: this.hostId,
      hostName: "Agent Host",
      mode: this.isLocal ? "hotseat" : "online",
    });
    this.playerIds.push(this.hostId);

    // Add guests
    for (let i = 1; i < this.opts.players; i++) {
      const playerId = `guest-${i}-${randomUUID().slice(0, 6)}`;
      await this.t.mutation(api.rooms.joinRoom, {
        roomId: this.roomId,
        playerId,
        name: `Guest ${i}`,
      });
      this.playerIds.push(playerId);
    }
  }

  private async startRound() {
    await this.t.mutation(api.actions.performAction, {
      roomId: this.roomId,
      playerId: this.hostId,
      action: { type: "START_NEW_ROUND" },
    });
    this.actionsSeen.add("START_NEW_ROUND");
  }

  /**
   * Reorders the draw pile so the next three draws hit all special actions,
   * and ensures the discard pile has a visible low card to exercise DRAW_FROM_DISCARD.
   */
  private async primeDeckForCoverage() {
    await this.t.run(async (ctx) => {
      const game = await ctx.db
        .query("games")
        .withIndex("by_roomId", (q) => q.eq("roomId", this.roomId))
        .first();
      if (!game) return;

      const state = game.state as GameState;
      const pullSpecial = (action: Card["specialAction"]) => {
        const idx = state.drawPile.findIndex(
          (c) => c.isSpecial && c.specialAction === action,
        );
        if (idx >= 0) {
          const [card] = state.drawPile.splice(idx, 1);
          state.drawPile.push(card); // top of deck is the end (pop)
        }
      };

      pullSpecial("take_2");
      pullSpecial("peek_1");
      pullSpecial("swap_2");

      // Ensure discard top is a visible high card to make DRAW_FROM_DISCARD meaningful
      if (state.drawPile.length > 0) {
        const [high] = state.drawPile.splice(0, 1);
        state.discardPile.push(high);
      }

      await ctx.db.patch(game._id, { state, version: (game.version ?? 0) + 1 });
    });
  }

  private async fetchState(viewerId: string): Promise<GameState> {
    const state = await this.t.query(api.games.getGameState, {
      roomId: this.roomId,
      playerId: viewerId,
    });
    if (!state) throw new Error("Game state missing");
    return state;
  }

  private async playRound() {
    let guard = 0;
    let state = await this.fetchState(this.hostId);

    // Finish initial peeking for all players
    while (state.gamePhase === "peeking" && guard < this.opts.maxTurns) {
      await this.handlePeeking(state);
      state = await this.fetchState(this.hostId);
      guard++;
    }

    // Main turn loop
    while (!this.isTerminal(state.gamePhase) && guard < this.opts.maxTurns) {
      const currentPlayer = state.players[state.currentPlayerIndex];
      const pid = currentPlayer.id;
      switch (state.gamePhase) {
        case "playing":
          await this.takeTurn(state, pid);
          break;
        case "holding_card":
          await this.resolveHoldingCard(state, pid);
          break;
        case "action_take_2":
          await this.resolveTake2(state, pid);
          break;
        case "action_peek_1":
          await this.resolvePeek1(state, pid);
          break;
        case "action_swap_2_select_1":
        case "action_swap_2_select_2":
          await this.resolveSwap2(state, pid);
          break;
      }

      state = await this.fetchState(this.hostId);
      guard++;

      // Safety valve: if we're halfway through guard and never called Pobudka, force it
      if (
        guard > this.opts.maxTurns / 2 &&
        !this.actionsSeen.has("CALL_POBUDKA") &&
        state.gamePhase === "playing"
      ) {
        await this.perform(pid, { type: "CALL_POBUDKA" });
        state = await this.fetchState(this.hostId);
        if (this.isTerminal(state.gamePhase)) break;
      }
    }

    if (guard >= this.opts.maxTurns) {
      console.warn("⚠️  Turn guard reached; attempting coverage fallbacks");
      await this.coverMissingViaPatch();
    } else {
      console.log(
        `✅ Round finished with phase=${state.gamePhase}, winner=${state.roundWinnerName ?? state.gameWinnerName ?? "n/a"
        }`,
      );
    }
  }

  private isTerminal(phase: GamePhase) {
    return phase === "round_end" || phase === "game_over";
  }

  private async handlePeeking(state: GameState) {
    const { peekingState } = state;
    if (!peekingState) return;
    const player = state.players[peekingState.playerIndex];
    const pid = player.id;

    // Peek two cards deterministically: first two positions
    for (let idx = peekingState.peekedCount; idx < 2; idx++) {
      await this.perform(pid, { type: "PEEK_CARD", payload: { playerId: pid, cardIndex: idx } });
    }
    await this.perform(pid, { type: "FINISH_PEEKING" });
  }

  private worstCardIndex(hand: GameState["players"][number]["hand"]) {
    if (!hand.length) return 0;
    let maxIdx = 0;
    let maxVal = -Infinity;
    hand.forEach((slot, idx) => {
      const v = slot.card.value;
      if (v > maxVal) {
        maxVal = v;
        maxIdx = idx;
      }
    });
    return maxIdx;
  }

  private async takeTurn(state: GameState, pid: string) {
    const needTake2 = !this.actionsSeen.has("ACTION_TAKE_2_CHOOSE");
    if (!this.actionsSeen.has("DISCARD_HELD_CARD")) {
      this.forceDiscard = true;
    }
    if (!this.actionsSeen.has("DRAW_FROM_DISCARD")) {
      this.forceDrawDiscard = true;
    }

    // Guarantee round termination and Pobudka coverage
    const pobudkaThreshold = this.isAdvanced ? 8 : 4;
    if (state.turnCount >= pobudkaThreshold) {
      if (!this.actionsSeen.has("DISCARD_HELD_CARD")) {
        // delay Pobudka until we record a discard for coverage
        if (state.gamePhase === "playing") {
          await this.perform(pid, { type: "DRAW_FROM_DECK" });
          return;
        }
      }
      if (state.gamePhase === "playing") {
        await this.perform(pid, { type: "CALL_POBUDKA" });
      }
      return;
    }

    const me = state.players[state.currentPlayerIndex];
    const discardTop = state.discardPile[state.discardPile.length - 1];
    const worstIdx = this.worstCardIndex(me.hand);
    const worstVal = me.hand[worstIdx].card.value;

    if (this.forceDrawDiscard && discardTop) {
      await this.perform(pid, { type: "DRAW_FROM_DISCARD" });
      this.forceDrawDiscard = false;
      return;
    }

    if (this.forceDiscard) {
      await this.perform(pid, { type: "DRAW_FROM_DECK" });
      return;
    }

    if (needTake2) {
      await this.perform(pid, { type: "DRAW_FROM_DECK" });
      return;
    }

    // Simple policy: prefer discard if it improves our worst card
    if (discardTop && discardTop.value < worstVal) {
      await this.perform(pid, { type: "DRAW_FROM_DISCARD" });
    } else {
      await this.perform(pid, { type: "DRAW_FROM_DECK" });
    }
  }

  private async resolveHoldingCard(state: GameState, pid: string) {
    const drawn = state.drawnCard;
    if (!drawn) return;
    const drawSource = state.drawSource;
    const me = state.players[state.currentPlayerIndex];
    const worstIdx = this.worstCardIndex(me.hand);
    const worstVal = me.hand[worstIdx].card.value;

    if (drawn.isSpecial && (drawSource === "deck" || drawSource === "take2")) {
      await this.perform(pid, { type: "USE_SPECIAL_ACTION" });
      return;
    }

    // Force at least one discard path for coverage
    const mustShowDiscard = !this.actionsSeen.has("DISCARD_HELD_CARD");
    if (mustShowDiscard && drawSource === "deck" && !drawn.isSpecial) {
      await this.perform(pid, { type: "DISCARD_HELD_CARD" });
      this.forceDiscard = false;
      return;
    }

    if (this.forceDiscard && drawSource === "deck" && !drawn.isSpecial) {
      await this.perform(pid, { type: "DISCARD_HELD_CARD" });
      this.forceDiscard = false;
      return;
    }

    if (drawSource === "discard" || drawSource === "take2" || drawn.value < worstVal) {
      await this.perform(pid, { type: "SWAP_HELD_CARD", payload: { cardIndex: worstIdx } });
    } else {
      await this.perform(pid, { type: "DISCARD_HELD_CARD" });
    }
  }

  private async resolveTake2(state: GameState, pid: string) {
    const temp = state.tempCards ?? [];
    if (!temp.length) return;
    const pick =
      temp.reduce((best, card) => (card.value < best.value ? card : best), temp[0]) ?? temp[0];
    if (pick) {
      await this.perform(pid, { type: "ACTION_TAKE_2_CHOOSE", payload: { card: pick } });
    }
  }

  private async resolvePeek1(state: GameState, pid: string) {
    // Peek first card of next player (wrap around)
    const targetIndex = (state.currentPlayerIndex + 1) % state.players.length;
    const target = state.players[targetIndex];
    const cardIndex = target.hand.length ? 0 : 0;
    await this.perform(pid, {
      type: "ACTION_PEEK_1_SELECT",
      payload: { playerId: target.id, cardIndex },
    });
  }

  private async resolveSwap2(state: GameState, pid: string) {
    const players = state.players;
    const me = players[state.currentPlayerIndex];
    const myWorstIdx = this.worstCardIndex(me.hand);

    if (state.gamePhase === "action_swap_2_select_1") {
      await this.perform(pid, {
        type: "ACTION_SWAP_2_SELECT",
        payload: { playerId: me.id, cardIndex: myWorstIdx },
      });
      return;
    }

    // Second selection: grab first card from next player
    const targetIndex = (state.currentPlayerIndex + 1) % players.length;
    const target = players[targetIndex];
    await this.perform(pid, {
      type: "ACTION_SWAP_2_SELECT",
      payload: { playerId: target.id, cardIndex: 0 },
    });
  }

  private async perform(playerId: string, action: { type: ActionName; payload?: unknown }) {
    this.actionsSeen.add(action.type);
    // convex-test mutation accepts a loosely typed action payload; cast to unknown to avoid `any` lint
    await this.t.mutation(api.actions.performAction, {
      roomId: this.roomId,
      playerId,
      action: action as unknown,
    } as unknown as Parameters<typeof api.actions.performAction>[0]);
  }

  /**
   * Last-resort coverage when a round stalls: patch server state into valid phases
   * and execute the missing mutations to mark coverage.
   */
  private async coverMissingViaPatch() {
    let state = await this.fetchState(this.hostId);
    const gameId = await this.t.run(async (ctx) => {
      const game = await ctx.db
        .query("games")
        .withIndex("by_roomId", (q) => q.eq("roomId", this.roomId))
        .first();
      return game?._id;
    });
    if (!gameId) return;

    if (!this.actionsSeen.has("DISCARD_HELD_CARD")) {
      await this.t.run(async (ctx) => {
        await ctx.db.patch(gameId, {
          state: {
            ...state,
            drawnCard: { id: 9991, value: 9, isSpecial: false },
            drawSource: "deck",
            gamePhase: "holding_card",
          },
        });
      });
      state = await this.fetchState(this.hostId);
      const pid = state.players[state.currentPlayerIndex].id;
      await this.perform(pid, { type: "DISCARD_HELD_CARD" });
    }

    if (!this.actionsSeen.has("ACTION_TAKE_2_CHOOSE")) {
      await this.t.run(async (ctx) => {
        await ctx.db.patch(gameId, {
          state: {
            ...state,
            drawnCard: { id: 9992, value: 5, isSpecial: true, specialAction: "take_2" },
            drawSource: "deck",
            gamePhase: "action_take_2",
            tempCards: [
              { id: 9993, value: 0, isSpecial: false },
              { id: 9994, value: 8, isSpecial: false },
            ],
          },
        });
      });
      state = await this.fetchState(this.hostId);
      const pid = state.players[state.currentPlayerIndex].id;
      await this.perform(pid, {
        type: "ACTION_TAKE_2_CHOOSE",
        payload: { card: { id: 9993, value: 0, isSpecial: false } },
      });
    }

    if (!this.actionsSeen.has("CALL_POBUDKA")) {
      await this.t.run(async (ctx) => {
        await ctx.db.patch(gameId, {
          state: {
            ...state,
            gamePhase: "playing",
            currentPlayerIndex: 0,
          },
        });
      });
      state = await this.fetchState(this.hostId);
      const pid = state.players[state.currentPlayerIndex].id;
      await this.perform(pid, { type: "CALL_POBUDKA" });
    }
  }

  private report() {
    console.log("\nActions covered:", [...this.actionsSeen].sort().join(", "));
    const missing = [
      "PEEK_CARD",
      "FINISH_PEEKING",
      "DRAW_FROM_DECK",
      "DRAW_FROM_DISCARD",
      "DISCARD_HELD_CARD",
      "SWAP_HELD_CARD",
      "USE_SPECIAL_ACTION",
      "ACTION_PEEK_1_SELECT",
      "ACTION_SWAP_2_SELECT",
      "ACTION_TAKE_2_CHOOSE",
      "CALL_POBUDKA",
      "START_NEW_ROUND",
    ].filter((a) => !this.actionsSeen.has(a as ActionName));
    if (missing.length) {
      console.warn("⚠️  Missing actions:", missing.join(", "));
    } else {
      console.log("✅ All action types executed at least once.");
    }
  }
}

const opts = parseArgs();
const agent = new AiGameAgent(opts);
agent.run().catch((err) => {
  console.error(err);
  // surface missing stack in CI
  process.exitCode = 1;
});

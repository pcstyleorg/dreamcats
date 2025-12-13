/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "../_generated/api";
import schema from "../schema";
import { type Card, type GameState } from "../types";

const modules = import.meta.glob(["../*.ts", "../_generated/**/*.{ts,js}"]);

const setupRoom = async (roomId: string) => {
  const t = convexTest(schema, modules);
  const hostId = `${roomId}-host`;
  const guestId = `${roomId}-guest`;

  await t.mutation(api.rooms.createRoom, {
    roomId,
    hostId,
    hostName: "Host",
  });
  await t.mutation(api.rooms.joinRoom, {
    roomId,
    playerId: guestId,
    name: "Guest",
  });

  return { t, roomId, hostId, guestId };
};

describe("actions: core flow branches", () => {
  it("runs peeking around the table then enters playing", async () => {
    const { t, roomId, hostId, guestId } = await setupRoom("room-peeking-flow");

    await t.mutation(api.actions.performAction, {
      roomId,
      playerId: hostId,
      action: { type: "START_NEW_ROUND" },
    });

    // Can only peek own cards.
    await expect(
      t.mutation(api.actions.performAction, {
        roomId,
        playerId: hostId,
        action: {
          type: "PEEK_CARD",
          payload: { playerId: guestId, cardIndex: 0 },
        },
      }),
    ).rejects.toThrow("Can only peek your own cards");

    // Host peeks 2.
    await t.mutation(api.actions.performAction, {
      roomId,
      playerId: hostId,
      action: { type: "PEEK_CARD", payload: { playerId: hostId, cardIndex: 0 } },
    });
    await t.mutation(api.actions.performAction, {
      roomId,
      playerId: hostId,
      action: { type: "PEEK_CARD", payload: { playerId: hostId, cardIndex: 1 } },
    });

    // Guest can't finish yet (wrong player).
    await expect(
      t.mutation(api.actions.performAction, {
        roomId,
        playerId: guestId,
        action: { type: "FINISH_PEEKING" },
      }),
    ).rejects.toThrow("Not your turn to finish peeking");

    await t.mutation(api.actions.performAction, {
      roomId,
      playerId: hostId,
      action: { type: "FINISH_PEEKING" },
    });

    // Guest must peek 2 before finishing.
    await expect(
      t.mutation(api.actions.performAction, {
        roomId,
        playerId: guestId,
        action: { type: "FINISH_PEEKING" },
      }),
    ).rejects.toThrow("Must peek 2 cards first");

    await t.mutation(api.actions.performAction, {
      roomId,
      playerId: guestId,
      action: {
        type: "PEEK_CARD",
        payload: { playerId: guestId, cardIndex: 0 },
      },
    });
    await t.mutation(api.actions.performAction, {
      roomId,
      playerId: guestId,
      action: {
        type: "PEEK_CARD",
        payload: { playerId: guestId, cardIndex: 1 },
      },
    });
    await t.mutation(api.actions.performAction, {
      roomId,
      playerId: guestId,
      action: { type: "FINISH_PEEKING" },
    });

    const state = await t.query(api.games.getGameState, {
      roomId,
      playerId: hostId,
    });
    expect(state?.gamePhase).toBe("playing");
    expect(state?.peekingState).toBeUndefined();
    expect(state?.currentPlayerIndex).toBe(0);
    expect(state?.turnCount).toBe(0);
    for (const p of state?.players ?? []) {
      expect(p.hand.every((h) => h.isFaceUp === false)).toBe(true);
    }
  });

  it("ends the round if the deck is empty when drawing from deck", async () => {
    const { t, roomId, hostId } = await setupRoom("room-deck-empty");

    await t.mutation(api.actions.performAction, {
      roomId,
      playerId: hostId,
      action: { type: "START_NEW_ROUND" },
    });

    // Jump directly to a deterministic playing state with an empty deck.
    await t.run(async (ctx) => {
      const game = await ctx.db
        .query("games")
        .withIndex("by_roomId", (q) => q.eq("roomId", roomId))
        .first();
      if (!game) throw new Error("missing game");
      const prev = game.state as GameState;
      await ctx.db.patch(game._id, {
        state: {
          ...prev,
          gamePhase: "playing",
          peekingState: undefined,
          currentPlayerIndex: 0,
          startingPlayerIndex: 0,
          drawPile: [],
        },
      });
    });

    await t.mutation(api.actions.performAction, {
      roomId,
      playerId: hostId,
      action: { type: "DRAW_FROM_DECK" },
    });

    const state = await t.query(api.games.getGameState, { roomId, playerId: hostId });
    expect(state?.gamePhase).toBe("round_end");
    expect(state?.lastRoundScores).toBeDefined();
    for (const p of state?.players ?? []) {
      expect(p.hand.every((h) => h.isFaceUp === true)).toBe(true);
    }
  });

  it("prevents discarding a held card taken from the discard pile", async () => {
    const { t, roomId, hostId } = await setupRoom("room-discard-restriction");

    await t.mutation(api.actions.performAction, {
      roomId,
      playerId: hostId,
      action: { type: "START_NEW_ROUND" },
    });

    const makeCard = (id: number): Card => ({
      id,
      value: 1,
      isSpecial: false,
    });

    await t.run(async (ctx) => {
      const game = await ctx.db
        .query("games")
        .withIndex("by_roomId", (q) => q.eq("roomId", roomId))
        .first();
      if (!game) throw new Error("missing game");
      const prev = game.state as GameState;
      await ctx.db.patch(game._id, {
        state: {
          ...prev,
          gamePhase: "playing",
          peekingState: undefined,
          currentPlayerIndex: 0,
          startingPlayerIndex: 0,
          drawPile: [makeCard(500)],
          discardPile: [makeCard(600)],
        },
      });
    });

    await t.mutation(api.actions.performAction, {
      roomId,
      playerId: hostId,
      action: { type: "DRAW_FROM_DISCARD" },
    });

    await expect(
      t.mutation(api.actions.performAction, {
        roomId,
        playerId: hostId,
        action: { type: "DISCARD_HELD_CARD" },
      }),
    ).rejects.toThrow("Cannot discard card taken from discard pile");
  });

  it("handles swap_2 selection flow (including self-swap)", async () => {
    const { t, roomId, hostId } = await setupRoom("room-swap2-flow");

    await t.mutation(api.actions.performAction, {
      roomId,
      playerId: hostId,
      action: { type: "START_NEW_ROUND" },
    });

    await t.run(async (ctx) => {
      const game = await ctx.db
        .query("games")
        .withIndex("by_roomId", (q) => q.eq("roomId", roomId))
        .first();
      if (!game) throw new Error("missing game");
      const prev = game.state as GameState;
      await ctx.db.patch(game._id, {
        state: {
          ...prev,
          gamePhase: "action_swap_2_select_1",
          peekingState: undefined,
          currentPlayerIndex: 0,
          startingPlayerIndex: 0,
          drawnCard: {
            id: 7000,
            value: 7,
            isSpecial: true,
            specialAction: "swap_2",
          },
          drawSource: null,
        },
      });
    });

    // First selection (same player).
    await t.mutation(api.actions.performAction, {
      roomId,
      playerId: hostId,
      action: {
        type: "ACTION_SWAP_2_SELECT",
        payload: { playerId: hostId, cardIndex: 0 },
      },
    });

    // Second selection triggers self-swap branch.
    await t.mutation(api.actions.performAction, {
      roomId,
      playerId: hostId,
      action: {
        type: "ACTION_SWAP_2_SELECT",
        payload: { playerId: hostId, cardIndex: 1 },
      },
    });

    const state = await t.query(api.games.getGameState, {
      roomId,
      playerId: hostId,
    });
    expect(state?.gamePhase).toBe("playing");
    expect(state?.lastMove?.action).toBe("swap_2");
  });

  it("validates take_2 choice IDs", async () => {
    const { t, roomId, hostId } = await setupRoom("room-take2-invalid-choice");

    await t.mutation(api.actions.performAction, {
      roomId,
      playerId: hostId,
      action: { type: "START_NEW_ROUND" },
    });

    await t.run(async (ctx) => {
      const game = await ctx.db
        .query("games")
        .withIndex("by_roomId", (q) => q.eq("roomId", roomId))
        .first();
      if (!game) throw new Error("missing game");
      const prev = game.state as GameState;
      await ctx.db.patch(game._id, {
        state: {
          ...prev,
          gamePhase: "action_take_2",
          peekingState: undefined,
          currentPlayerIndex: 0,
          startingPlayerIndex: 0,
          tempCards: [
            { id: 8001, value: 1, isSpecial: false },
            { id: 8002, value: 2, isSpecial: false },
          ],
        },
      });
    });

    await expect(
      t.mutation(api.actions.performAction, {
        roomId,
        playerId: hostId,
        action: {
          type: "ACTION_TAKE_2_CHOOSE",
          payload: { card: { id: 9999, value: 0, isSpecial: false } },
        },
      }),
    ).rejects.toThrow("Invalid card choice");
  });
});

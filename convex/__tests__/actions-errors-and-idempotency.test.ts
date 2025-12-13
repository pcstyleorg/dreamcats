/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "../_generated/api";
import schema from "../schema";
import { type GameState } from "../types";

const modules = import.meta.glob(["../*.ts", "../_generated/**/*.{ts,js}"]);

const setupTwoPlayerRoom = async (roomId: string) => {
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

  return { t, hostId, guestId };
};

describe("actions: validation, errors, idempotency", () => {
  it("rejects invalid action payloads", async () => {
    const t = convexTest(schema, modules);
    const roomId = "room-invalid-action";
    const hostId = "host-invalid-action";

    await t.mutation(api.rooms.createRoom, {
      roomId,
      hostId,
      hostName: "Host",
    });

    await expect(
      t.mutation(api.actions.performAction, {
        roomId,
        playerId: hostId,
        action: null,
      }),
    ).rejects.toThrow("Invalid action");
  });

  it("throws on unknown action types", async () => {
    const roomId = "room-unknown-action";
    const { t, hostId } = await setupTwoPlayerRoom(roomId);

    await expect(
      t.mutation(api.actions.performAction, {
        roomId,
        playerId: hostId,
        action: { type: "NOT_A_REAL_ACTION" },
      }),
    ).rejects.toThrow("Unknown action type");
  });

  it("requires at least 2 players to start a lobby round", async () => {
    const t = convexTest(schema, modules);
    const roomId = "room-min-players";
    const hostId = "host-min-players";

    await t.mutation(api.rooms.createRoom, {
      roomId,
      hostId,
      hostName: "Host",
    });

    await expect(
      t.mutation(api.actions.performAction, {
        roomId,
        playerId: hostId,
        action: { type: "START_NEW_ROUND" },
      }),
    ).rejects.toThrow("Need at least 2 players to start");
  });

  it("fails to start a round when too many players require more than 54 cards", async () => {
    const t = convexTest(schema, modules);
    const roomId = "room-too-many-players";
    const hostId = "host-too-many-players";

    await t.mutation(api.rooms.createRoom, {
      roomId,
      hostId,
      hostName: "Host",
    });

    // 14 total players => requiredCards = 14*4 + 1 = 57 > 54
    for (let i = 1; i <= 13; i++) {
      await t.mutation(api.rooms.joinRoom, {
        roomId,
        playerId: `p-${i}`,
        name: `P${i}`,
      });
    }

    await expect(
      t.mutation(api.actions.performAction, {
        roomId,
        playerId: hostId,
        action: { type: "START_NEW_ROUND" },
      }),
    ).rejects.toThrow("Not enough cards to deal");
  });

  it("returns prior result for the same idempotencyKey without re-applying", async () => {
    const roomId = "room-idempotency";
    const { t, hostId, guestId } = await setupTwoPlayerRoom(roomId);

    await t.mutation(api.actions.performAction, {
      roomId,
      playerId: hostId,
      action: { type: "START_NEW_ROUND" },
    });

    // Force an action_peek_1 state with a known drawnCard.
    await t.run(async (ctx) => {
      const game = await ctx.db
        .query("games")
        .withIndex("by_roomId", (q) => q.eq("roomId", roomId))
        .first();
      if (!game) throw new Error("missing game");

      const state = game.state as GameState;
      const hostIndex = state.players.findIndex((p) => p.id === hostId);
      await ctx.db.patch(game._id, {
        state: {
          ...state,
          currentPlayerIndex: hostIndex === -1 ? 0 : hostIndex,
          gamePhase: "action_peek_1",
          drawnCard: { id: 999, value: 0, isSpecial: true, specialAction: "peek_1" },
          drawSource: null,
        },
      });
    });

    const idempotencyKey = "idem-peek-1";
    const first = await t.mutation(api.actions.performAction, {
      roomId,
      playerId: hostId,
      idempotencyKey,
      action: {
        type: "ACTION_PEEK_1_SELECT",
        payload: { playerId: guestId, cardIndex: 0 },
      },
    });

    const second = await t.mutation(api.actions.performAction, {
      roomId,
      playerId: hostId,
      idempotencyKey,
      action: {
        type: "ACTION_PEEK_1_SELECT",
        payload: { playerId: guestId, cardIndex: 0 },
      },
    });

    expect(second).toEqual(first);

    const moves = await t.run((ctx) =>
      ctx.db
        .query("moves")
        .withIndex("by_idem", (q) => q.eq("idempotencyKey", idempotencyKey))
        .collect(),
    );
    expect(moves).toHaveLength(1);
  });

  it("throws when the same idempotencyKey is reused by a different room/player", async () => {
    const roomId = "room-idem-conflict-1";
    const { t, hostId, guestId } = await setupTwoPlayerRoom(roomId);

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

      const state = game.state as GameState;
      const hostIndex = state.players.findIndex((p) => p.id === hostId);
      await ctx.db.patch(game._id, {
        state: {
          ...state,
          currentPlayerIndex: hostIndex === -1 ? 0 : hostIndex,
          gamePhase: "action_peek_1",
          drawnCard: { id: 1000, value: 0, isSpecial: true, specialAction: "peek_1" },
          drawSource: null,
        },
      });
    });

    const idempotencyKey = "idem-conflict";
    await t.mutation(api.actions.performAction, {
      roomId,
      playerId: hostId,
      idempotencyKey,
      action: {
        type: "ACTION_PEEK_1_SELECT",
        payload: { playerId: guestId, cardIndex: 0 },
      },
    });

    await expect(
      t.mutation(api.actions.performAction, {
        roomId: "some-other-room",
        playerId: "some-other-player",
        idempotencyKey,
        action: { type: "DRAW_FROM_DECK" },
      }),
    ).rejects.toThrow("Idempotency key conflict");
  });
});

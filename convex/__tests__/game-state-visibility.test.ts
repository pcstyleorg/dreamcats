/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "../_generated/api";
import schema from "../schema";
import { type GameState } from "../types";

const modules = import.meta.glob(["../*.ts", "../_generated/**/*.{ts,js}"]);

describe("games.getGameState visibility", () => {
  it("in lobby, returns live players list even without playerId", async () => {
    const t = convexTest(schema, modules);
    const roomId = "room-visibility-lobby";
    const hostId = "host-visibility-lobby";
    const guestId = "guest-visibility-lobby";

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

    const state = await t.query(api.games.getGameState, { roomId });
    expect(state?.gamePhase).toBe("lobby");
    expect(state?.players).toHaveLength(2);
    expect(state?.players[0].id).toBe(hostId);
    expect(state?.players[1].id).toBe(guestId);
  });

  it("returns state without auth in hotseat mode", async () => {
    const t = convexTest(schema, modules);
    const roomId = "room-visibility-hotseat";
    const hostId = "host-visibility-hotseat";

    await t.mutation(api.rooms.createRoom, {
      roomId,
      hostId,
      hostName: "Host",
      mode: "hotseat",
    });

    const state = await t.query(api.games.getGameState, { roomId });
    expect(state?.gameMode).toBe("hotseat");
  });

  it("returns null without playerId outside the lobby", async () => {
    const t = convexTest(schema, modules);
    const roomId = "room-visibility-auth";
    const hostId = "host-visibility-auth";
    const guestId = "guest-visibility-auth";

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
    await t.mutation(api.actions.performAction, {
      roomId,
      playerId: hostId,
      action: { type: "START_NEW_ROUND" },
    });

    const unauthenticated = await t.query(api.games.getGameState, { roomId });
    expect(unauthenticated).toBeNull();
  });

  it("redacts opponent hands and the draw pile for online mode during peeking", async () => {
    const t = convexTest(schema, modules);
    const roomId = "room-visibility-redaction";
    const hostId = "host-visibility-redaction";
    const guestId = "guest-visibility-redaction";

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
    await t.mutation(api.actions.performAction, {
      roomId,
      playerId: hostId,
      action: { type: "START_NEW_ROUND" },
    });

    const hostView = await t.query(api.games.getGameState, {
      roomId,
      playerId: hostId,
    });
    expect(hostView).toBeTruthy();
    expect(hostView!.gamePhase).toBe("peeking");

    const guestInHostView = hostView!.players.find((p) => p.id === guestId);
    expect(guestInHostView).toBeTruthy();
    expect(guestInHostView!.hand).toHaveLength(4);
    for (const slot of guestInHostView!.hand) {
      expect(slot.card).toMatchObject({ id: -1, value: -1, isSpecial: false });
    }

    expect(hostView!.drawPile.length).toBeGreaterThan(0);
    expect(hostView!.drawPile[0]).toMatchObject({
      id: -1,
      value: -1,
      isSpecial: false,
    });
  });

  it("hides tempCards from non-active players during action_take_2", async () => {
    const t = convexTest(schema, modules);
    const roomId = "room-visibility-tempCards";
    const hostId = "host-visibility-tempCards";
    const guestId = "guest-visibility-tempCards";

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
          gamePhase: "action_take_2",
          currentPlayerIndex: hostIndex === -1 ? 0 : hostIndex,
          tempCards: [
            { id: 2001, value: 1, isSpecial: false },
            { id: 2002, value: 2, isSpecial: false },
          ],
        },
      });
    });

    const activePlayerView = await t.query(api.games.getGameState, {
      roomId,
      playerId: hostId,
    });
    expect(activePlayerView?.gamePhase).toBe("action_take_2");
    expect(activePlayerView?.tempCards).toHaveLength(2);

    const otherPlayerView = await t.query(api.games.getGameState, {
      roomId,
      playerId: guestId,
    });
    expect(otherPlayerView?.gamePhase).toBe("action_take_2");
    expect(otherPlayerView?.tempCards).toBeUndefined();
  });
});

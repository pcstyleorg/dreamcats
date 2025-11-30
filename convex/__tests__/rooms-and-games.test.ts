/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { api } from "../_generated/api";
import schema from "../schema";

// Load all Convex modules so convex-test can execute mutations/queries
const modules = import.meta.glob(["../*.ts", "../_generated/**/*.{ts,js}"]);

describe("rooms lifecycle", () => {
  it("creates a room with host seeded as player 0", async () => {
    const t = convexTest(schema, modules);
    const roomId = "room-test-1";
    const hostId = "host-1";

    await t.mutation(api.rooms.createRoom, {
      roomId,
      hostId,
      hostName: "Alice",
    });

    const room = await t.query(api.rooms.getRoom, { roomId });
    expect(room?.roomId).toBe(roomId);
    expect(room?.hostId).toBe(hostId);
    expect(room?.status).toBe("lobby");

    const players = await t.query(api.rooms.getPlayers, { roomId });
    expect(players).toHaveLength(1);
    expect(players[0]).toMatchObject({
      playerId: hostId,
      seat: 0,
      connected: true,
      score: 0,
    });
  });

  it("assigns unique incremental seats when players join", async () => {
    const t = convexTest(schema, modules);
    const roomId = "room-test-2";

    await t.mutation(api.rooms.createRoom, {
      roomId,
      hostId: "host-2",
      hostName: "Host",
    });
    await t.mutation(api.rooms.joinRoom, {
      roomId,
      playerId: "p-1",
      name: "Bob",
    });
    await t.mutation(api.rooms.joinRoom, {
      roomId,
      playerId: "p-2",
      name: "Carol",
    });

    const seats = (await t.query(api.rooms.getPlayers, { roomId })).map(
      (p) => p.seat,
    );
    expect(new Set(seats).size).toBe(seats.length);
    expect(seats.sort((a, b) => a - b)).toEqual([0, 1, 2]);
  });
});

describe("starting a round", () => {
  it("deals 4 cards each, one discard, and leaves the correct draw pile size", async () => {
    const t = convexTest(schema, modules);
    const roomId = "room-round-1";
    const hostId = "host-round";
    const guestId = "guest-round";

    await t.mutation(api.rooms.createRoom, {
      roomId,
      hostId,
      hostName: "Alice",
    });
    await t.mutation(api.rooms.joinRoom, {
      roomId,
      playerId: guestId,
      name: "Bob",
    });

    await t.mutation(api.actions.performAction, {
      roomId,
      playerId: hostId,
      action: { type: "START_NEW_ROUND" },
    });

    const state = await t.query(api.games.getGameState, {
      roomId,
      playerId: hostId,
    });

    expect(state?.gamePhase).toBe("peeking");
    expect(state?.players).toHaveLength(2);
    expect(state?.players[0].hand).toHaveLength(4);
    expect(state?.players[1].hand).toHaveLength(4);
    expect(state?.discardPile).toHaveLength(1);
    expect(state?.drawPile).toHaveLength(45); // 54 total - (4*2) - 1 discard
    expect(state?.peekingState).toMatchObject({ playerIndex: 0, peekedCount: 0 });
  });
});

describe("pobudka scoring", () => {
  it("adds +5 penalty to caller when not lowest and ends game at 100", async () => {
    const t = convexTest(schema, modules);
    const roomId = "room-pobudka-1";
    const hostId = "host-p";
    const guestId = "guest-p";

    await t.mutation(api.rooms.createRoom, {
      roomId,
      hostId,
      hostName: "Alice",
    });
    await t.mutation(api.rooms.joinRoom, {
      roomId,
      playerId: guestId,
      name: "Bob",
    });

    // Start a round to ensure the games row exists with players populated
    await t.mutation(api.actions.performAction, {
      roomId,
      playerId: hostId,
      action: { type: "START_NEW_ROUND" },
    });

    // Overwrite state to a deterministic scenario
    await t.run(async (ctx) => {
      const game = await ctx.db
        .query("games")
        .withIndex("by_roomId", (q) => q.eq("roomId", roomId))
        .first();

      const fixedState = {
        roomId,
        gameMode: "online",
        hostId,
        drawPile: [],
        discardPile: [],
        players: [
          {
            id: hostId,
            name: "Alice",
            score: 95,
            hand: [
              { card: { id: 1, value: 2, isSpecial: false }, isFaceUp: true, hasBeenPeeked: false },
              { card: { id: 2, value: 1, isSpecial: false }, isFaceUp: true, hasBeenPeeked: false },
              { card: { id: 3, value: 1, isSpecial: false }, isFaceUp: true, hasBeenPeeked: false },
              { card: { id: 4, value: 1, isSpecial: false }, isFaceUp: true, hasBeenPeeked: false },
            ],
          },
          {
            id: guestId,
            name: "Bob",
            score: 90,
            hand: [
              { card: { id: 5, value: 0, isSpecial: false }, isFaceUp: true, hasBeenPeeked: false },
              { card: { id: 6, value: 0, isSpecial: false }, isFaceUp: true, hasBeenPeeked: false },
              { card: { id: 7, value: 0, isSpecial: false }, isFaceUp: true, hasBeenPeeked: false },
              { card: { id: 8, value: 0, isSpecial: false }, isFaceUp: true, hasBeenPeeked: false },
            ],
          },
        ],
        currentPlayerIndex: 0,
        gamePhase: "playing",
        actionMessage: "",
        turnCount: 0,
        chatMessages: [],
        lastCallerId: null,
        peekingState: undefined,
        drawnCard: null,
        tempCards: undefined,
        swapState: undefined,
        roundWinnerName: null,
        gameWinnerName: null,
        lastRoundScores: undefined,
        lastMove: null,
      };

      await ctx.db.patch(game!._id, { state: fixedState, version: (game?.version ?? 0) + 1 });
    });

    await t.mutation(api.actions.performAction, {
      roomId,
      playerId: hostId,
      action: { type: "CALL_POBUDKA" },
    });

    const result = await t.query(api.games.getGameState, {
      roomId,
      playerId: hostId,
    });

    expect(result?.gamePhase).toBe("game_over");
    expect(result?.lastCallerId).toBe(hostId);
    expect(result?.gameWinnerName).toBe("Bob");
    expect(result?.players.find((p) => p.id === hostId)?.score).toBe(105); // 95 + 5 (hand) + 5 penalty
    expect(result?.players.find((p) => p.id === guestId)?.score).toBe(90); // No change for lowest
    const hostRound = result?.lastRoundScores?.find((r) => r.playerId === hostId);
    expect(hostRound?.penalty).toBe(5);
  });
});

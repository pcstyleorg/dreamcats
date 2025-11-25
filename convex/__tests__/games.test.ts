import { describe, it, expect } from "vitest";
import { convexTest, TestConvex } from "convex-test";
import schema from "../schema";
import { api } from "../_generated/api";

const modules = import.meta.glob(["../*.ts", "../_generated/**/*.{ts,js}"]);
const makeCtx = () => convexTest(schema, modules) as TestConvex<typeof schema>;

const buildRoomWithPlayers = async (t: TestConvex<typeof schema>, count = 2) => {
  const roomId = "ROOM1";
  await t.mutation(api.rooms.createRoom, {
    roomId,
    hostId: "host",
    hostName: "Host",
    mode: "online",
  });
  for (let i = 1; i < count; i++) {
    await t.mutation(api.rooms.joinRoom, {
      roomId,
      playerId: `p${i + 1}`,
      name: `P${i + 1}`,
    });
  }
  return roomId;
};

describe("games.startGame", () => {
  it("deals 4 cards each, sets drawPile size, and leaves discard empty", async () => {
    const t = makeCtx();
    const roomId = await buildRoomWithPlayers(t, 2);

    const start = await t.action(api.games.startGame, { roomId });
    expect(start.success).toBe(true);

    const state = await t.query(api.games.getGameState, { roomId });
    expect(state).toBeTruthy();
    expect(state.players.length).toBe(2);
    state.players.forEach((p: { hand: unknown[] }) => expect(p.hand.length).toBe(4));
    expect(state.discardPile?.length ?? 0).toBe(0);
    // Total deck is 54; after dealing 8 cards, drawPile should be 46
    expect(state.drawPile.length).toBe(46);
  });
});

describe("games.setGameState", () => {
  it("rejects stale updates and allows idempotent retry", async () => {
    const t = makeCtx();
    const roomId = await buildRoomWithPlayers(t, 2);
    const state = { roomId, gamePhase: "playing" };

    const first = await t.mutation(api.games.setGameState, {
      roomId,
      state,
      version: 10,
      idempotencyKey: "k1",
    });
    expect(first.success).toBe(true);

    const stale = await t.mutation(api.games.setGameState, {
      roomId,
      state,
      version: 5,
      idempotencyKey: "k2",
    });
    expect(stale.success).toBe(false);
    expect(stale.reason).toBe("stale");

    const retry = await t.mutation(api.games.setGameState, {
      roomId,
      state,
      version: 10,
      idempotencyKey: "k1",
    });
    expect(retry.skipped).toBe("idempotent");
  });
});

import { describe, it, expect } from "vitest";
import { convexTest, TestConvex } from "convex-test";
import schema from "../schema";
import { api } from "../_generated/api";

const modules = {
  "../rooms.ts": () => import("../rooms"),
  "../games.ts": () => import("../games"),
  "../actions.ts": () => import("../actions"),
  "../chat.ts": () => import("../chat"),
  "../presence.ts": () => import("../presence"),
  "../cleanup.ts": () => import("../cleanup"),
  "../_generated/api.js": () => import("../_generated/api.js"),
  "../_generated/server.js": () => import("../_generated/server.js"),
};
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

describe("game actions", () => {
  it("can fetch game state in lobby without crashing", async () => {
    const t = makeCtx();
    const roomId = await buildRoomWithPlayers(t, 2);

    // Just fetch state immediately after creation (lobby phase)
    const state = await t.query(api.games.getGameState, { roomId, playerId: "host" });
    expect(state).toBeTruthy();
    expect(state?.gamePhase).toBe("lobby");
    expect(state?.players.length).toBe(0); // In lobby, players might be in 'players' table but not yet in 'game.state.players' until game starts? 
    // Actually, createRoom initializes game.state.players = []
    // And joinRoom adds to 'players' table, but NOT to game state until start?
    // Let's check logic. 
    // Correct, 'players' in game state are usually populated at start or sync.
    // Wait, the old logic synced players to game state?
    // The new logic: 'createRoom' sets players: [].
    // 'joinRoom' adds to 'players' table.
    // 'START_NEW_ROUND' (or startGame logic) should populate game.state.players from 'players' table?
    // Let's check 'START_NEW_ROUND' implementation.
    // It uses `state.players`. 
    // If `state.players` is empty, START_NEW_ROUND needs to fetch them?
    // Ah, `performAction` uses `state.players`.
    // If we rely on `state.players` being populated, we need to populate it!
    // The old `ConvexSync` used to push local players to server state.
    // We removed that.
    // So now, we need a way to sync players from the room to the game state BEFORE starting, 
    // OR `START_NEW_ROUND` should fetch players from the `players` table and initialize the game state.
    
    // Let's verify what happens now.
  });

  it("starts a new round correctly", async () => {
    const t = makeCtx();
    const roomId = await buildRoomWithPlayers(t, 2);

    // Start game via action
    await t.mutation(api.actions.performAction, { 
        roomId, 
        playerId: "host",
        action: { type: "START_NEW_ROUND" }
    });

    const state = await t.query(api.games.getGameState, { roomId, playerId: "host" });
    expect(state).toBeTruthy();
    expect(state?.players.length).toBe(2);
    state?.players.forEach((p: { hand: unknown[] }) => expect(p.hand.length).toBe(4));
    expect(state?.discardPile?.length ?? 0).toBe(1); // 1 card in discard
    // Total 54 - 8 (hands) - 1 (discard) = 45
    expect(state?.drawPile.length).toBe(45); 
    expect(state?.gamePhase).toBe("peeking");
  });

  it("allows drawing from deck", async () => {
    const t = makeCtx();
    const roomId = await buildRoomWithPlayers(t, 2);

    // Start game
    await t.mutation(api.actions.performAction, { 
        roomId, 
        playerId: "host",
        action: { type: "START_NEW_ROUND" }
    });

    // Fast forward through peeking (hacky state patch or just actions)
    // Let's just patch state to 'playing' to test draw
    // const game = await t.query(api.games.getGameState, { roomId, playerId: "host" });
    // We can't easily patch state from outside without a backdoor or running actions.
    // Let's just rely on the fact that START_NEW_ROUND puts us in 'peeking'.
    // To test 'DRAW', we need to be in 'playing'.
    // We would need to send 'FINISH_PEEKING' for all players.
    
    // Fast forward through peeking by actually peeking
    // Host peeks 2 cards
    await t.mutation(api.actions.performAction, {
        roomId,
        playerId: "host",
        action: { type: "PEEK_CARD", payload: { playerId: "host", cardIndex: 0 } }
    });
    await t.mutation(api.actions.performAction, {
        roomId,
        playerId: "host",
        action: { type: "PEEK_CARD", payload: { playerId: "host", cardIndex: 1 } }
    });

    // P2 peeks 2 cards
    await t.mutation(api.actions.performAction, {
        roomId,
        playerId: "p2",
        action: { type: "PEEK_CARD", payload: { playerId: "p2", cardIndex: 0 } }
    });
    await t.mutation(api.actions.performAction, {
        roomId,
        playerId: "p2",
        action: { type: "PEEK_CARD", payload: { playerId: "p2", cardIndex: 1 } }
    });

    // Now should be playing
    const playingState = await t.query(api.games.getGameState, { roomId, playerId: "host" });
    expect(playingState?.gamePhase).toBe("playing");

    // Host draws
    await t.mutation(api.actions.performAction, {
        roomId,
        playerId: "host",
        action: { type: "DRAW_FROM_DECK" }
    });

    const afterDraw = await t.query(api.games.getGameState, { roomId, playerId: "host" });
    expect(afterDraw?.gamePhase).toBe("holding_card");
    expect(afterDraw?.drawnCard).toBeTruthy();
  });
});

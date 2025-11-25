import { describe, it, expect } from "vitest";
import { convexTest, TestConvex } from "convex-test";
import schema from "../schema";
import { api } from "../_generated/api";

const modules = import.meta.glob(["../*.ts", "../_generated/**/*.{ts,js}"]);
const makeCtx = () => convexTest(schema, modules) as TestConvex<typeof schema>;

describe("rooms.joinRoom", () => {
  it("assigns unique seats and tracks presence", async () => {
    const t = makeCtx();
    await t.mutation(api.rooms.createRoom, {
      roomId: "ROOM2",
      hostId: "host",
      hostName: "Host",
      mode: "online",
    });

    await t.mutation(api.rooms.joinRoom, { roomId: "ROOM2", playerId: "p2", name: "P2" });
    await t.mutation(api.rooms.joinRoom, { roomId: "ROOM2", playerId: "p3", name: "P3" });

    // simulate heartbeats to create presence rows
    await t.mutation(api.rooms.updatePlayerPresence, { roomId: "ROOM2", playerId: "p2" });
    await t.mutation(api.rooms.updatePlayerPresence, { roomId: "ROOM2", playerId: "p3" });

    const players = await t.query(api.rooms.getPlayers, { roomId: "ROOM2" });
    const seats = new Set(players.map((p: { seat: number }) => p.seat));
    expect(seats.size).toBe(players.length);

    const presence = await t.run(async (ctx) =>
      ctx.db.query("presence").withIndex("by_roomId", (q) => q.eq("roomId", "ROOM2")).collect(),
    );
    expect(presence.length).toBeGreaterThan(0);
  });
});

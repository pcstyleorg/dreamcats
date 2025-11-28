import { describe, it, expect } from "vitest";
import { convexTest, TestConvex } from "convex-test";
import schema from "../schema";
import { api } from "../_generated/api";

// Explicit module map for convex-test (import.meta.glob not available in ts-node)
const modules = {
  "../rooms.ts": () => import("../rooms"),
  "../games.ts": () => import("../games"),
  "../chat.ts": () => import("../chat"),
  "../presence.ts": () => import("../presence"),
  "../cleanup.ts": () => import("../cleanup"),
  "../_generated/api.js": () => import("../_generated/api.js"),
  "../_generated/server.js": () => import("../_generated/server.js"),
};
const makeCtx = () => convexTest(schema, modules) as TestConvex<typeof schema>;

describe("chat.getMessages pagination", () => {
  it("returns chronological order with cursor pagination", async () => {
    const t = makeCtx();
    await t.mutation(api.rooms.createRoom, {
      roomId: "ROOM3",
      hostId: "host",
      hostName: "Host",
      mode: "online",
    });

    for (let i = 0; i < 5; i++) {
      await t.mutation(api.chat.sendMessage, {
        roomId: "ROOM3",
        senderId: "host",
        senderName: "Host",
        message: `m${i}`,
      });
    }

    const firstPage = await t.query(api.chat.getMessages, { roomId: "ROOM3", limit: 3 });
    expect(firstPage.map((m: { message: string }) => m.message)).toEqual(["m2", "m3", "m4"]);

    const cursor = firstPage[firstPage.length - 1].timestamp;
    const nextPage = await t.query(api.chat.getMessages, { roomId: "ROOM3", cursor, limit: 3 });
    expect(nextPage.map((m: { message: string }) => m.message)).toEqual(["m0", "m1", "m2"]);
  });
});

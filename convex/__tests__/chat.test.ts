import { describe, it, expect } from "vitest";
import { convexTest, TestConvex } from "convex-test";
import schema from "../schema";
import { api } from "../_generated/api";

const modules = import.meta.glob(["../*.ts", "../_generated/**/*.{ts,js}"]);
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

    // Insert messages directly into the database with deterministic timestamps
    // to avoid timing issues in tests
    for (let i = 0; i < 5; i++) {
      await t.run(async (ctx) => {
        await ctx.db.insert("messages", {
          roomId: "ROOM3",
          senderId: "host",
          senderName: "Host",
          message: `m${i}`,
          timestamp: 1000 + i * 100, // Deterministic: 1000, 1100, 1200, 1300, 1400
        });
      });
    }

    // First page should get latest 3 messages in chronological order
    const firstPage = await t.query(api.chat.getMessages, { roomId: "ROOM3", limit: 3 });
    expect(firstPage.map((m: { message: string }) => m.message)).toEqual(["m2", "m3", "m4"]);

    // Use the first item's timestamp as cursor to get older messages
    const cursor = firstPage[0].timestamp; // timestamp of m2 = 1200
    const nextPage = await t.query(api.chat.getMessages, { roomId: "ROOM3", cursor, limit: 3 });
    // With lt() filter, we get messages with timestamp < 1200, so m0 (1000) and m1 (1100)
    expect(nextPage.map((m: { message: string }) => m.message)).toEqual(["m0", "m1"]);
  });
});

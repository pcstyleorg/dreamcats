import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const setGameState = mutation({
  args: {
    roomId: v.string(),
    state: v.any(), // GameState
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("games")
      .withIndex("by_roomId", (q) => q.eq("roomId", args.roomId))
      .first();

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        state: args.state,
        lastUpdated: now,
      });
    } else {
      await ctx.db.insert("games", {
        roomId: args.roomId,
        state: args.state,
        lastUpdated: now,
      });
    }
    return { success: true };
  },
});

export const getGameState = query({
  args: { roomId: v.string() },
  handler: async (ctx, args) => {
    const game = await ctx.db
      .query("games")
      .withIndex("by_roomId", (q) => q.eq("roomId", args.roomId))
      .first();
    return game?.state ?? null;
  },
});


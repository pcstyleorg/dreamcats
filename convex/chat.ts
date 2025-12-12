import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const sendMessage = mutation({
  args: {
    roomId: v.string(),
    senderId: v.string(),
    senderName: v.string(),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("messages", {
      roomId: args.roomId,
      senderId: args.senderId,
      senderName: args.senderName,
      message: args.message,
      timestamp: Date.now(),
    });
    return { success: true };
  },
});

export const getMessages = query({
  args: { roomId: v.string(), cursor: v.optional(v.number()), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 100;
    const cursor = args.cursor;

    const baseQuery = ctx.db
      .query("messages")
      .withIndex("by_room_time", (q) => q.eq("roomId", args.roomId))
      .order("desc");

    const page = cursor
      ? await baseQuery
          .filter((q) => q.lt(q.field("timestamp"), cursor))
          .take(limit)
      : await baseQuery.take(limit);

    // Return chronological order (oldest -> newest) for UI rendering
    return page.reverse();
  },
});

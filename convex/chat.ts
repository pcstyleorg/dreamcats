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
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_room_time", (q) => q.eq("roomId", args.roomId))
      .order("desc")
      .filter((q) => (args.cursor ? q.lt(q.field("timestamp"), args.cursor) : true))
      .take(limit);

    return messages.reverse(); // Return in chronological order
  },
});

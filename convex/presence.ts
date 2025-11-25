import { query } from "./_generated/server";
import { v } from "convex/values";

export const getPresenceByRoom = query({
  args: { roomId: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("presence")
      .withIndex("by_roomId", (q) => q.eq("roomId", args.roomId))
      .collect();
  },
});

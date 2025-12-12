import { query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";

export const getMyOverview = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const stats =
      (await ctx.db
        .query("userStats")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .unique()) ?? null;

    const limit = Math.min(Math.max(args.limit ?? 10, 1), 50);
    const participations = await ctx.db
      .query("matchPlayers")
      .withIndex("by_user_time", (q) => q.eq("userId", userId))
      .order("desc")
      .take(limit);

    const matches = await Promise.all(
      participations.map(async (p) => {
        const match = await ctx.db.get(p.matchId);
        return {
          matchId: p.matchId,
          roomId: p.roomId,
          endedAt: p.endedAt,
          mode: match?.mode ?? "online",
          winnerName: match?.winnerName ?? "",
          winningScore: match?.winningScore ?? 0,
          yourName: p.name,
          yourScore: p.finalScore,
          yourPlace: p.place,
          playerCount: match?.playerCount ?? 0,
        };
      }),
    );

    return {
      stats: stats
        ? {
            gamesPlayed: stats.gamesPlayed,
            gamesWon: stats.gamesWon,
            totalScore: stats.totalScore,
            bestScore: stats.bestScore ?? null,
            lastPlayedAt: stats.lastPlayedAt ?? null,
          }
        : {
            gamesPlayed: 0,
            gamesWon: 0,
            totalScore: 0,
            bestScore: null,
            lastPlayedAt: null,
          },
      matches,
    };
  },
});


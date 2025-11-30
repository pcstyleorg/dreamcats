import { internalMutation } from "./_generated/server";

// Clean up old/abandoned rooms and their associated data
// Rooms inactive for more than 1 hour will be deleted
const ROOM_TIMEOUT_MS = 60 * 60 * 1000; // 1 hour

// AFK timeout: if a player doesn't move for 30 seconds during peeking phase, auto-advance
const AFK_TIMEOUT_MS = 30 * 1000; // 30 seconds

export const cleanupOldRooms = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const cutoffTime = now - ROOM_TIMEOUT_MS;

    // Find all rooms that haven't been updated recently
    const allRooms = await ctx.db.query("rooms").collect();
    const oldRooms = allRooms.filter((room) => room.lastUpdated < cutoffTime);

    let deletedRooms = 0;
    let deletedPlayers = 0;
    let deletedGames = 0;
    let deletedMessages = 0;
    let deletedMoves = 0;
    let deletedPresence = 0;

    for (const room of oldRooms) {
      // Delete all players in this room
      const players = await ctx.db
        .query("players")
        .withIndex("by_roomId", (q) => q.eq("roomId", room.roomId))
        .collect();
      for (const player of players) {
        await ctx.db.delete(player._id);
        deletedPlayers++;
      }

      // Delete game state for this room
      const games = await ctx.db
        .query("games")
        .withIndex("by_roomId", (q) => q.eq("roomId", room.roomId))
        .collect();
      for (const game of games) {
        await ctx.db.delete(game._id);
        deletedGames++;
      }

      // Delete messages for this room
      const messages = await ctx.db
        .query("messages")
        .withIndex("by_roomId", (q) => q.eq("roomId", room.roomId))
        .collect();
      for (const message of messages) {
        await ctx.db.delete(message._id);
        deletedMessages++;
      }

      const moves = await ctx.db
        .query("moves")
        .withIndex("by_room_time", (q) => q.eq("roomId", room.roomId))
        .collect();
      for (const move of moves) {
        await ctx.db.delete(move._id);
        deletedMoves++;
      }

      const presence = await ctx.db
        .query("presence")
        .withIndex("by_roomId", (q) => q.eq("roomId", room.roomId))
        .collect();
      for (const pres of presence) {
        await ctx.db.delete(pres._id);
        deletedPresence++;
      }

      // Delete the room itself
      await ctx.db.delete(room._id);
      deletedRooms++;
    }

    return {
      deletedRooms,
      deletedPlayers,
      deletedGames,
      deletedMessages,
      deletedMoves,
      deletedPresence,
      timestamp: now,
    };
  },
});

// Auto-advance players who are AFK during peeking phase
export const autoAdvanceAFKPeeking = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const afkCutoff = now - AFK_TIMEOUT_MS;

    const allRooms = await ctx.db.query("rooms").collect();
    let advancedCount = 0;

    for (const room of allRooms) {
      if (room.status !== "playing") continue;

      const games = await ctx.db
        .query("games")
        .withIndex("by_roomId", (q) => q.eq("roomId", room.roomId))
        .collect();

      for (const game of games) {
        const state = game.state as {
          gamePhase: string;
          peekingState?: { playerIndex: number; peekedCount: number };
          players: { name: string }[];
          lastMove?: { timestamp: number } | null;
        };

        // Only auto-advance if we're in peeking phase
        if (state.gamePhase !== "peeking" || !state.peekingState) continue;

        // Check if last move is too old
        if (state.lastMove && state.lastMove.timestamp < afkCutoff) {
          // Auto-advance to next player
          const nextPlayerIndex =
            (state.peekingState.playerIndex + 1) % state.players.length;

          const newState = {
            ...state,
            peekingState: { playerIndex: nextPlayerIndex, peekedCount: 0 },
            actionMessage: `${state.players[nextPlayerIndex].name} is peeking (auto-advanced due to AFK)`,
          };

          await ctx.db.patch(game._id, {
            state: newState,
            lastUpdated: now,
            version: (game.version || 0) + 1,
          });

          advancedCount++;
        }
      }
    }

    return { advancedCount, timestamp: now };
  },
});

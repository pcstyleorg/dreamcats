import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const createRoom = mutation({
  args: {
    roomId: v.string(),
    hostId: v.string(),
    hostName: v.string(),
    mode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const mode = args.mode ?? "online";

    // Prevent duplicate room codes
    const existing = await ctx.db
      .query("rooms")
      .withIndex("by_roomId", (q) => q.eq("roomId", args.roomId))
      .first();
    if (existing) {
      throw new Error("Room already exists");
    }

    await ctx.db.insert("rooms", {
      roomId: args.roomId,
      hostId: args.hostId,
      hostName: args.hostName,
      status: "lobby",
      mode,
      createdAt: now,
      lastUpdated: now,
    });
    // Add host as a player
    await ctx.db.insert("players", {
      roomId: args.roomId,
      playerId: args.hostId,
      name: args.hostName,
        seat: 0,
        score: 0,
        connected: true,
      lastSeenAt: now,
    });

    // Seed game snapshot shell
    await ctx.db.insert("games", {
      roomId: args.roomId,
      state: {
        roomId: args.roomId,
        gameMode: mode,
        gamePhase: "lobby",
        hostId: args.hostId,
        players: [],
      },
      version: 0,
      lastUpdated: now,
    });
    return { success: true };
  },
});

export const joinRoom = mutation({
  args: {
    roomId: v.string(),
    playerId: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if room exists
    const room = await ctx.db
      .query("rooms")
      .withIndex("by_roomId", (q) => q.eq("roomId", args.roomId))
      .first();

    if (!room) {
      throw new Error("Room not found");
    }

    // Check if player already exists
    const existingPlayer = await ctx.db
      .query("players")
      .withIndex("by_playerId", (q) => q.eq("playerId", args.playerId))
      .first();

    const now = Date.now();
    const roomPlayers = await ctx.db
      .query("players")
      .withIndex("by_roomId", (q) => q.eq("roomId", args.roomId))
      .collect();
    const takenSeats = new Set(roomPlayers.map((p) => p.seat));
    let seat = 0;
    while (takenSeats.has(seat)) seat += 1;

    if (existingPlayer) {
      // Update last seen
      await ctx.db.patch(existingPlayer._id, {
        lastSeenAt: now,
        connected: true,
      });
    } else {
      // Add new player
      await ctx.db.insert("players", {
        roomId: args.roomId,
        playerId: args.playerId,
        name: args.name,
        seat,
        score: 0,
        connected: true,
        lastSeenAt: now,
      });
    }

    // Update room lastUpdated
    await ctx.db.patch(room._id, {
      lastUpdated: now,
    });

    return { success: true };
  },
});

export const getRoom = query({
  args: { roomId: v.string() },
  handler: async (ctx, args) => {
    const room = await ctx.db
      .query("rooms")
      .withIndex("by_roomId", (q) => q.eq("roomId", args.roomId))
      .first();
    return room;
  },
});

export const getPlayers = query({
  args: { roomId: v.string() },
  handler: async (ctx, args) => {
    const players = await ctx.db
      .query("players")
      .withIndex("by_roomId", (q) => q.eq("roomId", args.roomId))
      .collect();
    return players;
  },
});
/**
 * Updates player presence heartbeat for real-time connectivity tracking.
 * 
 * IMPORTANT: This mutation is critical for the real-time presence system.
 * It updates both the player record and presence table to track online status.
 * Changes here affect all clients' reconnection and offline detection behavior.
 * 
 * Called every 10 seconds by ConvexSync on each connected client.
 */
export const updatePlayerPresence = mutation({
  args: {
    roomId: v.string(),
    playerId: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const player = await ctx.db
      .query("players")
      .withIndex("by_playerId", (q) => q.eq("playerId", args.playerId))
      .first();

    if (player) {
      await ctx.db.patch(player._id, {
        lastSeenAt: now,
        connected: true,
      });
    }

    const presence = await ctx.db
      .query("presence")
      .withIndex("by_playerId", (q) => q.eq("playerId", args.playerId))
      .first();
    if (presence) {
      await ctx.db.patch(presence._id, { lastPing: now, status: "online" });
    } else {
      await ctx.db.insert("presence", {
        roomId: args.roomId,
        playerId: args.playerId,
        status: "online",
        lastPing: now,
      });
    }
  },
});

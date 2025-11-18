import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const createRoom = mutation({
  args: {
    roomId: v.string(),
    hostId: v.string(),
    hostName: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.insert("rooms", {
      roomId: args.roomId,
      hostId: args.hostId,
      hostName: args.hostName,
      createdAt: now,
      lastUpdated: now,
    });
    // Add host as a player
    await ctx.db.insert("players", {
      roomId: args.roomId,
      playerId: args.hostId,
      name: args.hostName,
      lastSeenAt: now,
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
    if (existingPlayer) {
      // Update last seen
      await ctx.db.patch(existingPlayer._id, {
        lastSeenAt: now,
      });
    } else {
      // Add new player
      await ctx.db.insert("players", {
        roomId: args.roomId,
        playerId: args.playerId,
        name: args.name,
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

export const updatePlayerPresence = mutation({
  args: {
    roomId: v.string(),
    playerId: v.string(),
  },
  handler: async (ctx, args) => {
    const player = await ctx.db
      .query("players")
      .withIndex("by_playerId", (q) => q.eq("playerId", args.playerId))
      .first();

    if (player) {
      await ctx.db.patch(player._id, {
        lastSeenAt: Date.now(),
      });
    }
  },
});


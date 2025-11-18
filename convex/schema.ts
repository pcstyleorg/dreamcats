import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  rooms: defineTable({
    roomId: v.string(),
    hostId: v.string(),
    hostName: v.string(),
    createdAt: v.number(),
    lastUpdated: v.number(),
  })
    .index("by_roomId", ["roomId"])
    .index("by_hostId", ["hostId"]),

  players: defineTable({
    roomId: v.string(),
    playerId: v.string(),
    name: v.string(),
    lastSeenAt: v.number(),
  })
    .index("by_roomId", ["roomId"])
    .index("by_playerId", ["playerId"]),

  games: defineTable({
    roomId: v.string(),
    state: v.any(), // GameState serialized
    lastUpdated: v.number(),
  })
    .index("by_roomId", ["roomId"]),

  messages: defineTable({
    roomId: v.string(),
    senderId: v.string(),
    senderName: v.string(),
    message: v.string(),
    timestamp: v.number(),
  })
    .index("by_roomId", ["roomId"])
    .index("by_timestamp", ["timestamp"]),
});


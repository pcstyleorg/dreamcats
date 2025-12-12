import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

export default defineSchema({
  // Convex Auth tables (users, sessions, accounts, etc.)
  ...authTables,

  rooms: defineTable({
    roomId: v.string(), // human code
    hostId: v.string(),
    hostName: v.string(),
    status: v.string(), // lobby | playing | round_end | game_over
    mode: v.string(), // online | hotseat
    createdAt: v.number(),
    lastUpdated: v.number(),
  })
    .index("by_roomId", ["roomId"])
    .index("by_hostId", ["hostId"])
    .index("by_status", ["status"]),

  players: defineTable({
    roomId: v.string(),
    playerId: v.string(),
    userId: v.optional(v.id("users")),
    name: v.string(),
    seat: v.number(),
    score: v.number(),
    connected: v.boolean(),
    lastSeenAt: v.number(),
  })
    .index("by_roomId", ["roomId"])
    .index("by_playerId", ["playerId"])
    .index("by_userId", ["userId"]),

  games: defineTable({
    roomId: v.string(),
    state: v.any(), // authoritative room state snapshot
    lastUpdated: v.number(),
    version: v.number(), // monotonically increasing to avoid stale writes
    idempotencyKey: v.optional(v.string()),
  })
    .index("by_roomId", ["roomId"])
    .index("by_idem", ["idempotencyKey"]),

  moves: defineTable({
    roomId: v.string(),
    playerId: v.string(),
    action: v.string(),
    payload: v.optional(v.any()),
    createdAt: v.number(),
    idempotencyKey: v.string(),
  })
    .index("by_room_time", ["roomId", "createdAt"])
    .index("by_room_action", ["roomId", "action"])
    .index("by_idem", ["idempotencyKey"]),

  messages: defineTable({
    roomId: v.string(),
    senderId: v.string(),
    senderName: v.string(),
    message: v.string(),
    timestamp: v.number(),
  })
    .index("by_roomId", ["roomId"])
    .index("by_timestamp", ["timestamp"])
    .index("by_room_time", ["roomId", "timestamp"]),

  presence: defineTable({
    roomId: v.string(),
    playerId: v.string(),
    status: v.string(), // online | away | disconnected
    lastPing: v.number(),
  })
    .index("by_roomId", ["roomId"])
    .index("by_playerId", ["playerId"]),

  userPreferences: defineTable({
    userId: v.id("users"), // Links to auth user
    displayName: v.optional(v.string()),
    theme: v.optional(v.string()), // "light" | "dark"
    language: v.optional(v.string()), // "en" | "pl" etc.
    soundEnabled: v.optional(v.boolean()),
    tutorialCompleted: v.optional(v.boolean()),
    // Active game session for rejoin capability
    activeRoomId: v.optional(v.string()),
    activePlayerId: v.optional(v.string()),
    activeGameMode: v.optional(v.string()), // "online" | "hotseat"
    // Local game backup for hotseat resume
    localGameState: v.optional(v.any()),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"]),

  matches: defineTable({
    roomId: v.string(),
    mode: v.string(), // online | hotseat
    endedAt: v.number(),
    winnerPlayerId: v.string(),
    winnerName: v.string(),
    winningScore: v.number(),
    playerCount: v.number(),
  })
    .index("by_roomId", ["roomId"])
    .index("by_endedAt", ["endedAt"]),

  matchPlayers: defineTable({
    matchId: v.id("matches"),
    roomId: v.string(),
    userId: v.optional(v.id("users")),
    playerId: v.string(),
    name: v.string(),
    finalScore: v.number(),
    place: v.number(),
    endedAt: v.number(),
  })
    .index("by_matchId", ["matchId"])
    .index("by_user_time", ["userId", "endedAt"])
    .index("by_room_time", ["roomId", "endedAt"]),

  userStats: defineTable({
    userId: v.id("users"),
    gamesPlayed: v.number(),
    gamesWon: v.number(),
    totalScore: v.number(),
    bestScore: v.optional(v.number()),
    lastPlayedAt: v.optional(v.number()),
    updatedAt: v.number(),
  }).index("by_userId", ["userId"]),
});

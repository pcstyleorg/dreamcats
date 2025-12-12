import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Get the current user's preferences
 */
export const get = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    const preferences = await ctx.db
      .query("userPreferences")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();

    return preferences;
  },
});

/**
 * Update user preferences (creates if doesn't exist)
 */
export const update = mutation({
  args: {
    displayName: v.optional(v.string()),
    theme: v.optional(v.string()),
    language: v.optional(v.string()),
    soundEnabled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const existing = await ctx.db
      .query("userPreferences")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();

    if (existing) {
      // Update existing preferences
      await ctx.db.patch(existing._id, {
        ...(args.displayName !== undefined && { displayName: args.displayName }),
        ...(args.theme !== undefined && { theme: args.theme }),
        ...(args.language !== undefined && { language: args.language }),
        ...(args.soundEnabled !== undefined && { soundEnabled: args.soundEnabled }),
        updatedAt: Date.now(),
      });
      return existing._id;
    } else {
      // Create new preferences
      const id = await ctx.db.insert("userPreferences", {
        userId,
        displayName: args.displayName,
        theme: args.theme,
        language: args.language,
        soundEnabled: args.soundEnabled,
        updatedAt: Date.now(),
      });
      return id;
    }
  },
});

/**
 * Set display name
 */
export const setDisplayName = mutation({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const existing = await ctx.db
      .query("userPreferences")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        displayName: name,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("userPreferences", {
        userId,
        displayName: name,
        updatedAt: Date.now(),
      });
    }
  },
});

/**
 * Set theme preference
 */
export const setTheme = mutation({
  args: { theme: v.string() },
  handler: async (ctx, { theme }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const existing = await ctx.db
      .query("userPreferences")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        theme,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("userPreferences", {
        userId,
        theme,
        updatedAt: Date.now(),
      });
    }
  },
});

/**
 * Set language preference
 */
export const setLanguage = mutation({
  args: { language: v.string() },
  handler: async (ctx, { language }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const existing = await ctx.db
      .query("userPreferences")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        language,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("userPreferences", {
        userId,
        language,
        updatedAt: Date.now(),
      });
    }
  },
});

/**
 * Set sound preference
 */
export const setSoundEnabled = mutation({
  args: { enabled: v.boolean() },
  handler: async (ctx, { enabled }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const existing = await ctx.db
      .query("userPreferences")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        soundEnabled: enabled,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("userPreferences", {
        userId,
        soundEnabled: enabled,
        updatedAt: Date.now(),
      });
    }
  },
});

/**
 * Set active game session (for rejoin after refresh)
 */
export const setActiveSession = mutation({
  args: {
    roomId: v.optional(v.string()),
    playerId: v.optional(v.string()),
    gameMode: v.optional(v.string()),
  },
  handler: async (ctx, { roomId, playerId, gameMode }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      // For anonymous, store in localStorage on client side
      return;
    }

    const existing = await ctx.db
      .query("userPreferences")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();

    const sessionData = {
      activeRoomId: roomId,
      activePlayerId: playerId,
      activeGameMode: gameMode,
      updatedAt: Date.now(),
    };

    if (existing) {
      await ctx.db.patch(existing._id, sessionData);
    } else {
      await ctx.db.insert("userPreferences", {
        userId,
        ...sessionData,
      });
    }
  },
});

/**
 * Clear active game session
 */
export const clearActiveSession = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return;

    const existing = await ctx.db
      .query("userPreferences")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        activeRoomId: undefined,
        activePlayerId: undefined,
        activeGameMode: undefined,
        localGameState: undefined,
        updatedAt: Date.now(),
      });
    }
  },
});

/**
 * Save local game state (for hotseat resume)
 */
export const saveLocalGameState = mutation({
  args: {
    gameState: v.any(),
  },
  handler: async (ctx, { gameState }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return;

    const existing = await ctx.db
      .query("userPreferences")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        localGameState: gameState,
        activeGameMode: "hotseat",
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("userPreferences", {
        userId,
        localGameState: gameState,
        activeGameMode: "hotseat",
        updatedAt: Date.now(),
      });
    }
  },
});

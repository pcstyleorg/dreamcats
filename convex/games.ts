import { mutation, query, action } from "./_generated/server";
import { api } from "./_generated/api";
import { v } from "convex/values";

type Card = {
  id: number;
  value: number;
  isSpecial: boolean;
  specialAction?: "take_2" | "peek_1" | "swap_2";
};

const buildDeck = (): Card[] => {
  // mirror client card generation for server authority
  const cards: Card[] = [];
  let id = 0;
  for (let i = 0; i <= 9; i++) {
    const count = i === 9 ? 9 : 4;
    for (let j = 0; j < count; j++) {
      cards.push({ id: id++, value: i, isSpecial: false });
    }
  }
  const addSpecial = (value: number, specialAction: string) => {
    for (let i = 0; i < 3; i++) {
      cards.push({ id: id++, value, isSpecial: true, specialAction });
    }
  };
  addSpecial(5, "take_2");
  addSpecial(6, "peek_1");
  addSpecial(7, "swap_2");
  return cards;
};

const shuffle = (deck: Card[]) => {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export const setGameState = mutation({
  args: {
    roomId: v.string(),
    state: v.any(), // GameState snapshot
    version: v.optional(v.number()),
    idempotencyKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("games")
      .withIndex("by_roomId", (q) => q.eq("roomId", args.roomId))
      .first();

    // Idempotency guard
    if (args.idempotencyKey) {
      const idem = await ctx.db
        .query("games")
        .withIndex("by_idem", (q) => q.eq("idempotencyKey", args.idempotencyKey))
        .first();
      if (idem) return { success: true, skipped: "idempotent" };
    }

    const now = Date.now();
    const incomingVersion = args.version ?? now;

    if (existing && existing.version !== undefined && existing.version > incomingVersion) {
      return { success: false, reason: "stale" };
    }

    if (existing) {
      await ctx.db.patch(existing._id, {
        state: args.state,
        version: incomingVersion,
        ...(args.idempotencyKey ? { idempotencyKey: args.idempotencyKey } : {}),
        lastUpdated: now,
      });
    } else {
      await ctx.db.insert("games", {
        roomId: args.roomId,
        state: args.state,
        version: incomingVersion,
        ...(args.idempotencyKey ? { idempotencyKey: args.idempotencyKey } : {}),
        lastUpdated: now,
      });
    }

    return { success: true };
  },
});

export const getGameState = query({
  args: { roomId: v.string() },
  handler: async (ctx, args) => {
    const game = await ctx.db
      .query("games")
      .withIndex("by_roomId", (q) => q.eq("roomId", args.roomId))
      .first();
    return game?.state ?? null;
  },
});

export const startGame = action({
  args: { roomId: v.string() },
  handler: async (ctx, args) => {
    const deck = shuffle(buildDeck());
    const room = await ctx.runQuery(api.rooms.getRoom, { roomId: args.roomId });
    if (!room) throw new Error("Room not found");
    const players = await ctx.runQuery(api.rooms.getPlayers, { roomId: args.roomId });
    if (!players || players.length < 2) throw new Error("Need at least 2 players");

    // deal 4 cards to each player
    const hands: { playerId: string; hand: { card: Card; isFaceUp: boolean; hasBeenPeeked: boolean }[] }[] = players.map((p) => ({
      playerId: p.playerId,
      hand: [],
    }));

    for (let r = 0; r < 4; r++) {
      for (const hand of hands) {
        const card = deck.shift();
        if (card) {
          hand.hand.push({ card, isFaceUp: false, hasBeenPeeked: false });
        }
      }
    }

    const discard: Card[] = [];
    const drawPile: Card[] = deck;

    const state = {
      gameMode: room.mode ?? "online",
      roomId: room.roomId,
      hostId: room.hostId,
      players: players.map((p) => ({
        id: p.playerId,
        name: p.name,
        hand: hands.find((h) => h.playerId === p.playerId)?.hand ?? [],
        score: p.score ?? 0,
      })),
      drawPile,
      discardPile: discard,
      currentPlayerIndex: 0,
      gamePhase: "playing",
      actionMessage: "Game started",
      turnCount: 0,
      chatMessages: [],
    };

    await ctx.runMutation(api.games.setGameState, {
      roomId: args.roomId,
      state,
      version: Date.now(),
      idempotencyKey: `start-${args.roomId}`,
    });

    return { success: true, state };
  },
});

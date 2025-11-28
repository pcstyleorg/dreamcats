import { query } from "./_generated/server";
import { v } from "convex/values";
import { GameState, GamePhase } from "./types";

// Helper to determine if we should reveal all cards
const isRevealPhase = (phase: GamePhase) =>
  phase === "round_end" || phase === "game_over";

export const getGameState = query({
  args: { 
    roomId: v.string(), 
    playerId: v.optional(v.string()) 
  },
  handler: async (ctx, args) => {
    const gameRecord = await ctx.db
      .query("games")
      .withIndex("by_roomId", (q) => q.eq("roomId", args.roomId))
      .first();

    if (!gameRecord) return null;

    const state = gameRecord.state as GameState;
    const viewerId = args.playerId;

    if (state.gameMode === "hotseat") {
        return state;
    }

    // In lobby, fetch players from the 'players' table to get the live list
    if (state.gamePhase === "lobby") {
        const roomPlayers = await ctx.db
            .query("players")
            .withIndex("by_roomId", (q) => q.eq("roomId", args.roomId))
            .collect();
        
        // Sort by seat
        roomPlayers.sort((a, b) => (a.seat ?? 0) - (b.seat ?? 0));

        const lobbyPlayers = roomPlayers.map(p => ({
            id: p.playerId,
            name: p.name,
            hand: [],
            score: 0,
        }));

        return {
            ...state,
            players: lobbyPlayers,
        };
    }

    if (!viewerId) return null; // Must be authenticated to see state

    const revealAll = isRevealPhase(state.gamePhase);

    // SECURE FILTERING
    const players = (state.players || []).map((player) => {
      if (revealAll || player.id === viewerId) return player;

      // Hide opponent cards
      return {
        ...player,
        hand: player.hand.map((slot) => ({
          ...slot,
          // REDACT CARD DATA
          // In "peeking" phase, isFaceUp is used for the owner to see, but opponents must NOT see it.
          card: (slot.isFaceUp && state.gamePhase !== "peeking") ? slot.card : { 
              id: -1, 
              value: -1, 
              isSpecial: false 
          }, 
          isFaceUp: slot.isFaceUp,
          hasBeenPeeked: false, // Don't show peek status to opponents
        })),
      };
    });

    // Also redact draw pile?
    const drawPile = (state.drawPile || []).map(() => ({
        id: -1,
        value: -1,
        isSpecial: false 
    }));

    return {
      ...state,
      players,
      drawPile, // Redacted
      // We might want to redact `tempCards` if they are not for this player?
      // If `gamePhase` is `action_take_2` and it's NOT my turn, I shouldn't see `tempCards`.
      tempCards: (state.gamePhase === "action_take_2" && state.currentPlayerIndex !== state.players.findIndex(p => p.id === viewerId)) 
        ? undefined 
        : state.tempCards,
    };
  },
});

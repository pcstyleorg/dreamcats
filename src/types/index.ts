/**
 * Game type definitions.
 *
 * Re-exported from convex/types.ts which is the single source of truth.
 * This ensures type consistency between frontend and backend.
 *
 * Client-only types (if any) should be added below the re-export.
 */
export {
  type Card,
  type Player,
  type GameMode,
  type BotDifficulty,
  type GamePhase,
  type ChatMessage,
  type GameState,
  type GameAction,
  type UserStats,
  type MatchHistoryItem,
} from "../../convex/types";

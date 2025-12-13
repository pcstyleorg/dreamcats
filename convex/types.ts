export interface Card {
  id: number;
  value: number;
  isSpecial: boolean;
  specialAction?: "take_2" | "peek_1" | "swap_2";
}

export interface Player {
  id: string;
  name: string;
  hand: { card: Card; isFaceUp: boolean; hasBeenPeeked: boolean }[];
  score: number;
}

export type GameMode = "lobby" | "online" | "hotseat" | "solo";

export type BotDifficulty = "easy" | "normal" | "hard";

export type GamePhase =
  | "lobby"
  | "peeking"
  | "playing"
  | "holding_card"
  | "action_take_2"
  | "action_peek_1"
  | "action_swap_2_select_1"
  | "action_swap_2_select_2"
  | "round_end"
  | "game_over";

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  message: string;
  timestamp: number;
}

export interface GameState {
  gameMode: GameMode;
  roomId: string | null;
  hostId: string | null;
  botDifficulty?: BotDifficulty;
  drawPile: Card[];
  discardPile: Card[];
  players: Player[];
  /** Index of the player who starts the current round. Rotates each round. */
  startingPlayerIndex: number;
  currentPlayerIndex: number;
  gamePhase: GamePhase;
  actionMessage: string;
  drawSource?: "deck" | "discard" | "take2" | null;
  roundWinnerName: string | null;
  gameWinnerName: string | null;
  turnCount: number;
  chatMessages: ChatMessage[];
  lastCallerId?: string | null;
  peekingState?: {
    playerIndex: number;
    peekedCount: number;
    startIndex?: number;
  };
  drawnCard?: Card | null;
  tempCards?: Card[];
  swapState?: {
    card1: { playerId: string; cardIndex: number };
  };
  lastRoundScores?: { playerId: string; score: number; penalty: number }[];
  lastMove?: {
    playerId: string;
    action:
      | "draw"
      | "swap"
      | "discard"
      | "peek"
      | "swap_2"
      | "take_2";
    cardIndex?: number;
    source?: "deck" | "discard";
    targetPlayerId?: string;
    timestamp: number;
    /** Details about swap_2 action - which cards were swapped */
    swap2Details?: {
      card1: { playerId: string; cardIndex: number };
      card2: { playerId: string; cardIndex: number };
    };
  } | null;
}

export interface UserStats {
  gamesPlayed: number;
  gamesWon: number;
  totalScore: number;
  bestScore: number | null;
  lastPlayedAt: number | null;
}

export interface MatchHistoryItem {
  matchId: string;
  roomId: string;
  endedAt: number;
  mode: string;
  winnerName: string;
  winningScore: number;
  yourName: string;
  yourScore: number;
  yourPlace: number;
  playerCount: number;
}

export type GameAction =
  | { type: "PEEK_CARD"; payload: { playerId: string; cardIndex: number } }
  | { type: "FINISH_PEEKING" }
  | { type: "DRAW_FROM_DECK" }
  | { type: "DRAW_FROM_DISCARD" }
  | { type: "DISCARD_HELD_CARD" }
  | { type: "SWAP_HELD_CARD"; payload: { cardIndex: number } }
  | { type: "USE_SPECIAL_ACTION" }
  | {
    type: "ACTION_PEEK_1_SELECT";
    payload: { playerId: string; cardIndex: number };
  }
  | {
    type: "ACTION_SWAP_2_SELECT";
    payload: { playerId: string; cardIndex: number };
  }
  | { type: "ACTION_TAKE_2_CHOOSE"; payload: { card: Card } }
  | { type: "CALL_POBUDKA" }
  | { type: "START_NEW_ROUND" };

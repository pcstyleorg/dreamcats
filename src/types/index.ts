export interface Card {
  id: number;
  value: number;
  isSpecial: boolean;
  specialAction?: 'take_2' | 'peek_1' | 'swap_2';
}

export interface Player {
  id: string;
  name: string;
  hand: { card: Card; isFaceUp: boolean; hasBeenPeeked: boolean }[];
  score: number;
}

export type GameMode = 'lobby' | 'online' | 'hotseat';

export type GamePhase = 
  | 'lobby'
  | 'peeking' 
  | 'playing'
  | 'holding_card' // Player has drawn a card and must decide what to do
  | 'action_take_2'
  | 'action_peek_1'
  | 'action_swap_2_select_1'
  | 'action_swap_2_select_2'
  | 'round_end' 
  | 'game_over';

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
  drawPile: Card[];
  discardPile: Card[];
  players: Player[];
  currentPlayerIndex: number;
  gamePhase: GamePhase;
  actionMessage: string;
  roundWinnerName: string | null;
  gameWinnerName: string | null;
  turnCount: number;
  chatMessages: ChatMessage[];
  peekingState?: {
    playerIndex: number;
    peekedCount: number;
  };
  drawnCard?: Card | null; // Card the current player is holding
  tempCards?: Card[]; // For 'take_2' action
  swapState?: { // For 'swap_2' action
    card1: { playerId: string; cardIndex: number };
  };
  lastRoundScores?: { playerId: string; score: number; penalty: number }[];
}

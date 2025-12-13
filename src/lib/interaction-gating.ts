import { GameState, GamePhase } from "@/types";

/**
 * Determines if the current game phase allows targeting opponent cards
 * Used during peek_1 and swap_2 special actions
 */
export function isOpponentTargetablePhase(gamePhase: GamePhase): boolean {
  return (
    gamePhase === "action_peek_1" ||
    gamePhase === "action_swap_2_select_1" ||
    gamePhase === "action_swap_2_select_2"
  );
}

/**
 * Determines if the current game phase is a special selection phase
 * Includes all special action phases (peek_1, swap_2, take_2)
 */
export function isSpecialSelectionPhase(gamePhase: GamePhase): boolean {
  return (
    gamePhase === "action_peek_1" ||
    gamePhase === "action_swap_2_select_1" ||
    gamePhase === "action_swap_2_select_2" ||
    gamePhase === "action_take_2"
  );
}

/**
 * Determines the active player ID based on game phase
 * During peeking, the active player is determined by peekingState
 * Otherwise, it's the current player
 */
export function getActivePlayerId(state: GameState): string | undefined {
  const { gamePhase, peekingState, players, currentPlayerIndex } = state;

  if (gamePhase === "peeking" && peekingState !== undefined) {
    return players[peekingState.playerIndex]?.id;
  }

  return players[currentPlayerIndex]?.id;
}

/**
 * Determines if the local player can act now based on game mode
 * - hotseat: always true (anyone can act from the same device)
 * - solo/online: only when it's the local player's turn
 */
export function canActNow(
  gameMode: GameState["gameMode"],
  activePlayerId: string | undefined,
  myPlayerId: string | undefined
): boolean {
  if (gameMode === "hotseat") {
    return true;
  }

  if (gameMode === "online" || gameMode === "solo") {
    return activePlayerId === myPlayerId;
  }

  return false;
}

/**
 * Determines if clicking on an opponent's card should be allowed
 * Returns true if the click should proceed, false if it should be blocked
 */
export function shouldAllowOpponentCardClick(params: {
  isOpponent: boolean;
  gamePhase: GamePhase;
  canActNow: boolean;
  isPeekingTurn: boolean;
  isCurrentPlayer: boolean;
}): boolean {
  const { isOpponent, gamePhase, canActNow: canAct, isPeekingTurn, isCurrentPlayer } = params;

  // non-opponent cards are always allowed (handled elsewhere)
  if (!isOpponent) {
    return true;
  }

  // special action phases that target opponent cards
  if (isOpponentTargetablePhase(gamePhase) && canAct) {
    return true;
  }

  // peeking own cards during initial peeking phase
  if (gamePhase === "peeking" && isPeekingTurn) {
    return true;
  }

  // swapping own cards during holding_card phase
  if (gamePhase === "holding_card" && isCurrentPlayer) {
    return true;
  }

  return false;
}

/**
 * Determines if a card should have interactive styling (cursor-pointer)
 */
export function getCardInteractivity(params: {
  gamePhase: GamePhase;
  canActNow: boolean;
  isPeekingTurn: boolean;
  isCurrentPlayer: boolean;
  cardIsFaceUp: boolean;
  peekedCount: number;
}): boolean {
  const {
    gamePhase,
    canActNow: canAct,
    isPeekingTurn,
    isCurrentPlayer,
    cardIsFaceUp,
    peekedCount,
  } = params;

  // peeking phase: allow peeking unpeeked cards
  if (
    gamePhase === "peeking" &&
    isPeekingTurn &&
    !cardIsFaceUp &&
    peekedCount < 2
  ) {
    return true;
  }

  // holding_card phase: allow current player to swap
  if (gamePhase === "holding_card" && isCurrentPlayer) {
    return true;
  }

  // opponent-targetable phases: allow interaction when player can act
  if (isOpponentTargetablePhase(gamePhase) && canAct) {
    return true;
  }

  return false;
}

/**
 * Determines if a card should pulse (visual highlight for valid targets)
 */
export function shouldPulseCard(params: {
  gamePhase: GamePhase;
  canActNow: boolean;
  isPeekingTurn: boolean;
  cardIsFaceUp: boolean;
  peekedCount: number;
}): boolean {
  const { gamePhase, canActNow: canAct, isPeekingTurn, cardIsFaceUp, peekedCount } = params;

  // pulse during opponent-targetable phases for face-down cards
  if (isOpponentTargetablePhase(gamePhase) && canAct && !cardIsFaceUp) {
    return true;
  }

  // pulse during initial peeking for the active peeker's unpeeked cards
  if (isPeekingTurn && !cardIsFaceUp && peekedCount < 2) {
    return true;
  }

  return false;
}

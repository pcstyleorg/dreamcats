import { useMemo } from "react";
import { useGame } from "@/context/GameContext";
import { useAppStore } from "./store";
import { isNewStateEnabled } from "./featureFlag";
import { Player, Card, ChatMessage, GamePhase, GameMode } from "@/types";

/**
 * Hook to get players view - reads from AppStore when enabled, falls back to GameContext
 */
export const usePlayersView = (): Player[] => {
  const enabled = isNewStateEnabled();
  const storePlayers = useAppStore((s) => s.players);
  const { state } = useGame();

  return useMemo(() => (enabled ? storePlayers : state.players), [enabled, storePlayers, state.players]);
};

/**
 * Hook to check if it's the current user's turn
 */
export const useIsMyTurn = (): boolean => {
  const enabled = isNewStateEnabled();
  const storeCurrentIndex = useAppStore((s) => s.currentPlayerIndex);
  const storePlayers = useAppStore((s) => s.players);
  const storeGameMode = useAppStore((s) => s.gameMode);
  const storePlayerId = useAppStore((s) => s.playerId);
  const { state, myPlayerId } = useGame();

  return useMemo(() => {
    if (enabled) {
      if (storeGameMode === "hotseat") return true;
      const currentPlayer = storePlayers[storeCurrentIndex];
      return currentPlayer?.id === storePlayerId;
    }
    if (state.gameMode === "hotseat") return true;
    const currentPlayer = state.players[state.currentPlayerIndex];
    return currentPlayer?.id === myPlayerId;
  }, [enabled, storeCurrentIndex, storePlayers, storeGameMode, storePlayerId, state, myPlayerId]);
};

/**
 * Hook to get current player
 */
export const useCurrentPlayer = (): Player | null => {
  const enabled = isNewStateEnabled();
  const storeCurrentIndex = useAppStore((s) => s.currentPlayerIndex);
  const storePlayers = useAppStore((s) => s.players);
  const { state } = useGame();

  return useMemo(() => {
    if (enabled) {
      return storePlayers[storeCurrentIndex] ?? null;
    }
    return state.players[state.currentPlayerIndex] ?? null;
  }, [enabled, storeCurrentIndex, storePlayers, state]);
};

/**
 * Hook to get game phase
 */
export const useGamePhase = (): GamePhase => {
  const enabled = isNewStateEnabled();
  const storePhase = useAppStore((s) => s.gamePhase);
  const { state } = useGame();

  return enabled ? storePhase : state.gamePhase;
};

/**
 * Hook to get game mode
 */
export const useGameMode = (): GameMode => {
  const enabled = isNewStateEnabled();
  const storeMode = useAppStore((s) => s.gameMode);
  const { state } = useGame();

  return enabled ? storeMode : state.gameMode;
};

/**
 * Hook to get draw pile count
 */
export const useDrawPileCount = (): number => {
  const enabled = isNewStateEnabled();
  const storeCount = useAppStore((s) => s.drawPileCount);
  const { state } = useGame();

  return enabled ? storeCount : state.drawPile.length;
};

/**
 * Hook to get discard top card
 */
export const useDiscardTop = (): Card | null => {
  const enabled = isNewStateEnabled();
  const storeTop = useAppStore((s) => s.discardTop);
  const { state } = useGame();

  return useMemo(() => {
    if (enabled) return storeTop;
    return state.discardPile.length > 0 ? state.discardPile[state.discardPile.length - 1] : null;
  }, [enabled, storeTop, state.discardPile]);
};

/**
 * Hook to get drawn card (card player is currently holding)
 */
export const useDrawnCard = (): Card | null => {
  const enabled = isNewStateEnabled();
  const storeDrawnCard = useAppStore((s) => s.drawnCard);
  const { state } = useGame();

  return enabled ? storeDrawnCard : (state.drawnCard ?? null);
};

/**
 * Hook to get action message
 */
export const useActionMessage = (): string => {
  const enabled = isNewStateEnabled();
  const storeMessage = useAppStore((s) => s.actionMessage);
  const { state } = useGame();

  return enabled ? storeMessage : state.actionMessage;
};

/**
 * Hook to get room ID
 */
export const useRoomId = (): string | null => {
  const enabled = isNewStateEnabled();
  const storeRoomId = useAppStore((s) => s.roomId);
  const { state } = useGame();

  return enabled ? storeRoomId : state.roomId;
};

/**
 * Hook to get last move
 */
export const useLastMove = () => {
  const enabled = isNewStateEnabled();
  const storeLastMove = useAppStore((s) => s.lastMove);
  const { state } = useGame();

  return enabled ? storeLastMove : state.lastMove;
};

/**
 * Hook to get chat messages
 */
export const useChatMessages = (): ChatMessage[] => {
  const enabled = isNewStateEnabled();
  const storeChat = useAppStore((s) => s.chatMessages);
  const { state } = useGame();

  return enabled ? storeChat : state.chatMessages;
};

/**
 * Hook to get my player ID
 */
export const useMyPlayerId = (): string | null => {
  const enabled = isNewStateEnabled();
  const storePlayerId = useAppStore((s) => s.playerId);
  const { myPlayerId } = useGame();

  return enabled ? storePlayerId : myPlayerId;
};

/**
 * Hook to check if player can take actions (is their turn and in playing phase)
 */
export const useCanTakeAction = (): boolean => {
  const isMyTurn = useIsMyTurn();
  const gamePhase = useGamePhase();

  return isMyTurn && gamePhase === "playing";
};

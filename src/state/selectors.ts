import { useAppStore } from "./store";

export const useSession = () =>
  useAppStore((state) => ({
    playerId: state.playerId,
    playerName: state.playerName,
    roomId: state.roomId,
    locale: state.locale,
    theme: state.theme,
  }));

export const useUiState = () =>
  useAppStore((state) => ({
    isMenuOpen: state.isMenuOpen,
    isSheetOpen: state.isSheetOpen,
    safeArea: state.safeArea,
    reducedMotion: state.reducedMotion,
    viewportHeight: state.viewportHeight,
  }));

export const useGameView = () =>
  useAppStore((state) => ({
    roomStatus: state.roomStatus,
    gamePhase: state.game.gamePhase,
    gameMode: state.game.gameMode,
    players: state.game.players,
    currentPlayerIndex: state.game.currentPlayerIndex,
    drawPile: state.game.drawPile,
    discardPile: state.game.discardPile,
    drawnCard: state.game.drawnCard,
    drawSource: state.game.drawSource,
    lastMove: state.game.lastMove,
    actionMessage: state.game.actionMessage,
    roomId: state.game.roomId,
    hostId: state.game.hostId,
  }));

export const useNetStatus = () =>
  useAppStore((state) => ({
    netStatus: state.netStatus,
    latencyMs: state.latencyMs,
    reconnectAttempts: state.reconnectAttempts,
  }));

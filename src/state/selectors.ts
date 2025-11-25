/**
 * @deprecated These batch selectors are kept for reference.
 * Prefer using the specific hooks from `./hooks.ts` instead,
 * which provide better memoization and feature flag support.
 */
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
    gamePhase: state.gamePhase,
    gameMode: state.gameMode,
    players: state.players,
    currentPlayerIndex: state.currentPlayerIndex,
    drawPileCount: state.drawPileCount,
    discardTop: state.discardTop,
    drawnCard: state.drawnCard,
    drawSource: state.drawSource,
    lastMove: state.lastMove,
    actionMessage: state.actionMessage,
  }));

export const useNetStatus = () =>
  useAppStore((state) => ({
    netStatus: state.netStatus,
    latencyMs: state.latencyMs,
    reconnectAttempts: state.reconnectAttempts,
  }));

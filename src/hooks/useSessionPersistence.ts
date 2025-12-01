import { useCallback, useEffect, useRef } from "react";
import { useUserPreferences } from "./useUserPreferences";
import { useAppStore } from "@/state/store";

/**
 * Hook to automatically persist game sessions for rejoin capability
 * Must be used within a component that has access to game state
 */
export function useSessionPersistence() {
  const { saveActiveSession, saveLocalGameState, clearActiveSession } = useUserPreferences();
  
  const game = useAppStore((s) => s.game);
  const playerId = useAppStore((s) => s.playerId);
  const roomId = useAppStore((s) => s.roomId);
  
  const lastSavedRef = useRef<string | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Save online session when joining/creating a room
  useEffect(() => {
    if (game.gameMode === "online" && roomId && playerId) {
      const sessionKey = `${roomId}-${playerId}`;
      
      // Only save if this is a new session
      if (lastSavedRef.current !== sessionKey) {
        lastSavedRef.current = sessionKey;
        saveActiveSession({
          roomId,
          playerId,
          gameMode: "online",
        });
      }
    }
  }, [game.gameMode, roomId, playerId, saveActiveSession]);

  // Save hotseat game state periodically (debounced)
  useEffect(() => {
    if (game.gameMode !== "hotseat" || game.gamePhase === "lobby") {
      return;
    }

    // Clear any pending save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounce saves to avoid excessive writes
    saveTimeoutRef.current = setTimeout(() => {
      saveLocalGameState(game);
    }, 2000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [game, saveLocalGameState]);

  // Clear session when game ends or player leaves
  useEffect(() => {
    if (game.gamePhase === "game_over") {
      // Don't immediately clear - let user see results
      // Clear after a delay or on next navigation
    }
  }, [game.gamePhase]);

  const clearSession = useCallback(() => {
    lastSavedRef.current = null;
    clearActiveSession();
    // Also clear legacy sessionStorage
    sessionStorage.removeItem("sen-playerId");
    sessionStorage.removeItem("sen-roomId");
    sessionStorage.removeItem("sen-playerName");
  }, [clearActiveSession]);

  return { clearSession };
}

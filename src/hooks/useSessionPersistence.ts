import { useCallback, useEffect, useRef } from "react";
import { useShallow } from "zustand/shallow";
import { useUserPreferences } from "./useUserPreferences";
import { useAppStore } from "@/state/store";

/**
 * Hook to automatically persist game sessions for rejoin capability
 * Must be used within a component that has access to game state
 * 
 * Zustand v5: Using useShallow to select only the needed fields,
 * preventing re-renders when unrelated state changes.
 */
export function useSessionPersistence() {
  const { saveActiveSession, saveLocalGameState, clearActiveSession } = useUserPreferences();
  
  // Select only the specific fields we need with useShallow
  const { gameMode, gamePhase, roomId, playerId, game } = useAppStore(
    useShallow((s) => ({
      gameMode: s.game.gameMode,
      gamePhase: s.game.gamePhase,
      roomId: s.roomId,
      playerId: s.playerId,
      game: s.game,
    }))
  );
  
  const lastSavedRef = useRef<string | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Save online session when joining/creating a room
  useEffect(() => {
    if (gameMode === "online" && roomId && playerId) {
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
  }, [gameMode, roomId, playerId, saveActiveSession]);

  // Save hotseat game state periodically (debounced)
  useEffect(() => {
    if (gameMode !== "hotseat" || gamePhase === "lobby") {
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
  }, [game, gameMode, gamePhase, saveLocalGameState]);

  // Clear session when game ends or player leaves
  useEffect(() => {
    if (gamePhase === "game_over") {
      // Don't immediately clear - let user see results
      // Clear after a delay or on next navigation
    }
  }, [gamePhase]);

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

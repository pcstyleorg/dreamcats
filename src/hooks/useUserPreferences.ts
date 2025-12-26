import { useCallback } from "react";
import { GameState } from "@/types";
import { safeLocalStorage } from "@/lib/storage";

export interface UserPreferences {
  displayName?: string;
  theme?: "light" | "dark";
  language?: string;
  soundEnabled?: boolean;
}

export interface ActiveGameSession {
  roomId?: string;
  playerId?: string;
  gameMode?: "online" | "hotseat";
  localGameState?: GameState;
}

const SESSION_STORAGE_KEY = "dreamcats-active-session";
const TUTORIAL_COMPLETED_KEY = "dreamcats_tutorial_completed";

/**
 * Hook to manage user preferences using localStorage
 */
export function useUserPreferences() {
  const setTheme = useCallback(
    async (theme: "light" | "dark") => {
      safeLocalStorage.setItem("theme", theme);
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("dreamcats-theme-changed", { detail: theme }),
        );
      }
    },
    []
  );

  const setLanguage = useCallback(
    async (language: string) => {
      safeLocalStorage.setItem("i18nextLng", language);
    },
    []
  );

  const setDisplayName = useCallback(
    async (name: string) => {
      safeLocalStorage.setItem("playerName", name);
    },
    []
  );

  const setSoundEnabled = useCallback((enabled: boolean) => {
    safeLocalStorage.setItem("soundEnabled", String(enabled));
  }, []);

  const setTutorialCompleted = useCallback(
    async (completed: boolean) => {
      safeLocalStorage.setItem(TUTORIAL_COMPLETED_KEY, completed ? "true" : "false");
    },
    [],
  );

  // Save active game session (for rejoin after refresh)
  const saveActiveSession = useCallback(
    async (session: { roomId: string; playerId: string; gameMode: "online" | "hotseat" }) => {
      safeLocalStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    },
    []
  );

  // Clear active game session
  const clearActiveSession = useCallback(async () => {
    safeLocalStorage.removeItem(SESSION_STORAGE_KEY);
  }, []);

  // Save local game state (for hotseat resume)
  const saveLocalGameState = useCallback(
    async (gameState: GameState) => {
      safeLocalStorage.setItem("dreamcats-local-game", JSON.stringify(gameState));
    },
    []
  );

  // Get active session
  const getActiveSession = useCallback((): ActiveGameSession | null => {
    // Check localStorage
    const localSession = safeLocalStorage.getItem(SESSION_STORAGE_KEY);
    if (localSession) {
      try {
        return JSON.parse(localSession) as ActiveGameSession;
      } catch {
        return null;
      }
    }

    // Check for local game state
    const localGame = safeLocalStorage.getItem("dreamcats-local-game");
    if (localGame) {
      try {
        return {
          gameMode: "hotseat",
          localGameState: JSON.parse(localGame) as GameState,
        };
      } catch {
        return null;
      }
    }

    return null;
  }, []);

  // Get current values from localStorage
  const displayName = safeLocalStorage.getItem("playerName") ?? "";
  const theme = (safeLocalStorage.getItem("theme") ?? "light") as "light" | "dark";
  const language = safeLocalStorage.getItem("i18nextLng") ?? "en";
  const soundEnabled = safeLocalStorage.getItem("soundEnabled") === "true";
  const tutorialCompleted = safeLocalStorage.getItem(TUTORIAL_COMPLETED_KEY) === "true";
  const activeSession = getActiveSession();

  return {
    isLoading: false,
    displayName,
    theme,
    language,
    soundEnabled,
    tutorialCompleted,
    activeSession,
    setTheme,
    setLanguage,
    setDisplayName,
    setSoundEnabled,
    setTutorialCompleted,
    saveActiveSession,
    clearActiveSession,
    saveLocalGameState,
  };
}

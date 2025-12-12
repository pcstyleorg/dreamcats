import { useQuery, useMutation } from "convex/react";
import { useConvexAuth } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useCallback, useEffect, useRef } from "react";
import { GameState } from "@/types";

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

/**
 * Hook to manage user preferences synced with Convex
 * Falls back to localStorage when not authenticated
 */
export function useUserPreferences() {
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  
  // Convex queries/mutations
  const preferences = useQuery(
    api.userPreferences.get,
    isAuthenticated ? {} : "skip"
  );
  const updatePreferences = useMutation(api.userPreferences.update);
  const setThemeMutation = useMutation(api.userPreferences.setTheme);
  const setLanguageMutation = useMutation(api.userPreferences.setLanguage);
  const setDisplayNameMutation = useMutation(api.userPreferences.setDisplayName);
  const setSoundEnabledMutation = useMutation(api.userPreferences.setSoundEnabled);
  const setActiveSessionMutation = useMutation(api.userPreferences.setActiveSession);
  const clearActiveSessionMutation = useMutation(api.userPreferences.clearActiveSession);
  const saveLocalGameStateMutation = useMutation(api.userPreferences.saveLocalGameState);

  // Track if we've synced local to remote
  const hasSyncedRef = useRef(false);

  // Sync localStorage preferences to Convex when user first authenticates
  useEffect(() => {
    if (isAuthenticated && preferences !== undefined && !hasSyncedRef.current) {
      hasSyncedRef.current = true;
      
      // If no remote preferences exist, sync from localStorage
      if (preferences === null) {
        const localTheme = localStorage.getItem("theme");
        const localLanguage = localStorage.getItem("i18nextLng");
        const localName = localStorage.getItem("playerName");
        const localSoundRaw = localStorage.getItem("soundEnabled");
        const localSound = localSoundRaw === null ? undefined : localSoundRaw !== "false";
        
        if (localTheme || localLanguage || localName) {
          updatePreferences({
            theme: localTheme || undefined,
            language: localLanguage || undefined,
            displayName: localName || undefined,
            soundEnabled: localSound,
          }).catch(console.error);
        }
      }
    }
  }, [isAuthenticated, preferences, updatePreferences]);

  // Apply remote preferences to local state when loaded
  useEffect(() => {
    if (preferences) {
      // Sync theme
      if (preferences.theme) {
        localStorage.setItem("theme", preferences.theme);
      }
      // Sync language
      if (preferences.language) {
        localStorage.setItem("i18nextLng", preferences.language);
      }
      // Sync display name
      if (preferences.displayName) {
        localStorage.setItem("playerName", preferences.displayName);
      }
      if (preferences.soundEnabled !== undefined) {
        localStorage.setItem("soundEnabled", String(preferences.soundEnabled));
      }
    }
  }, [preferences]);

  const setTheme = useCallback(
    async (theme: "light" | "dark") => {
      localStorage.setItem("theme", theme);
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("dreamcats-theme-changed", { detail: theme }),
        );
      }
      if (isAuthenticated) {
        try {
          await setThemeMutation({ theme });
        } catch (error) {
          console.error("Failed to save theme preference:", error);
        }
      }
    },
    [isAuthenticated, setThemeMutation]
  );

  const setLanguage = useCallback(
    async (language: string) => {
      localStorage.setItem("i18nextLng", language);
      if (isAuthenticated) {
        try {
          await setLanguageMutation({ language });
        } catch (error) {
          console.error("Failed to save language preference:", error);
        }
      }
    },
    [isAuthenticated, setLanguageMutation]
  );

  const setDisplayName = useCallback(
    async (name: string) => {
      localStorage.setItem("playerName", name);
      if (isAuthenticated) {
        try {
          await setDisplayNameMutation({ name });
        } catch (error) {
          console.error("Failed to save display name:", error);
        }
      }
    },
    [isAuthenticated, setDisplayNameMutation]
  );

  const setSoundEnabled = useCallback((enabled: boolean) => {
    localStorage.setItem("soundEnabled", String(enabled));
    if (isAuthenticated) {
      setSoundEnabledMutation({ enabled }).catch((error) =>
        console.error("Failed to save sound preference:", error),
      );
    }
  }, [isAuthenticated, setSoundEnabledMutation]);

  // Save active game session (for rejoin after refresh)
  const saveActiveSession = useCallback(
    async (session: { roomId: string; playerId: string; gameMode: "online" | "hotseat" }) => {
      // Always save to localStorage for immediate access
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
      
      if (isAuthenticated) {
        try {
          await setActiveSessionMutation({
            roomId: session.roomId,
            playerId: session.playerId,
            gameMode: session.gameMode,
          });
        } catch (error) {
          console.error("Failed to save active session:", error);
        }
      }
    },
    [isAuthenticated, setActiveSessionMutation]
  );

  // Clear active game session
  const clearActiveSession = useCallback(async () => {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    
    if (isAuthenticated) {
      try {
        await clearActiveSessionMutation();
      } catch (error) {
        console.error("Failed to clear active session:", error);
      }
    }
  }, [isAuthenticated, clearActiveSessionMutation]);

  // Save local game state (for hotseat resume)
  const saveLocalGameState = useCallback(
    async (gameState: GameState) => {
      // Always save to localStorage
      localStorage.setItem("dreamcats-local-game", JSON.stringify(gameState));
      
      if (isAuthenticated) {
        try {
          await saveLocalGameStateMutation({ gameState });
        } catch (error) {
          console.error("Failed to save local game state:", error);
        }
      }
    },
    [isAuthenticated, saveLocalGameStateMutation]
  );

  // Get active session (prefer remote if available)
  const getActiveSession = useCallback((): ActiveGameSession | null => {
    // First check remote preferences
    if (preferences?.activeRoomId || preferences?.activeGameMode) {
      return {
        roomId: preferences.activeRoomId,
        playerId: preferences.activePlayerId,
        gameMode: preferences.activeGameMode as "online" | "hotseat" | undefined,
        localGameState: preferences.localGameState as GameState | undefined,
      };
    }
    
    // Fall back to localStorage
    const localSession = localStorage.getItem(SESSION_STORAGE_KEY);
    if (localSession) {
      try {
        return JSON.parse(localSession) as ActiveGameSession;
      } catch {
        return null;
      }
    }
    
    // Check for local game state
    const localGame = localStorage.getItem("dreamcats-local-game");
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
  }, [preferences]);

  // Get current values (prefer remote if available, fallback to local)
  const displayName = preferences?.displayName ?? localStorage.getItem("playerName") ?? "";
  const theme = (preferences?.theme ?? localStorage.getItem("theme") ?? "light") as "light" | "dark";
  const language = preferences?.language ?? localStorage.getItem("i18nextLng") ?? "en";
  const soundEnabled = localStorage.getItem("soundEnabled") !== "false"; // default true
  const activeSession = getActiveSession();

  return {
    isLoading: authLoading || (isAuthenticated && preferences === undefined),
    displayName,
    theme,
    language,
    soundEnabled,
    activeSession,
    setTheme,
    setLanguage,
    setDisplayName,
    setSoundEnabled,
    saveActiveSession,
    clearActiveSession,
    saveLocalGameState,
  };
}

import { useQuery, useMutation } from "convex/react";
import { useConvexAuth } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useCallback, useEffect, useRef } from "react";

export interface UserPreferences {
  displayName?: string;
  theme?: "light" | "dark";
  language?: string;
}

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
        
        if (localTheme || localLanguage || localName) {
          updatePreferences({
            theme: localTheme || undefined,
            language: localLanguage || undefined,
            displayName: localName || undefined,
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
    }
  }, [preferences]);

  const setTheme = useCallback(
    async (theme: "light" | "dark") => {
      localStorage.setItem("theme", theme);
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

  // Get current values (prefer remote if available, fallback to local)
  const displayName = preferences?.displayName ?? localStorage.getItem("playerName") ?? "";
  const theme = (preferences?.theme ?? localStorage.getItem("theme") ?? "light") as "light" | "dark";
  const language = preferences?.language ?? localStorage.getItem("i18nextLng") ?? "en";

  return {
    isLoading: authLoading || (isAuthenticated && preferences === undefined),
    displayName,
    theme,
    language,
    setTheme,
    setLanguage,
    setDisplayName,
  };
}

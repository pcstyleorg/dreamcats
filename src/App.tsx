import { useEffect, useState, Suspense, lazy } from 'react';
import { useGame } from '@/state/useGame';
import { Toaster } from "@/components/ui/sonner"
import { TutorialProvider } from './context/TutorialContext';
import { ThemeToggle } from './components/ThemeToggle';
import { LanguageSwitcher } from './components/LanguageSwitcher';
import { SoundToggle } from './components/SoundToggle';
import { OfflineBanner } from './components/OfflineBanner';
import { InstallPrompt } from './components/InstallPrompt';
import { useUserPreferences } from './hooks/useUserPreferences';
import { useSessionPersistence } from './hooks/useSessionPersistence';
import './i18n/config';
import { ConvexSync } from "@/state/ConvexSync";
import { safeLocalStorage } from "@/lib/storage";
import { toast } from "sonner";

const LandingPage = lazy(() =>
  import('./components/LandingPage').then((m) => ({ default: m.LandingPage })),
);
const LobbyScreen = lazy(() =>
  import('./components/LobbyScreen').then((m) => ({ default: m.LobbyScreen })),
);
const Gameboard = lazy(() =>
  import('./components/Gameboard').then((m) => ({ default: m.Gameboard })),
);
const Tutorial = lazy(() =>
  import('./components/Tutorial').then((m) => ({ default: m.Tutorial })),
);

function App() {
  const { state } = useGame();
  const [hasEntered, setHasEntered] = useState(false);
  const { theme, setTheme: saveTheme } = useUserPreferences();
  const [localTheme, setLocalTheme] = useState<'light' | 'dark'>('light');

  // DEBUG: Capture navigation events on production
  useEffect(() => {
    if (import.meta.env.PROD) {
      const logEvent = (type: string, data?: any) => {
        console.log(`[NAV-DEBUG ${new Date().toISOString()}] ${type}`, data);
      };

      logEvent("App mounted", {
        url: window.location.href,
        hasEntered,
        queryParams: window.location.search
      });

      // Capture beforeunload
      const beforeUnloadHandler = (e: BeforeUnloadEvent) => {
        logEvent("beforeunload triggered", {
          returnValue: e.returnValue,
          stack: new Error().stack
        });
      };

      // Capture location changes
      const originalPushState = history.pushState;
      const originalReplaceState = history.replaceState;

      history.pushState = function(...args) {
        logEvent("history.pushState", { url: args[2], state: args[0] });
        return originalPushState.apply(this, args);
      };

      history.replaceState = function(...args) {
        logEvent("history.replaceState", { url: args[2], state: args[0] });
        return originalReplaceState.apply(this, args);
      };

      window.addEventListener("beforeunload", beforeUnloadHandler);
      window.addEventListener("popstate", () => logEvent("popstate"));

      return () => {
        window.removeEventListener("beforeunload", beforeUnloadHandler);
        history.pushState = originalPushState;
        history.replaceState = originalReplaceState;
      };
    }
  }, [hasEntered]);

  // Track active game sessions for rejoin
  useSessionPersistence();

  // Initialize theme from preferences
  useEffect(() => {
    setLocalTheme(theme);
  }, [theme]);

  useEffect(() => {
    const handler = (event: Event) => {
      const nextTheme =
        (event as CustomEvent).detail ??
        ((safeLocalStorage.getItem("theme") ?? "light") as "light" | "dark");
      setLocalTheme((prev) => (prev === nextTheme ? prev : nextTheme));
    };
    window.addEventListener("dreamcats-theme-changed", handler as EventListener);
    return () => {
      window.removeEventListener("dreamcats-theme-changed", handler as EventListener);
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (localTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [localTheme]);

  const toggleTheme = () => {
    const newTheme = localTheme === 'light' ? 'dark' : 'light';
    setLocalTheme(newTheme);
    saveTheme(newTheme);
  };

  // auth is optional; landing is always reachable
  const showLanding = !hasEntered;
  const showLobby = hasEntered && state.gamePhase === 'lobby';
  const showGameboard = hasEntered && state.gamePhase !== 'lobby';

  const handleEntered = () => {
    if (import.meta.env.PROD) {
      console.log("[NAV-DEBUG] handleEntered called BEFORE setState", {
        timestamp: new Date().toISOString(),
        url: window.location.href,
        currentHasEnteredState: hasEntered,
        gamePhase: state.gamePhase
      });
    }

    setHasEntered(true);

    if (import.meta.env.PROD) {
      console.log("[NAV-DEBUG] setHasEntered(true) called");
    }
  };

  // Track hasEntered state changes
  useEffect(() => {
    if (import.meta.env.PROD) {
      console.log("[NAV-DEBUG] hasEntered changed to:", hasEntered, {
        timestamp: new Date().toISOString(),
        showLanding,
        showLobby,
        showGameboard,
        gamePhase: state.gamePhase
      });
    }
  }, [hasEntered]);

  // Track render state
  useEffect(() => {
    if (import.meta.env.PROD) {
      console.log("[NAV-DEBUG] Render state:", {
        timestamp: new Date().toISOString(),
        hasEntered,
        showLanding,
        showLobby,
        showGameboard,
        gamePhase: state.gamePhase
      });
    }
  }, [hasEntered, showLanding, showLobby, showGameboard, state.gamePhase]);


  // Guard against accidental full-page navigation caused by form submits on the landing screen.
  // This can happen if some embedded widget or browser feature wraps content in a <form>.
  useEffect(() => {
    if (!showLanding) return;

    const submitHandler = (event: Event) => {
      const landingRoot = document.getElementById("landing-root");
      const target = event.target;
      if (!landingRoot || !(target instanceof Element) || !landingRoot.contains(target)) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      toast.error("Navigation prevented (unexpected form submit).");

      if (import.meta.env.PROD) {
        console.log("[NAV-DEBUG] Form submit prevented", {
          target: event.target,
          timestamp: new Date().toISOString()
        });
      }
    };

    // Prevent Analytics scripts from hijacking navigation during landing interactions
    const clickHandler = (event: MouseEvent) => {
      const landingRoot = document.getElementById("landing-root");
      if (!landingRoot || !event.target || !landingRoot.contains(event.target as Node)) {
        return;
      }

      // Check if this is a navigation attempt by third-party scripts
      const target = event.target as HTMLElement;
      if (target.tagName === 'A' && (target as HTMLAnchorElement).href === window.location.href) {
        if (import.meta.env.PROD) {
          console.log("[NAV-DEBUG] Preventing same-page anchor navigation", {
            href: (target as HTMLAnchorElement).href,
            timestamp: new Date().toISOString()
          });
        }
        event.preventDefault();
        event.stopPropagation();
      }
    };

    document.addEventListener("submit", submitHandler, true);
    document.addEventListener("click", clickHandler, true);

    return () => {
      document.removeEventListener("submit", submitHandler, true);
      document.removeEventListener("click", clickHandler, true);
    };
  }, [showLanding]);

  return (
    <Suspense fallback={<div className="h-dvh bg-background flex items-center justify-center"><div className="text-foreground">Loading...</div></div>}>
      <TutorialProvider>
        <div className="bg-background w-full min-h-dvh">
          <main className="font-sans bg-background text-foreground transition-colors relative flex flex-col w-full min-h-dvh">
            {/* Rejoin logic moved to LandingPage */}
            <ConvexSync />
            <OfflineBanner />
            <InstallPrompt />
            {!showGameboard && (
              <div className="fixed top-3 sm:top-4 right-3 sm:right-4 z-50 flex gap-2">
                <LanguageSwitcher />
                <SoundToggle />
                <ThemeToggle theme={localTheme} onToggle={toggleTheme} />
              </div>
            )}
            {showLanding && (
              <div key="landing" className="flex-1 w-full min-h-dvh">
                <LandingPage onEnter={handleEntered} />
              </div>
            )}
            {showLobby && (
              <div key="lobby" className="flex-1 w-full min-h-dvh">
                <LobbyScreen />
              </div>
            )}
            {showGameboard && (
              <div key="gameboard" className="flex-1 w-full min-h-dvh">
                <Gameboard theme={localTheme} toggleTheme={toggleTheme} />
              </div>
            )}

            <Toaster richColors theme={localTheme} />
            {hasEntered && <Tutorial />}
          </main>
        </div>
      </TutorialProvider>
    </Suspense>
  );
}

export default App;

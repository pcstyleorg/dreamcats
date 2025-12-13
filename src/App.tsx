import { useEffect, useState, Suspense, lazy } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useGame } from '@/state/useGame';
import { Toaster } from "@/components/ui/sonner"
import { TutorialProvider } from './context/TutorialContext';
import { ThemeToggle } from './components/ThemeToggle';
import { LanguageSwitcher } from './components/LanguageSwitcher';
import { AuthButton } from './components/AuthDialog';
import { useUserPreferences } from './hooks/useUserPreferences';
import { useSessionPersistence } from './hooks/useSessionPersistence';
import './i18n/config';
import { ConvexSync } from "@/state/ConvexSync";
import { safeLocalStorage } from "@/lib/storage";

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

  return (
    <Suspense fallback={<div className="h-dvh bg-background flex items-center justify-center"><div className="text-foreground">Loading...</div></div>}>
      <TutorialProvider>
        <div className="bg-background w-full min-h-dvh">
          <main className="font-sans bg-background text-foreground transition-colors relative flex flex-col w-full min-h-dvh">
            {/* Rejoin logic moved to LandingPage */}
            <ConvexSync />
            {!showGameboard && (
              <div className="fixed top-3 sm:top-4 right-3 sm:right-4 z-50 flex gap-2">
                <AuthButton />
                <LanguageSwitcher />
                <ThemeToggle theme={localTheme} onToggle={toggleTheme} />
              </div>
            )}
            <AnimatePresence mode="wait">
              {showLanding && (
                <motion.div key="landing" className="flex-1 w-full min-h-dvh" exit={{ opacity: 0, transition: { duration: 0.5 } }}>
                  <LandingPage onEnter={() => setHasEntered(true)} />
                </motion.div>
              )}
              {showLobby && (
                <motion.div key="lobby" className="flex-1 w-full min-h-dvh" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
                  <LobbyScreen />
                </motion.div>
              )}
              {showGameboard && (
                <motion.div key="gameboard" className="flex-1 w-full min-h-dvh" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
                  <Gameboard theme={localTheme} toggleTheme={toggleTheme} />
                </motion.div>
              )}
            </AnimatePresence>

            <Toaster richColors theme={localTheme} />
            {hasEntered && <Tutorial />}
          </main>
        </div>
      </TutorialProvider>
    </Suspense>
  );
}

export default App;

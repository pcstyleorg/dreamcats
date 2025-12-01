import { useEffect, useState, Suspense } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useGame } from '@/state/useGame';
import { LobbyScreen } from './components/LobbyScreen';
import { Gameboard } from './components/Gameboard';
import { Toaster } from "@/components/ui/sonner"
import { TutorialProvider } from './context/TutorialContext';
import { Tutorial } from './components/Tutorial';
import { LandingPage } from './components/LandingPage';
import { ThemeToggle } from './components/ThemeToggle';
import { LanguageSwitcher } from './components/LanguageSwitcher';
import './i18n/config';
import { ConvexSync } from "@/state/ConvexSync";

function App() {
  const { state } = useGame();
  const [hasEntered, setHasEntered] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const stored = localStorage.getItem('theme');
    if (stored === 'light' || stored === 'dark') {
      setTheme(stored);
      return;
    }
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setTheme(prefersDark ? 'dark' : 'light');
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));

  const showLanding = !hasEntered;
  const showLobby = hasEntered && state.gamePhase === 'lobby';
  const showGameboard = hasEntered && state.gamePhase !== 'lobby';
  const inGame = showGameboard;

  // Lock body scroll during gameplay to avoid accidental vertical scroll in split view
  useEffect(() => {
    const body = document.body;
    if (inGame) {
      body.classList.add('game-scroll-lock');
    } else {
      body.classList.remove('game-scroll-lock');
    }
    return () => body.classList.remove('game-scroll-lock');
  }, [inGame]);

  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><div className="text-foreground">Loading...</div></div>}>
      <TutorialProvider>
        <main className={`font-sans bg-background text-foreground min-h-[100dvh] ${inGame ? "h-[100dvh] overflow-x-hidden overflow-y-auto" : "overflow-x-hidden overflow-y-auto"} transition-colors relative flex flex-col`}>
          <ConvexSync />
          {!showGameboard && (
            <div className="fixed top-3 sm:top-4 right-3 sm:right-4 z-50 flex gap-2">
              <LanguageSwitcher />
              <ThemeToggle theme={theme} onToggle={toggleTheme} />
            </div>
          )}
          <AnimatePresence mode="wait">
            {showLanding && (
              <motion.div key="landing" className="flex-1 w-full h-full" exit={{ opacity: 0, transition: { duration: 0.5 } }}>
                <LandingPage onEnter={() => setHasEntered(true)} />
              </motion.div>
            )}
            {showLobby && (
              <motion.div key="lobby" className="flex-1 w-full h-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
                <LobbyScreen />
              </motion.div>
            )}
            {showGameboard && (
              <motion.div key="gameboard" className="flex-1 w-full h-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
                <Gameboard theme={theme} toggleTheme={toggleTheme} />
              </motion.div>
            )}
          </AnimatePresence>

          <Toaster richColors theme={theme} />
          {hasEntered && <Tutorial />}
        </main>
      </TutorialProvider>
    </Suspense>
  );
}

export default App;

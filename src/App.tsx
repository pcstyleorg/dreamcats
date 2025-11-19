import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useGame } from './context/GameContext';
import { LobbyScreen } from './components/LobbyScreen';
import { Gameboard } from './components/Gameboard';
import { Toaster } from "@/components/ui/sonner"
import { TutorialProvider } from './context/TutorialContext';
import { Tutorial } from './components/Tutorial';
import { LandingPage } from './components/LandingPage';
import { ThemeToggle } from './components/ThemeToggle';
import { LanguageToggle } from './components/LanguageToggle';

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

  return (
    <TutorialProvider>
      <main className="font-sans bg-background text-foreground min-h-screen transition-colors relative">
          <div className="fixed top-3 right-3 z-50 flex gap-2">
            <LanguageToggle />
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
          </div>
          <AnimatePresence mode="wait">
            {showLanding && (
                 <motion.div key="landing" exit={{ opacity: 0, transition: { duration: 0.5 } }}>
                    <LandingPage onEnter={() => setHasEntered(true)} />
                </motion.div>
            )}
            {showLobby && (
                 <motion.div key="lobby" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
                    <LobbyScreen />
                </motion.div>
            )}
            {showGameboard && (
                 <motion.div key="gameboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
                  <Gameboard />
                </motion.div>
            )}
          </AnimatePresence>

          <Toaster richColors theme={theme} />
          {hasEntered && <Tutorial />}
      </main>
    </TutorialProvider>
  );
}

export default App;

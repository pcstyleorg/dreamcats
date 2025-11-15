import { useState } from 'react';
import { useGame } from './context/GameContext';
import { LobbyScreen } from './components/LobbyScreen';
import { Gameboard } from './components/Gameboard';
import { Toaster } from "@/components/ui/sonner"
import { TutorialProvider } from './context/TutorialContext';
import { Tutorial } from './components/Tutorial';
import { LandingPage } from './components/LandingPage';
import { AnimatePresence, motion } from 'framer-motion';

function App() {
  const { state } = useGame();
  const [hasEntered, setHasEntered] = useState(false);

  const showLanding = !hasEntered;
  const showLobby = hasEntered && state.gamePhase === 'lobby';
  const showGameboard = hasEntered && state.gamePhase !== 'lobby';

  return (
    <TutorialProvider>
      <main className="font-sans bg-background min-h-screen">
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
          
          <Toaster richColors theme="light" />
          {hasEntered && <Tutorial />}
      </main>
    </TutorialProvider>
  );
}

export default App;

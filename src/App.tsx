import { useGame } from './context/GameContext';
import { LobbyScreen } from './components/LobbyScreen';
import { Gameboard } from './components/Gameboard';
import { Toaster } from "@/components/ui/sonner"
import { TutorialProvider } from './context/TutorialContext';
import { Tutorial } from './components/Tutorial';

function App() {
  const { state } = useGame();

  return (
    <TutorialProvider>
      <main className="font-sans bg-gradient-to-br from-gray-900 via-purple-950 to-indigo-950 min-h-screen">
          {state.gamePhase === 'lobby' ? <LobbyScreen /> : <Gameboard />}
          <Toaster richColors theme="dark" />
          <Tutorial />
      </main>
    </TutorialProvider>
  );
}

export default App;

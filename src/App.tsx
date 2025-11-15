import { useGame } from './context/GameContext';
import { LobbyScreen } from './components/LobbyScreen';
import { Gameboard } from './components/Gameboard';
import { Toaster } from "@/components/ui/sonner"

function App() {
  const { state } = useGame();

  return (
    <main className="font-sans bg-gradient-to-br from-gray-900 via-purple-950 to-indigo-950 min-h-screen">
        {state.gamePhase === 'lobby' ? <LobbyScreen /> : <Gameboard />}
        <Toaster richColors theme="dark" />
    </main>
  );
}

export default App;

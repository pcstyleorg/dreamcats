import { useGame } from './context/GameContext';
import { LobbyScreen } from './components/LobbyScreen';
import { Gameboard } from './components/Gameboard';
import { Toaster } from "@/components/ui/sonner"

function App() {
  const { state } = useGame();

  return (
    <>
        {state.gamePhase === 'lobby' ? <LobbyScreen /> : <Gameboard />}
        <Toaster richColors />
    </>
  );
}

export default App;

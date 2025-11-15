import { useGame } from '@/context/GameContext';
import { Button } from './ui/button';
import { Zap } from 'lucide-react';

export const GameActions = () => {
    const { state, broadcastAction, myPlayerId } = useGame();
    const { gamePhase, peekingState, drawnCard, gameMode, currentPlayerIndex } = state;

    const currentPlayer = state.players[currentPlayerIndex];
    const isMyTurn = gameMode === 'online' ? currentPlayer?.id === myPlayerId : true;
    const amICurrentPeeker = gamePhase === 'peeking' && peekingState?.playerIndex === state.players.findIndex(p => p.id === myPlayerId);

    const handleFinishPeeking = () => {
        if (peekingState?.peekedCount === 2) {
            broadcastAction({ type: 'FINISH_PEEKING' });
        }
    };
    
    const handlePobudka = () => {
        if (isMyTurn && gamePhase === 'playing') {
            broadcastAction({ type: 'CALL_POBUDKA' });
        }
    }

    const canUseSpecial = drawnCard?.isSpecial && gamePhase === 'holding_card';
    const mustSwap = gamePhase === 'holding_card' && drawnCard ? !drawnCard.isSpecial : false;

    if ((gameMode === 'hotseat' || amICurrentPeeker) && gamePhase === 'peeking' && peekingState && peekingState.playerIndex === state.players.findIndex(p => p.id === state.players[peekingState.playerIndex].id)) {
        return (
            <Button 
                onClick={handleFinishPeeking} 
                disabled={peekingState?.peekedCount !== 2}
                className="w-auto"
            >
                Finish Peeking
            </Button>
        );
    }

    if (gamePhase === 'playing' && isMyTurn) {
        return (
            <div data-tutorial-id="pobudka-button">
                <Button onClick={handlePobudka} className="w-auto bg-red-700 hover:bg-red-800 text-white font-bold">POBUDKA!</Button>
            </div>
        );
    }

    if (gamePhase === 'holding_card' && isMyTurn) {
        return (
            <div className="flex gap-2">
                <Button onClick={() => broadcastAction({ type: 'DISCARD_HELD_CARD' })} disabled={mustSwap}>Discard</Button>
                <Button variant="secondary" onClick={() => broadcastAction({ type: 'USE_SPECIAL_ACTION' })} disabled={!canUseSpecial}><Zap className="mr-2 h-4 w-4" />Action</Button>
            </div>
        );
    }

    return null;
}

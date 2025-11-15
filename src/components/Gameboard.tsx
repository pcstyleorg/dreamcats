import React from 'react';
import { useGame } from '@/context/GameContext';
import { PlayerHand } from './PlayerHand';
import { GameCard } from './Card';
import { Button } from './ui/button';
import { Scoreboard } from './Scoreboard';
import { Separator } from './ui/separator';
import { toast } from 'sonner';
import { Copy, RefreshCw } from 'lucide-react';
import { ActionModal } from './ActionModal';

export const Gameboard: React.FC = () => {
  const { state, myPlayerId, broadcastAction } = useGame();
  const { players, currentPlayerIndex, drawPile, discardPile, gamePhase, actionMessage, peekingState, roomId, drawnCard } = state;

  if (!myPlayerId || players.length === 0) {
    return (
        <div className="w-full min-h-screen flex items-center justify-center">
            <p>Loading game...</p>
        </div>
    );
  }

  const me = players.find(p => p.id === myPlayerId);
  const opponent = players.find(p => p.id !== myPlayerId);

  const isMyTurn = players[currentPlayerIndex]?.id === myPlayerId;
  const amICurrentPeeker = gamePhase === 'peeking' && peekingState?.playerIndex === players.findIndex(p => p.id === myPlayerId);

  const handleFinishPeeking = () => {
    if (peekingState?.peekedCount === 2) {
      broadcastAction({ type: 'FINISH_PEEKING' });
    }
  };

  const handleDrawFromDeck = () => {
    if (isMyTurn && gamePhase === 'playing') {
      broadcastAction({ type: 'DRAW_FROM_DECK' });
    }
  };

  const handleDrawFromDiscard = () => {
    if (isMyTurn && gamePhase === 'playing') {
      broadcastAction({ type: 'DRAW_FROM_DISCARD' });
    }
  };

  const handlePobudka = () => {
    if (isMyTurn && gamePhase === 'playing') {
        broadcastAction({ type: 'CALL_POBUDKA' });
    }
  }
  
  const copyRoomId = () => {
    if(roomId) {
        navigator.clipboard.writeText(roomId);
        toast.success("Room ID copied to clipboard!");
    }
  }

  const canUseSpecial = drawnCard?.isSpecial && gamePhase === 'holding_card';
  const mustSwap = gamePhase === 'holding_card' && !drawnCard?.isSpecial;

  return (
    <div className="w-full min-h-screen bg-background text-foreground p-4 flex flex-col lg:flex-row gap-4">
      <main className="flex-grow flex flex-col">
        {/* Opponent Area */}
        <div className="flex justify-around items-start mb-4 h-48">
          {opponent ? (
            <PlayerHand player={opponent} isCurrentPlayer={players[currentPlayerIndex]?.id === opponent.id} isOpponent={true} />
          ) : (
            <div className="flex items-center justify-center h-full w-full rounded-lg bg-secondary/50 border-2 border-dashed">
                <p className="text-muted-foreground">Waiting for opponent...</p>
            </div>
          )}
        </div>

        {/* Center Area */}
        <div className="flex-grow flex items-center justify-center gap-8 my-8">
          <div className="flex flex-col items-center">
            <GameCard card={null} isFaceUp={false} className={isMyTurn && gamePhase === 'playing' ? 'cursor-pointer hover:scale-105' : ''} onClick={handleDrawFromDeck} />
            <span className="mt-2 text-sm font-medium">Draw Pile ({drawPile.length})</span>
          </div>
          {drawnCard && isMyTurn && gamePhase === 'holding_card' && (
             <div className="flex flex-col items-center">
                <p className="mb-2 font-semibold">Your Card</p>
                <GameCard card={drawnCard} isFaceUp={true} />
                <div className="flex gap-2 mt-2">
                    <Button size="sm" onClick={() => broadcastAction({ type: 'DISCARD_HELD_CARD' })} disabled={mustSwap}>Discard</Button>
                    <Button size="sm" variant="secondary" onClick={() => broadcastAction({ type: 'USE_SPECIAL_ACTION' })} disabled={!canUseSpecial}>Use Action</Button>
                </div>
             </div>
          )}
          <div className="flex flex-col items-center">
            <GameCard card={discardPile.length > 0 ? discardPile[discardPile.length - 1] : null} isFaceUp={true} className={isMyTurn && gamePhase === 'playing' ? 'cursor-pointer hover:scale-105' : ''} onClick={handleDrawFromDiscard} />
            <span className="mt-2 text-sm font-medium">Discard Pile</span>
          </div>
        </div>

        {/* Current Player Area */}
        {me && (
          <div className="mt-auto">
            <PlayerHand player={me} isCurrentPlayer={isMyTurn} />
          </div>
        )}
      </main>

      {/* Side Panel */}
      <aside className="w-full lg:w-80 lg:max-w-xs flex-shrink-0 bg-card p-4 rounded-lg border">
        <h2 className="text-2xl font-bold mb-2 text-center">Sen Game</h2>
        {roomId && (
            <div className="flex items-center justify-center gap-2 mb-2 text-sm text-muted-foreground">
                <span>Room ID: {roomId}</span>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={copyRoomId}>
                    <Copy className="h-4 w-4" />
                </Button>
            </div>
        )}
        <Separator />
        <div className="my-4 p-3 bg-secondary rounded-md min-h-[60px]">
            <h4 className="font-semibold mb-1">Action Log</h4>
            <p className="text-sm text-secondary-foreground">{actionMessage}</p>
        </div>
        
        {amICurrentPeeker && (
            <Button 
                onClick={handleFinishPeeking} 
                disabled={peekingState?.peekedCount !== 2}
                className="w-full"
            >
                Finish Peeking
            </Button>
        )}

        {gamePhase === 'playing' && isMyTurn && (
            <Button onClick={handlePobudka} className="w-full mt-4 bg-red-600 hover:bg-red-700">POBUDKA!</Button>
        )}

        <Separator className="my-4" />
        <Scoreboard players={players} />
      </aside>
      <ActionModal />
    </div>
  );
};

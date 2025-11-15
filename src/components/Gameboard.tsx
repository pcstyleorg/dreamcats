import React from 'react';
import { useGame } from '@/context/GameContext';
import { PlayerHand } from './PlayerHand';
import { GameCard } from './Card';
import { Button } from './ui/button';
import { Scoreboard } from './Scoreboard';
import { Separator } from './ui/separator';
import { toast } from 'sonner';
import { Copy, Users, Wifi, Zap } from 'lucide-react';
import { ActionModal } from './ActionModal';

export const Gameboard: React.FC = () => {
  const { state, myPlayerId, broadcastAction } = useGame();
  const { players, currentPlayerIndex, drawPile, discardPile, gamePhase, actionMessage, peekingState, roomId, drawnCard, gameMode } = state;

  if (players.length === 0) {
    return (
        <div className="w-full min-h-screen flex items-center justify-center font-heading">
            <p>Loading game...</p>
        </div>
    );
  }

  const currentPlayer = players[currentPlayerIndex];
  const otherPlayer = players.length > 1 ? players[(currentPlayerIndex + 1) % players.length] : null;

  const isMyTurn = gameMode === 'online' ? currentPlayer?.id === myPlayerId : true;
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
  const mustSwap = gamePhase === 'holding_card' && drawnCard && !drawnCard.isSpecial;
  const isPlayerActionable = isMyTurn && gamePhase === 'playing';

  return (
    <div className="w-full min-h-screen text-foreground p-2 sm:p-4 flex flex-col lg:flex-row gap-4">
      <main className="flex-grow flex flex-col">
        {/* Opponent Area */}
        <div className="flex justify-center items-start mb-4 h-48">
          {otherPlayer ? (
            <PlayerHand player={otherPlayer} isCurrentPlayer={false} isOpponent={true} />
          ) : (
            <div className="flex items-center justify-center h-full w-full rounded-lg bg-black/20 border-2 border-dashed border-white/10">
                <p className="text-muted-foreground font-heading">Waiting for opponent...</p>
            </div>
          )}
        </div>

        {/* Center Area */}
        <div className="flex-grow flex items-center justify-center gap-4 md:gap-8 my-4 md:my-8">
          <div className="flex flex-col items-center">
            <GameCard card={null} isFaceUp={false} className={isPlayerActionable ? 'cursor-pointer' : ''} onClick={handleDrawFromDeck} isGlowing={isPlayerActionable} />
            <span className="mt-2 text-sm font-medium">Draw ({drawPile.length})</span>
          </div>
          {drawnCard && isMyTurn && gamePhase === 'holding_card' && (
             <div className="flex flex-col items-center animate-in fade-in zoom-in">
                <p className="mb-2 font-semibold font-heading">Your Card</p>
                <GameCard card={drawnCard} isFaceUp={true} isGlowing />
                <div className="flex gap-2 mt-2">
                    <Button size="sm" onClick={() => broadcastAction({ type: 'DISCARD_HELD_CARD' })} disabled={mustSwap}>Discard</Button>
                    <Button size="sm" variant="secondary" onClick={() => broadcastAction({ type: 'USE_SPECIAL_ACTION' })} disabled={!canUseSpecial}><Zap className="mr-2 h-4 w-4" />Action</Button>
                </div>
             </div>
          )}
          <div className="flex flex-col items-center">
            <GameCard card={discardPile.length > 0 ? discardPile[discardPile.length - 1] : null} isFaceUp={true} className={isPlayerActionable ? 'cursor-pointer' : ''} onClick={handleDrawFromDiscard} isGlowing={isPlayerActionable && discardPile.length > 0} />
            <span className="mt-2 text-sm font-medium">Discard</span>
          </div>
        </div>

        {/* Current Player Area */}
        {currentPlayer && (
          <div className="mt-auto">
            <PlayerHand player={currentPlayer} isCurrentPlayer={true} />
          </div>
        )}
      </main>

      {/* Side Panel */}
      <aside className="w-full lg:w-80 lg:max-w-xs flex-shrink-0 bg-card/50 backdrop-blur-sm p-4 rounded-lg border">
        <h2 className="text-2xl font-bold mb-2 text-center font-heading">Sen Game</h2>
        {gameMode === 'online' && roomId && (
            <div className="flex items-center justify-center gap-2 mb-2 text-sm text-muted-foreground">
                <Wifi className="w-4 h-4" />
                <span>{roomId}</span>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={copyRoomId}>
                    <Copy className="h-4 w-4" />
                </Button>
            </div>
        )}
        {gameMode === 'hotseat' && (
            <div className="flex items-center justify-center gap-2 mb-2 text-sm text-muted-foreground">
                <Users className="w-4 h-4" />
                <span>Local Game</span>
            </div>
        )}
        <Separator />
        <div className="my-4 p-3 bg-black/20 rounded-md min-h-[60px]">
            <h4 className="font-semibold mb-1 font-heading">Action Log</h4>
            <p className="text-sm text-secondary-foreground">{actionMessage}</p>
        </div>
        
        {(gameMode === 'hotseat' || amICurrentPeeker) && gamePhase === 'peeking' && peekingState?.playerIndex === currentPlayerIndex && (
            <Button 
                onClick={handleFinishPeeking} 
                disabled={peekingState?.peekedCount !== 2}
                className="w-full"
            >
                Finish Peeking
            </Button>
        )}

        {gamePhase === 'playing' && isMyTurn && (
            <Button onClick={handlePobudka} className="w-full mt-4 bg-red-700 hover:bg-red-800 text-white font-bold">POBUDKA!</Button>
        )}

        <Separator className="my-4" />
        <Scoreboard players={players} />
      </aside>
      <ActionModal />
    </div>
  );
};

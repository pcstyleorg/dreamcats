import React from 'react';
import { useGame } from '@/context/GameContext';
import { PlayerHand } from './PlayerHand';
import { GameCard } from './Card';
import { Button } from './ui/button';
import { Scoreboard } from './Scoreboard';
import { Separator } from './ui/separator';
import { toast } from 'sonner';
import { Copy, Menu, Users, Wifi } from 'lucide-react';
import { ActionModal } from './ActionModal';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from './ui/sheet';
import { ChatBox } from './ChatBox';
import { GameActions } from './GameActions';
import { ScrollArea } from './ui/scroll-area';
import { AnimatePresence, motion } from 'framer-motion';

export const Gameboard: React.FC = () => {
  const { state, myPlayerId, broadcastAction, playSound } = useGame();
  const { players, currentPlayerIndex, drawPile, discardPile, gamePhase, actionMessage, roomId, drawnCard, gameMode } = state;

  if (players.length === 0) {
    return (
        <div className="w-full min-h-screen flex items-center justify-center font-heading">
            <p>Loading game...</p>
        </div>
    );
  }

  const currentPlayer = players[currentPlayerIndex];
  const otherPlayer = players.length > 1 ? players.find(p => p.id !== currentPlayer.id) : null;

  const isMyTurn = gameMode === 'online' ? currentPlayer?.id === myPlayerId : true;
  
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
  
  const copyRoomId = () => {
    if(roomId) {
        navigator.clipboard.writeText(roomId);
        toast.success("Room ID copied to clipboard!");
    }
  }

  const isPlayerActionable = isMyTurn && gamePhase === 'playing';

  const SidePanelContent = () => (
    <>
        <div className="my-4 p-3 bg-black/5 rounded-md min-h-[60px]">
            <h4 className="font-semibold mb-1 font-heading">Action Log</h4>
            <p className="text-sm text-muted-foreground">{actionMessage}</p>
        </div>
        
        <Separator className="my-4" />
        <div data-tutorial-id="scoreboard">
          <Scoreboard players={players} />
        </div>
        {gameMode === 'online' && (
            <>
                <Separator className="my-4" />
                <div className="h-64">
                    <ChatBox />
                </div>
            </>
        )}
    </>
  );

  return (
    <div className="w-full min-h-screen text-foreground p-2 sm:p-4 flex flex-col lg:flex-row gap-4 relative">
      <main className="flex-grow flex flex-col">
        {/* Opponent Area */}
        <div className="flex justify-center items-start mb-4 h-36 md:h-48">
          {otherPlayer ? (
            <PlayerHand player={otherPlayer} isCurrentPlayer={false} isOpponent={true} playSound={playSound} />
          ) : (
            <div className="flex items-center justify-center h-full w-full rounded-lg bg-black/5 border-2 border-dashed border-black/10">
                <p className="text-muted-foreground font-heading">Waiting for opponent...</p>
            </div>
          )}
        </div>

        {/* Center Area */}
        <div className="flex-grow flex items-center justify-center gap-4 md:gap-8 my-4" data-tutorial-id="piles">
          <div className="flex flex-col items-center" data-tutorial-id="draw-pile">
            <GameCard card={null} isFaceUp={false} className={isPlayerActionable ? 'cursor-pointer' : ''} onClick={handleDrawFromDeck} isGlowing={isPlayerActionable} playSound={playSound} />
            <span className="mt-2 text-xs md:text-sm font-medium">Draw ({drawPile.length})</span>
          </div>
          
          <AnimatePresence>
            {drawnCard && isMyTurn && gamePhase === 'holding_card' && (
             <motion.div 
                className="flex flex-col items-center"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                transition={{ duration: 0.3 }}
              >
                <p className="mb-2 text-sm font-semibold font-heading">Your Card</p>
                <GameCard card={drawnCard} isFaceUp={true} isGlowing />
             </motion.div>
            )}
          </AnimatePresence>
          
          <div className="flex flex-col items-center" data-tutorial-id="discard-pile">
            <GameCard card={discardPile.length > 0 ? discardPile[discardPile.length - 1] : null} isFaceUp={true} className={isPlayerActionable ? 'cursor-pointer' : ''} onClick={handleDrawFromDiscard} isGlowing={isPlayerActionable && discardPile.length > 0} playSound={playSound} />
            <span className="mt-2 text-xs md:text-sm font-medium">Discard</span>
          </div>
        </div>

        {/* Current Player Area */}
        {currentPlayer && (
          <div className="mt-auto">
            <div data-tutorial-id="player-hand">
              <PlayerHand player={currentPlayer} isCurrentPlayer={true} playSound={playSound} />
            </div>
            <div className="flex justify-center mt-4 h-10" data-tutorial-id="game-actions">
              <GameActions />
            </div>
          </div>
        )}
      </main>

      {/* Side Panel - Desktop */}
      <aside className="hidden lg:flex w-full lg:w-80 lg:max-w-xs flex-shrink-0 bg-card/60 backdrop-blur-sm p-4 rounded-lg border shadow-soft-lg flex-col">
        <h2 className="text-2xl font-bold mb-2 text-center font-heading">Sen</h2>
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
        <SidePanelContent />
      </aside>

      {/* Side Panel Trigger - Mobile */}
      <div className="lg:hidden absolute top-4 right-4">
        <Sheet>
            <SheetTrigger asChild>
                <Button variant="outline" size="icon">
                    <Menu />
                </Button>
            </SheetTrigger>
            <SheetContent className="bg-background/80 backdrop-blur-lg">
                <SheetHeader>
                    <SheetTitle className="font-heading text-2xl">Game Menu</SheetTitle>
                </SheetHeader>
                <ScrollArea className="h-[calc(100%-4rem)] pr-4">
                    <SidePanelContent />
                </ScrollArea>
            </SheetContent>
        </Sheet>
      </div>

      <ActionModal />
    </div>
  );
};

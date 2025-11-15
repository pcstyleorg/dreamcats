import React from 'react';
import { useGame } from '@/context/GameContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from './ui/button';
import { GameCard } from './Card';
import { Card as CardType } from '@/types';

export const ActionModal: React.FC = () => {
  const { state, broadcastAction } = useGame();
  const { gamePhase, tempCards, lastRoundScores, gameWinnerName, players } = state;

  const handleTake2Choose = (card: CardType) => {
    broadcastAction({ type: 'ACTION_TAKE_2_CHOOSE', payload: { card } });
  };

  const handleNewRound = () => {
    broadcastAction({ type: 'START_NEW_ROUND' });
  }

  const renderTake2Content = () => (
    <>
      <DialogHeader>
        <DialogTitle className="font-heading">Take 2</DialogTitle>
        <DialogDescription>You drew two cards. Choose one to keep. The other will be discarded.</DialogDescription>
      </DialogHeader>
      <div className="flex justify-center gap-4 py-4">
        {tempCards?.map(card => (
          <div key={card.id} className="flex flex-col items-center gap-2">
            <GameCard card={card} isFaceUp={true} />
            <Button onClick={() => handleTake2Choose(card)}>Choose</Button>
          </div>
        ))}
      </div>
    </>
  );

  const renderRoundEndContent = () => (
    <>
      <DialogHeader>
        <DialogTitle className="font-heading">Round Over!</DialogTitle>
        <DialogDescription>{state.actionMessage}</DialogDescription>
      </DialogHeader>
      <div className="py-4">
        <ul className="space-y-2">
          {lastRoundScores?.map(({ playerId, score, penalty }) => {
            const player = players.find(p => p.id === playerId);
            return (
              <li key={playerId} className="flex justify-between items-center">
                <span>{player?.name}</span>
                <span className="font-mono">
                  {score} {penalty > 0 && <span className="text-destructive"> + {penalty}</span>} = {score + penalty}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
       <Button onClick={handleNewRound} className="w-full">Start Next Round</Button>
    </>
  );

   const renderGameOverContent = () => (
    <>
      <DialogHeader>
        <DialogTitle className="font-heading">Game Over!</DialogTitle>
        <DialogDescription>{gameWinnerName} wins the game!</DialogDescription>
      </DialogHeader>
      <div className="py-4">
        <h4 className="font-bold mb-2 font-heading">Final Scores:</h4>
        <ul className="space-y-2">
          {players.sort((a,b) => a.score - b.score).map(player => (
              <li key={player.id} className="flex justify-between items-center">
                <span>{player.name}</span>
                <span className="font-mono">{player.score}</span>
              </li>
            ))}
        </ul>
      </div>
    </>
  );

  const isOpen = gamePhase === 'action_take_2' || gamePhase === 'round_end' || gamePhase === 'game_over';

  return (
    <Dialog open={isOpen}>
      <DialogContent className="bg-card/80 backdrop-blur-lg border-white/20">
        {gamePhase === 'action_take_2' && renderTake2Content()}
        {gamePhase === 'round_end' && renderRoundEndContent()}
        {gamePhase === 'game_over' && renderGameOverContent()}
      </DialogContent>
    </Dialog>
  );
};

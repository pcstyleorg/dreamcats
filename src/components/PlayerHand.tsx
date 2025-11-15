import React from 'react';
import { Player } from '@/types';
import { GameCard } from './Card';
import { useGame } from '@/context/GameContext';
import { cn } from '@/lib/utils';

interface PlayerHandProps {
  player: Player;
  isCurrentPlayer: boolean;
  isOpponent?: boolean;
}

export const PlayerHand: React.FC<PlayerHandProps> = ({ player, isCurrentPlayer, isOpponent }) => {
  const { state, broadcastAction, myPlayerId } = useGame();
  const { gamePhase, drawnCard } = state;
  
  const amIThisPlayer = player.id === myPlayerId;
  const isMyTurn = state.players[state.currentPlayerIndex]?.id === myPlayerId;

  const handleCardClick = (cardIndex: number) => {
    // Peeking phase
    if (gamePhase === 'peeking' && amIThisPlayer && state.peekingState?.playerIndex === state.players.findIndex(p => p.id === myPlayerId)) {
      broadcastAction({ type: 'PEEK_CARD', payload: { playerId: player.id, cardIndex } });
      return;
    }

    // Swapping card from hand after drawing
    if (gamePhase === 'holding_card' && amIThisPlayer && isMyTurn) {
        broadcastAction({ type: 'SWAP_HELD_CARD', payload: { cardIndex } });
        return;
    }

    // 'Peek 1' special action
    if (gamePhase === 'action_peek_1' && isMyTurn) {
        broadcastAction({ type: 'ACTION_PEEK_1_SELECT', payload: { playerId: player.id, cardIndex } });
        // After peeking, we need to advance the turn. This is handled in the reducer with a timeout.
        setTimeout(() => broadcastAction({ type: 'FINISH_PEEKING' }), 2000); // A bit of a hack, better handled by a dedicated action
    }

    // 'Swap 2' special action
    if ((gamePhase === 'action_swap_2_select_1' || gamePhase === 'action_swap_2_select_2') && isMyTurn) {
        broadcastAction({ type: 'ACTION_SWAP_2_SELECT', payload: { playerId: player.id, cardIndex } });
    }
  };

  const getCardInteractionClass = () => {
    if (!isMyTurn) return '';
    if (gamePhase === 'holding_card' && amIThisPlayer) return 'cursor-pointer hover:scale-105';
    if (gamePhase === 'action_peek_1') return 'cursor-pointer hover:scale-105';
    if (gamePhase === 'action_swap_2_select_1' || gamePhase === 'action_swap_2_select_2') return 'cursor-pointer hover:scale-105';
    if (gamePhase === 'peeking' && amIThisPlayer) return 'cursor-pointer hover:scale-105';
    return '';
  }

  return (
    <div className={cn("p-4 rounded-lg border-2", isCurrentPlayer && gamePhase !== 'round_end' && gamePhase !== 'game_over' ? "border-primary bg-primary/10" : "border-transparent")}>
      <h3 className={cn("text-lg font-semibold mb-2 text-center", isOpponent && "text-sm")}>{player.name} {amIThisPlayer && "(You)"}</h3>
      <div className={cn("flex gap-2 justify-center", isOpponent && "gap-1")}>
        {player.hand.map((cardInHand, index) => (
          <GameCard
            key={index}
            card={cardInHand.card}
            isFaceUp={cardInHand.isFaceUp || gamePhase === 'round_end' || gamePhase === 'game_over'}
            hasBeenPeeked={cardInHand.hasBeenPeeked}
            onClick={() => handleCardClick(index)}
            className={cn(isOpponent && "w-16 h-24 md:w-20 md:h-28", getCardInteractionClass())}
          />
        ))}
      </div>
    </div>
  );
};

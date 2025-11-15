import React from 'react';
import { Player } from '@/types';
import { GameCard } from './Card';
import { useGame } from '@/context/GameContext';
import { cn } from '@/lib/utils';
import { SoundType } from '@/hooks/use-sounds';

interface PlayerHandProps {
  player: Player;
  isCurrentPlayer: boolean;
  isOpponent?: boolean;
  playSound: (sound: SoundType) => void;
}

export const PlayerHand: React.FC<PlayerHandProps> = ({ player, isCurrentPlayer, isOpponent, playSound }) => {
  const { state, broadcastAction, myPlayerId } = useGame();
  const { gamePhase, gameMode } = state;
  
  const isPeekingTurn = gamePhase === 'peeking' && state.peekingState?.playerIndex === state.players.findIndex(p => p.id === player.id);
  
  const canThisPlayerAct = () => {
    if (gameMode === 'hotseat') {
      return isCurrentPlayer || isPeekingTurn;
    }
    // For online, ensure the action is for 'me'
    return (isCurrentPlayer && player.id === myPlayerId) || (isPeekingTurn && player.id === myPlayerId);
  }

  const handleCardClick = (cardIndex: number) => {
    if (!canThisPlayerAct()) return;

    // Peeking phase
    if (gamePhase === 'peeking' && isPeekingTurn) {
      broadcastAction({ type: 'PEEK_CARD', payload: { playerId: player.id, cardIndex } });
      return;
    }

    // Swapping card from hand after drawing
    if (gamePhase === 'holding_card' && isCurrentPlayer) {
        broadcastAction({ type: 'SWAP_HELD_CARD', payload: { cardIndex } });
        return;
    }

    // 'Peek 1' special action
    if (gamePhase === 'action_peek_1' && isCurrentPlayer) {
        broadcastAction({ type: 'ACTION_PEEK_1_SELECT', payload: { playerId: player.id, cardIndex } });
    }

    // 'Swap 2' special action
    if ((gamePhase === 'action_swap_2_select_1' || gamePhase === 'action_swap_2_select_2') && isCurrentPlayer) {
        broadcastAction({ type: 'ACTION_SWAP_2_SELECT', payload: { playerId: player.id, cardIndex } });
    }
  };

  const getCardInteractionClass = (cardIndex: number) => {
    if (!canThisPlayerAct()) return '';

    const handCard = player.hand[cardIndex];

    if (gamePhase === 'peeking' && isPeekingTurn && !handCard.isFaceUp && state.peekingState!.peekedCount < 2) return 'cursor-pointer hover:scale-105 hover:shadow-[0_0_25px_theme(colors.primary/50%)]';
    if (gamePhase === 'holding_card' && isCurrentPlayer) return 'cursor-pointer hover:scale-105 hover:shadow-[0_0_25px_theme(colors.primary/50%)]';
    if (gamePhase === 'action_peek_1' && isCurrentPlayer) return 'cursor-pointer hover:scale-105 hover:shadow-[0_0_25px_theme(colors.primary/50%)]';
    if ((gamePhase === 'action_swap_2_select_1' || gamePhase === 'action_swap_2_select_2') && isCurrentPlayer) return 'cursor-pointer hover:scale-105 hover:shadow-[0_0_25px_theme(colors.primary/50%)]';
    
    return '';
  }

  const showYouTag = gameMode === 'online' && myPlayerId === player.id;

  return (
    <div className={cn(
        "p-2 md:p-4 rounded-lg border-2 transition-all duration-300", 
        isCurrentPlayer && gamePhase !== 'round_end' && gamePhase !== 'game_over' ? "border-primary bg-primary/10 shadow-[0_0_30px_theme(colors.primary/20%)]" : "border-transparent"
    )}>
      <h3 className={cn("font-heading text-base md:text-lg font-semibold mb-2 text-center", isOpponent && "text-sm md:text-base")}>
        {player.name} {showYouTag && "(You)"}
      </h3>
      <div className={cn("flex gap-2 justify-center")}>
        {player.hand.map((cardInHand, index) => (
          <GameCard
            key={index}
            card={cardInHand.card}
            isFaceUp={cardInHand.isFaceUp || gamePhase === 'round_end' || gamePhase === 'game_over'}
            hasBeenPeeked={cardInHand.hasBeenPeeked}
            onClick={() => handleCardClick(index)}
            className={cn(isOpponent && "w-14 h-20 md:w-20 md:h-28", getCardInteractionClass(index))}
            playSound={playSound}
          />
        ))}
      </div>
    </div>
  );
};

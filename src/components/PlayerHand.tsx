import React from "react";
import { Player } from "@/types";
import { GameCard } from "./Card";
import { useGame } from "@/context/GameContext";
import { cn } from "@/lib/utils";
import { SoundType } from "@/hooks/use-sounds";

interface PlayerHandProps {
  player: Player;
  isCurrentPlayer: boolean;
  isOpponent?: boolean;
  playSound: (sound: SoundType) => void;
}

export const PlayerHand: React.FC<PlayerHandProps> = ({
  player,
  isCurrentPlayer,
  isOpponent,
  playSound,
}) => {
  const { state, broadcastAction, myPlayerId } = useGame();
  const { gamePhase, gameMode } = state;
  const currentPlayer = state.players[state.currentPlayerIndex];
  const isMyTurn =
    gameMode === "online" ? currentPlayer?.id === myPlayerId : true;

  const isPeekingTurn =
    gamePhase === "peeking" &&
    state.peekingState?.playerIndex ===
      state.players.findIndex((p) => p.id === player.id);

  const handleCardClick = (cardIndex: number) => {
    // Peeking phase (only the peeking player)
    if (gamePhase === "peeking" && isPeekingTurn) {
      broadcastAction({
        type: "PEEK_CARD",
        payload: { playerId: player.id, cardIndex },
      });
      return;
    }

    // Swapping card from hand after drawing (only the active player's own hand)
    if (gamePhase === "holding_card" && isCurrentPlayer && isMyTurn) {
      broadcastAction({ type: "SWAP_HELD_CARD", payload: { cardIndex } });
      return;
    }

    // 'Peek 1' special action (can target any hand while it's my turn)
    if (gamePhase === "action_peek_1" && isMyTurn) {
      broadcastAction({
        type: "ACTION_PEEK_1_SELECT",
        payload: { playerId: player.id, cardIndex },
      });
      return;
    }

    // 'Swap 2' special action (can target any hand while it's my turn)
    if (
      (gamePhase === "action_swap_2_select_1" ||
        gamePhase === "action_swap_2_select_2") &&
      isMyTurn
    ) {
      broadcastAction({
        type: "ACTION_SWAP_2_SELECT",
        payload: { playerId: player.id, cardIndex },
      });
      return;
    }
  };

  const getCardInteractionClass = (cardIndex: number) => {
    const handCard = player.hand[cardIndex];

    // Allow hover animation and pointer only for legal interactions.
    if (
      gamePhase === "peeking" &&
      isPeekingTurn &&
      !handCard.isFaceUp &&
      state.peekingState!.peekedCount < 2
    ) {
      return "cursor-pointer hover:scale-105";
    }

    if (gamePhase === "holding_card" && isCurrentPlayer && isMyTurn) {
      return "cursor-pointer hover:scale-105";
    }

    if (gamePhase === "action_peek_1" && isMyTurn) {
      return "cursor-pointer hover:scale-105";
    }

    if (
      (gamePhase === "action_swap_2_select_1" ||
        gamePhase === "action_swap_2_select_2") &&
      isMyTurn
    ) {
      return "cursor-pointer hover:scale-105";
    }

    // Not a legal move: keep static (overlay on revealed cards is handled in GameCard)
    return "";
  };

  const showYouTag = gameMode === "online" && myPlayerId === player.id;

  return (
    <div
      className={cn(
        "p-0.5 sm:p-1 md:p-2 lg:p-3 rounded-lg border-2 transition-all duration-300",
        isCurrentPlayer &&
          gamePhase !== "round_end" &&
          gamePhase !== "game_over"
          ? "border-primary/30 bg-primary/5 shadow-[0_0_20px_hsl(var(--primary)/0.2)]"
          : "border-transparent",
      )}
    >
      <h3
        className={cn(
          "font-heading text-xs sm:text-sm md:text-base font-semibold mb-0.5 sm:mb-1 text-center",
          isOpponent && "text-[0.65rem] sm:text-xs md:text-sm",
        )}
      >
        {player.name}{" "}
        {showYouTag && (
          <span className="text-muted-foreground text-xs sm:text-sm">
            (You)
          </span>
        )}
      </h3>
      <div className={cn("flex gap-0.5 sm:gap-1 md:gap-2 justify-center")}>
        {player.hand.map((cardInHand, index) => (
          <GameCard
            key={index}
            card={cardInHand.card}
            isFaceUp={
              cardInHand.isFaceUp ||
              gamePhase === "round_end" ||
              gamePhase === "game_over"
            }
            hasBeenPeeked={cardInHand.hasBeenPeeked}
            onClick={() => handleCardClick(index)}
            className={cn(
              isOpponent &&
                "!w-[12vw] !max-w-16 sm:!w-[10vw] sm:!max-w-20 md:!w-[7vw] md:!max-w-24 lg:!w-[6vw] lg:!max-w-28",
              getCardInteractionClass(index),
            )}
            playSound={playSound}
          />
        ))}
      </div>
    </div>
  );
};

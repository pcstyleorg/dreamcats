import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { Player } from "@/types";
import { GameCard } from "./Card";
import { useGame } from "@/context/GameContext";
import { cn } from "@/lib/utils";
import { SoundType } from "@/hooks/use-sounds";
import { getCardBackAsset } from "@/lib/cardAssets";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();
  const { state, broadcastAction, myPlayerId } = useGame();
  const { gamePhase, gameMode, lastMove } = state;
  const currentPlayer = state.players[state.currentPlayerIndex];
  const isMyTurn =
    gameMode === "online" ? currentPlayer?.id === myPlayerId : true;

  const [animatingIndex, setAnimatingIndex] = React.useState<number | null>(
    null,
  );

  const recentMoveForPlayer =
    lastMove &&
    lastMove.playerId === player.id &&
    Date.now() - lastMove.timestamp < 3200
      ? lastMove
      : null;

  React.useEffect(() => {
    if (recentMoveForPlayer?.action === "swap") {
      // Trigger animation on the affected card slot
      setAnimatingIndex(recentMoveForPlayer.cardIndex ?? null);
      const animTimer = setTimeout(() => setAnimatingIndex(null), 700);
      return () => clearTimeout(animTimer);
    }
  }, [recentMoveForPlayer]);

  const actionLabel = React.useMemo(() => {
    if (!recentMoveForPlayer) return null;
    switch (recentMoveForPlayer.action) {
      case "draw":
        return recentMoveForPlayer.source === "discard"
          ? t('actions.tookFromDiscard')
          : t('actions.drewACard');
      case "discard":
        return t('actions.discarded');
      case "swap":
        return t('actions.swapped');
      case "peek":
        return recentMoveForPlayer.targetPlayerId === player.id
          ? t('actions.someonePeekedAtYourCard')
          : t('actions.peeked');
      case "swap_2":
        return t('actions.swappedTwo');
      case "take_2":
        return t('actions.keptACard');
      default:
        return null;
    }
  }, [player.id, recentMoveForPlayer, t]);

  const cardBackAsset = React.useMemo(() => getCardBackAsset(), []);

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
      const card = player.hand[cardIndex]?.card;
      if (card) {
        const baseInfo = card.isSpecial
          ? card.specialAction === "take_2"
            ? t('cardInfo.take2')
            : card.specialAction === "peek_1"
              ? t('cardInfo.peek1')
              : t('cardInfo.swap2')
          : t('cardInfo.value', { value: card.value });
        toast.info(t('cardInfo.youPeekedAt', { cardInfo: baseInfo }));
      }
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
      state.peekingState &&
      state.peekingState.peekedCount < 2
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
        "relative p-1 sm:p-1.5 md:p-2 lg:p-3 rounded-xl border-2 transition-all duration-300 bg-card/80 dark:bg-card/30 backdrop-blur-sm",
        "shadow-soft",
        isCurrentPlayer &&
          gamePhase !== "round_end" &&
          gamePhase !== "game_over"
          ? "border-primary/40 shadow-[0_0_20px_hsl(var(--primary)/0.2)]"
          : "border-border/40",
      )}
    >
      <div className="flex flex-col items-center gap-1 sm:gap-1.5">
        <h3
          className={cn(
            "font-heading text-xs sm:text-sm md:text-base font-semibold text-center text-foreground",
            isOpponent && "text-[0.7rem] sm:text-xs md:text-sm",
          )}
        >
          {player.name}{" "}
          {showYouTag && (
            <span className="text-muted-foreground text-xs sm:text-sm">
              ({t('game.you')})
            </span>
          )}
        </h3>

        <AnimatePresence>
          {actionLabel && (
            <motion.div
              key="action-label"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="flex items-center gap-1 text-[0.65rem] sm:text-xs text-muted-foreground"
            >
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              <span className="whitespace-nowrap">{actionLabel}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <div className={cn("flex gap-0.5 sm:gap-1 md:gap-2 justify-center w-full relative")}> 
          <AnimatePresence>
            {recentMoveForPlayer?.action === "draw" && (
              <motion.div
                key="draw-floater"
                initial={{ opacity: 0, y: -16, scale: 0.8 }}
                animate={{ opacity: 1, y: -6, scale: 1 }}
                exit={{ opacity: 0, y: -14, scale: 0.9 }}
                transition={{ duration: 0.35 }}
                className="absolute -top-8 right-1 flex items-center gap-1 px-2 py-1 rounded-full bg-primary/15 dark:bg-primary/30 text-[0.65rem] text-primary shadow-soft"
              >
                <img
                  src={cardBackAsset}
                  alt="Card back"
                  className="w-6 h-8 rounded-md shadow-soft"
                  draggable={false}
                />
                <span>{recentMoveForPlayer.source === "discard" ? t('actions.fromDiscard') : t('actions.fromDeck')}</span>
              </motion.div>
            )}
          </AnimatePresence>
          {player.hand.map((cardInHand, index) => {
            const isTargeted =
              recentMoveForPlayer &&
              typeof recentMoveForPlayer.cardIndex === "number" &&
              recentMoveForPlayer.cardIndex === index;

            return (
              <div key={index} className="relative">
                {animatingIndex === index && (
                  <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-xs font-bold text-primary animate-bounce z-20 whitespace-nowrap pointer-events-none">
                    {t('actions.placed')}
                  </span>
                )}
                <div
                  className={cn(
                    "transition-all duration-300",
                    (animatingIndex === index || isTargeted) &&
                      "scale-105 ring-2 ring-primary/70 rounded-md z-10",
                  )}
                >
                  <GameCard
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
                      "!w-[20vw] !max-w-28 sm:!w-[12vw] sm:!max-w-28 md:!w-[9vw] md:!max-w-32 lg:!w-[7vw] lg:!max-w-28",
                      getCardInteractionClass(index),
                    )}
                    playSound={playSound}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

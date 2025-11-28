import React, { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { Player, Card } from "@/types";
import { GameCard } from "./Card";
import { useGame } from "@/state/useGame";
import { cn } from "@/lib/utils";
import { SoundType } from "@/hooks/use-sounds";
import { getCardBackAsset } from "@/lib/cardAssets";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

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
  const containerRef = useRef<HTMLDivElement>(null);
  const currentPlayer = state.players[state.currentPlayerIndex];
  const isMyTurn =
    gameMode === "online" ? currentPlayer?.id === myPlayerId : true;
  const isSwap2Phase =
    gamePhase === "action_swap_2_select_1" ||
    gamePhase === "action_swap_2_select_2";
  const isPeekPhase = gamePhase === "action_peek_1";
  const isTake2Phase = gamePhase === "action_take_2";
  const isSpecialSelectionPhase = isSwap2Phase || isPeekPhase || isTake2Phase;

  const [animatingIndex, setAnimatingIndex] = React.useState<number | null>(
    null,
  );

  const recentMoveForPlayer =
    lastMove &&
      lastMove.playerId === player.id &&
      Date.now() - lastMove.timestamp < 3200
      ? lastMove
      : null;

  // Check if this player has a card that was involved in a recent swap_2
  const swap2HighlightIndex = React.useMemo(() => {
    if (!lastMove || lastMove.action !== "swap_2" || !lastMove.swap2Details) return null;
    if (Date.now() - lastMove.timestamp > 3200) return null;
    
    const { card1, card2 } = lastMove.swap2Details;
    if (card1.playerId === player.id) return card1.cardIndex;
    if (card2.playerId === player.id) return card2.cardIndex;
    return null;
  }, [lastMove, player.id]);

  React.useEffect(() => {
    if (recentMoveForPlayer?.action === "swap") {
      // Trigger animation on the affected card slot
      setAnimatingIndex(recentMoveForPlayer.cardIndex ?? null);
      const animTimer = setTimeout(() => setAnimatingIndex(null), 700);
      return () => clearTimeout(animTimer);
    }
  }, [recentMoveForPlayer]);

  // Entrance animation removed to avoid Safari/production opacity glitches.
  // (hand cards were occasionally stuck at opacity:0 when GSAP failed to clear props)

  // GSAP Animations - Active Player Border
  useGSAP(() => {
    if (!containerRef.current) return;

    // Kill existing tweens first
    gsap.killTweensOf(containerRef.current);

    // Pulse effect for active player border
    if (isMyTurn && isSpecialSelectionPhase) {
      gsap.to(containerRef.current, {
        boxShadow: "0 0 0 12px rgba(147, 51, 234, 0.08)",
        duration: 1.1,
        repeat: -1,
        yoyo: true,
        ease: "power1.inOut"
      });
    } else {
      gsap.set(containerRef.current, {
        boxShadow: "0 0 0 0px rgba(0,0,0,0)"
      });
    }
    
    return () => {
      if (containerRef.current) {
        gsap.killTweensOf(containerRef.current);
      }
    };
  }, { scope: containerRef, dependencies: [isMyTurn, isSpecialSelectionPhase] });

  // Pulse effect for individual cards
  useGSAP(() => {
    if (!containerRef.current) return;
    
    // Kill existing tweens to prevent conflict
    const cards = containerRef.current.querySelectorAll(".hand-card");
    cards.forEach(card => gsap.killTweensOf(card));

    if (isMyTurn && isSpecialSelectionPhase) {
       // Only animate if elements exist
       const pulsingCards = containerRef.current.querySelectorAll(".pulsing-card");
       if (pulsingCards.length > 0) {
         gsap.to(pulsingCards, {
          filter: "brightness(1.08)",
          boxShadow: "0 0 0 10px rgba(147,51,234,0.14)",
          duration: 1.6,
          repeat: -1,
          yoyo: true,
          ease: "power1.inOut"
        });
       }
    } else {
       // Reset all cards
       if (cards.length > 0) {
         gsap.set(cards, {
          filter: "brightness(1)",
          boxShadow: "0 0 0 0 rgba(0,0,0,0)"
        });
       }
    }
    
    return () => {
      if (containerRef.current) {
        const allCards = containerRef.current.querySelectorAll(".hand-card");
        allCards.forEach(card => gsap.killTweensOf(card));
      }
    };
  }, { scope: containerRef, dependencies: [isMyTurn, isSpecialSelectionPhase, player.hand.length] });


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

  // Check if this hand should be highlighted for swap interaction
  const isSwapTarget =
    gamePhase === "holding_card" &&
    isMyTurn &&
    !isOpponent &&
    player.id === myPlayerId;

  const handleCardClick = (cardIndex: number) => {
    // Block interaction with opponent cards during normal gameplay
    // Only allow if it's a special action that explicitly targets opponents
    const isSpecialActionAllowingOpponentTarget = 
      (gamePhase === "action_peek_1" && isMyTurn) || 
      ((gamePhase === "action_swap_2_select_1" || gamePhase === "action_swap_2_select_2") && isMyTurn);
    
    if (isOpponent && !isSpecialActionAllowingOpponentTarget) {
      return; // Silently ignore clicks on opponent cards when not allowed
    }

    // Peeking phase (only the peeking player)
    if (gamePhase === "peeking" && isPeekingTurn) {
      // Double check it's my own hand (though isOpponent check above covers it)
      if (player.id !== myPlayerId) return;
      
      broadcastAction({
        type: "PEEK_CARD",
        payload: { playerId: player.id, cardIndex },
      });
      return;
    }

    // Swapping card from hand after drawing (only the active player's own hand)
    if (gamePhase === "holding_card" && isCurrentPlayer && isMyTurn) {
      if (isOpponent) return; // Should be covered, but safety first
      broadcastAction({ type: "SWAP_HELD_CARD", payload: { cardIndex } });
      return;
    }

    // 'Peek 1' special action (can target any hand while it's my turn)
    if (gamePhase === "action_peek_1" && isMyTurn) {
      broadcastAction({
      type: "ACTION_PEEK_1_SELECT",
      payload: { playerId: player.id, cardIndex },
    }).then((card) => {
        if (card) {
            const c = card as Card;
            toast.success(t('game.peekResult', { value: c.value }), {
                description: c.isSpecial ? `Special: ${c.specialAction}` : "Number card",
                duration: 4000,
                icon: <div className="text-xl font-bold">{c.value}</div>
            });
        }
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
      return "cursor-pointer";
    }

    if (gamePhase === "holding_card" && isCurrentPlayer && isMyTurn) {
      return "cursor-pointer";
    }

    if (gamePhase === "action_peek_1" && isMyTurn) {
      return "cursor-pointer";
    }

    if (
      (gamePhase === "action_swap_2_select_1" ||
        gamePhase === "action_swap_2_select_2") &&
      isMyTurn
    ) {
      return "cursor-pointer";
    }

    // Not a legal move: keep static (overlay on revealed cards is handled in GameCard)
    return "";
  };

  const showYouTag = gameMode === "online" && myPlayerId === player.id;

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative p-3 sm:p-3.5 md:p-4 lg:p-4.5 rounded-2xl border transition-all duration-300 bg-gradient-to-br from-[hsl(var(--card))] via-[hsl(var(--card))] to-[hsl(var(--accent)/0.12)] backdrop-blur-md",
        "shadow-soft-lg",
        isCurrentPlayer &&
          gamePhase !== "round_end" &&
          gamePhase !== "game_over"
          ? "border-primary/40 shadow-[0_0_28px_hsl(var(--primary)/0.25)]"
          : "border-border/50",
        // Enhanced glow when player hand is interactive swap target
        isSwapTarget && "swap-target-hand border-primary/60 shadow-[0_0_40px_hsl(var(--primary)/0.4),0_0_80px_hsl(var(--primary)/0.2)] ring-2 ring-primary/30 ring-offset-2 ring-offset-background/50",
      )}
    >
      {/* Swap target indicator glow overlay */}
      {isSwapTarget && (
        <div className="absolute -inset-1 rounded-2xl bg-gradient-to-t from-primary/20 via-primary/10 to-transparent pointer-events-none animate-pulse" />
      )}
      <div className="flex flex-col items-center gap-1 sm:gap-1.5">
        <h3
          className={cn(
            "font-heading text-sm sm:text-base md:text-lg font-bold text-center text-foreground tracking-wide",
            isOpponent && "text-xs sm:text-sm md:text-base",
          )}
        >
          {player.name}{" "}
          {showYouTag && (
            <span className="text-muted-foreground text-xs sm:text-sm">
              ({t('game.you')})
            </span>
          )}
        </h3>

        {actionLabel && (
          <div className="flex items-center gap-1 text-[0.65rem] sm:text-xs text-muted-foreground animate-in fade-in slide-in-from-bottom-1 duration-300">
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span className="whitespace-nowrap">{actionLabel}</span>
          </div>
        )}

        {recentMoveForPlayer?.action === "draw" && (
          <div className="flex items-center gap-2 mt-1 text-[0.7rem] sm:text-xs text-muted-foreground bg-primary/10 border border-primary/20 rounded-full px-3 py-1 shadow-soft animate-in fade-in zoom-in duration-300">
            <img
              src={cardBackAsset}
              alt="Card back"
              className="w-6 h-8 rounded-md shadow-soft"
              draggable={false}
            />
            <span className="font-medium">
              {recentMoveForPlayer.source === "discard"
                ? t('actions.fromDiscard')
                : t('actions.fromDeck')}
            </span>
          </div>
        )}

        <div className={cn("flex justify-center w-full relative px-4 gap-1 sm:gap-1.5 md:gap-2")}>
          {player.hand.map((cardInHand, index) => {
            const isTargeted =
              recentMoveForPlayer &&
              typeof recentMoveForPlayer.cardIndex === "number" &&
              recentMoveForPlayer.cardIndex === index;
            const shouldPulseCard =
              isMyTurn && isSpecialSelectionPhase && !cardInHand.isFaceUp;
            const isSwapCandidate = isSwapTarget;

            return (
              <div
                key={index}
                className={cn(
                  "hand-card relative transition-all duration-300",
                  shouldPulseCard ? "pulsing-card" : "",
                  // Enhanced hover for swap candidates
                  isSwapCandidate
                    ? "cursor-pointer hover:-translate-y-6 hover:z-30 hover:scale-110 hover:shadow-[0_0_30px_hsl(var(--primary)/0.5)]"
                    : "hover:-translate-y-4 hover:z-30 hover:scale-105",
                  // Subtle glow on all cards when swap is available
                  isSwapCandidate && "swap-candidate",
                  // Swap 2 highlight effect for cards involved in recent swap
                  swap2HighlightIndex === index && "ring-2 ring-pink-500/70 ring-offset-2 ring-offset-background shadow-[0_0_20px_rgba(236,72,153,0.4)]",
                )}
                style={{ zIndex: index }} // Default stacking order
              >
                {animatingIndex === index && (
                  <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-xs font-bold text-primary animate-bounce z-20 whitespace-nowrap pointer-events-none">
                    {t('actions.placed')}
                  </span>
                )}
                {/* Swap 2 indicator badge */}
                {swap2HighlightIndex === index && (
                  <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[0.6rem] sm:text-xs font-bold text-pink-400 animate-pulse z-20 whitespace-nowrap pointer-events-none bg-pink-500/20 px-2 py-0.5 rounded-full border border-pink-500/40">
                    {t('actions.swappedTwo')}
                  </span>
                )}
                <div
                  className={cn(
                    "transition-all duration-300",
                    (animatingIndex === index || isTargeted) &&
                    "ring-2 ring-primary/70 rounded-md z-10",
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
                      "!w-16 sm:!w-20 md:!w-24 lg:!w-16 xl:!w-20",
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

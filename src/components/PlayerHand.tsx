import React, { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { Player, Card } from "@/types";
import { GameCard } from "./Card";
import { useGame } from "@/state/useGame";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Wand2 } from "lucide-react";

interface PlayerHandProps {
  player: Player;
  isCurrentPlayer: boolean;
  isOpponent?: boolean;
  isLocalPlayer?: boolean;
  orientation?: "horizontal" | "vertical";
}

export const PlayerHand: React.FC<PlayerHandProps> = ({
  player,
  isCurrentPlayer,
  isOpponent,
  isLocalPlayer,
  orientation = "horizontal",
}) => {
  const { t } = useTranslation();
  const { state, broadcastAction, myPlayerId } = useGame();
  const { gamePhase, gameMode, lastMove, peekingState, drawnCard, drawSource } = state;
  const containerRef = useRef<HTMLDivElement>(null);
  const currentPlayer = state.players[state.currentPlayerIndex];
  const isMyTurn =
    gameMode === "online"
      ? currentPlayer?.id === myPlayerId
      : currentPlayer?.id === player.id;
  const isSwap2Phase =
    gamePhase === "action_swap_2_select_1" ||
    gamePhase === "action_swap_2_select_2";
  const isPeekPhase = gamePhase === "action_peek_1";
  const isTake2Phase = gamePhase === "action_take_2";
  const isSpecialSelectionPhase = isSwap2Phase || isPeekPhase || isTake2Phase;

  const [animatingIndex, setAnimatingIndex] = React.useState<number | null>(
    null,
  );

  // Consistent timing for recent move highlights
  const recentMoveForPlayer =
    lastMove &&
      lastMove.playerId === player.id &&
      Date.now() - lastMove.timestamp < 3000
      ? lastMove
      : null;

  // Check if this player has a card that was involved in a recent swap_2
  // Using consistent 3000ms duration for better cross-network reliability
  const swap2HighlightIndex = React.useMemo(() => {
    if (!lastMove || lastMove.action !== "swap_2" || !lastMove.swap2Details) return null;

    // Use server timestamp for consistent timing across all clients
    const age = Date.now() - lastMove.timestamp;
    const HIGHLIGHT_DURATION = 3000; // Consistent 3 second highlight
    if (age > HIGHLIGHT_DURATION) return null;

    const { card1, card2 } = lastMove.swap2Details;
    if (card1.playerId === player.id) return card1.cardIndex;
    if (card2.playerId === player.id) return card2.cardIndex;
    return null;
  }, [lastMove, player.id]);

  React.useEffect(() => {
    // Trigger animation for any card-changing action (swap, take_2, swap_2)
    // Delay by 1 second so animation doesn't interfere with hover state
    if (recentMoveForPlayer?.action === "swap" || recentMoveForPlayer?.action === "take_2") {
      const delayTimer = setTimeout(() => {
        setAnimatingIndex(recentMoveForPlayer.cardIndex ?? null);
      }, 1000);
      const clearTimer = setTimeout(() => setAnimatingIndex(null), 1600);
      return () => {
        clearTimeout(delayTimer);
        clearTimeout(clearTimer);
      };
    }
  }, [recentMoveForPlayer]);

  // Handle swap_2 animation separately since it uses swap2HighlightIndex
  React.useEffect(() => {
    if (swap2HighlightIndex !== null) {
      const delayTimer = setTimeout(() => {
        setAnimatingIndex(swap2HighlightIndex);
      }, 1000);
      const clearTimer = setTimeout(() => setAnimatingIndex(null), 1600);
      return () => {
        clearTimeout(delayTimer);
        clearTimeout(clearTimer);
      };
    }
  }, [swap2HighlightIndex]);

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

  // Enhanced pulse effect for individual cards with better visual feedback
  useGSAP(() => {
    if (!containerRef.current) return;

    // Kill existing tweens to prevent conflict
    const cards = containerRef.current.querySelectorAll(".hand-card");
    cards.forEach(card => gsap.killTweensOf(card));

    if (isMyTurn && isSpecialSelectionPhase) {
       // Enhanced animation with more visible effects
       const pulsingCards = containerRef.current.querySelectorAll(".pulsing-card");
       if (pulsingCards.length > 0) {
         gsap.to(pulsingCards, {
          filter: "brightness(1.15) drop-shadow(0 0 8px rgba(147,51,234,0.4))",
          boxShadow: "0 0 0 4px rgba(147,51,234,0.3), 0 0 20px rgba(147,51,234,0.2)",
          duration: 1.4,
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

  // Consistent card sizing for all players to prevent layout jumping
  const cardWidth = "w-[clamp(64px,8.5vw,112px)]!";
  const maxCardWidth =
    "max-w-[110px] sm:max-w-[118px] md:max-w-[126px] lg:max-w-[132px]";

  const isPeekingTurn =
    gamePhase === "peeking" &&
    state.peekingState?.playerIndex ===
    state.players.findIndex((p) => p.id === player.id);

  // Check if this hand should be highlighted for swap interaction
  // In hotseat, the current player can swap their own cards even if they're in an "opponent" position
  const isSwapTarget =
    gamePhase === "holding_card" &&
    isCurrentPlayer &&
    (gameMode === "hotseat" || player.id === myPlayerId);

  const handleCardClick = (cardIndex: number) => {
    // Block interaction with opponent cards during normal gameplay
    // Only allow if it's a special action that explicitly targets opponents
    // or if it's the peeking phase and this is the active peeker's hand
    // or if it's holding_card phase and this is the current player's hand
    const isSpecialActionAllowingOpponentTarget = 
      (gamePhase === "action_peek_1" && isMyTurn) || 
      ((gamePhase === "action_swap_2_select_1" || gamePhase === "action_swap_2_select_2") && isMyTurn);
    
    const isPeekingOwnCards = gamePhase === "peeking" && isPeekingTurn;
    const isSwappingOwnCards = gamePhase === "holding_card" && isCurrentPlayer;
    
    if (isOpponent && !isSpecialActionAllowingOpponentTarget && !isPeekingOwnCards && !isSwappingOwnCards) {
      return; // Silently ignore clicks on opponent cards when not allowed
    }

    // Peeking phase (only the peeking player)
    if (gamePhase === "peeking" && isPeekingTurn) {
      // Online: gate to the viewing player; hotseat allows any active peeker.
      if (gameMode === "online" && player.id !== myPlayerId) return;

      broadcastAction({
        type: "PEEK_CARD",
        payload: { playerId: player.id, cardIndex },
      });
      return;
    }

    // Swapping card from hand after drawing (only the active player's own hand)
    // In hotseat, isCurrentPlayer is true for the active player regardless of position
    if (gamePhase === "holding_card" && isCurrentPlayer) {
      // In online mode, also verify it's the local player's hand
      if (gameMode === "online" && player.id !== myPlayerId) return;
      broadcastAction({ type: "SWAP_HELD_CARD", payload: { cardIndex } });
      return;
    }

    // 'Peek 1' special action (can target any hand while it's my turn)
    if (gamePhase === "action_peek_1" && isMyTurn) {
      broadcastAction({
        type: "ACTION_PEEK_1_SELECT",
        payload: { playerId: player.id, cardIndex },
      }).then((card) => {
        if (card && typeof card === "object") {
          const c = card as Card;
          toast.success(t("game.peekResult", { value: c.value }), {
            description: c.isSpecial
              ? `Special: ${c.specialAction}`
              : "Number card",
            duration: 4000,
            icon: <div className="text-xl font-bold">{c.value}</div>,
          });
        } else {
          toast.error(t("common:errors.peekFailed"));
        }
      }).catch((error) => {
        console.error("Peek action failed:", error);
        toast.error(t("common:errors.peekFailedConnection"));
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

    // For holding_card phase, allow current player to swap
    if (gamePhase === "holding_card" && isCurrentPlayer) {
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

  const showYouTag =
    (gameMode === "online" && myPlayerId === player.id) || isLocalPlayer;
  const isTurnOwner =
    isCurrentPlayer &&
    gamePhase !== "round_end" &&
    gamePhase !== "game_over";

  // Wrapper to hold both actions (outside) and hand container
  return (
    <div className="flex flex-col items-center gap-2">
      {/* Action buttons OUTSIDE the card container - always reserve space in hotseat to prevent layout shift */}
      {gameMode === "hotseat" && (
        <div className={cn("min-h-[44px] flex items-center justify-center", !isTurnOwner && "invisible")}>
          <PlayerInlineActions
            gamePhase={gamePhase}
            peekingState={peekingState}
            drawnCard={drawnCard}
            drawSource={drawSource ?? null}
            broadcastAction={broadcastAction}
            t={t}
          />
        </div>
      )}
      
      {/* The actual hand container */}
      <div
        ref={containerRef}
        className={cn(
          "relative p-3 sm:p-3.5 md:p-4 lg:p-4.5 rounded-2xl border transition-all duration-300 backdrop-blur-md",
          "shadow-soft-lg",
          // Only show the glow/highlight when it's this player's turn
          isTurnOwner
            ? "bg-linear-to-br from-[hsl(var(--primary)/0.18)] via-[hsl(var(--card))] to-[hsl(var(--accent)/0.18)] border-primary/50 shadow-[0_12px_40px_rgba(0,0,0,0.38)] ring-1 ring-primary/30 outline-solid outline-2 outline-primary/70 shadow-[0_0_32px_hsl(var(--primary)/0.4)]"
            : "bg-linear-to-br from-[hsl(var(--card))] via-[hsl(var(--card))] to-[hsl(var(--accent)/0.12)] border-border/50",
          // Enhanced glow when player hand is interactive swap target
          isSwapTarget && "swap-target-hand border-primary/60 shadow-[0_0_40px_hsl(var(--primary)/0.4),0_0_80px_hsl(var(--primary)/0.2)] ring-2 ring-primary/30 ring-offset-2 ring-offset-background/50",
        )}
      >
        {/* Active turn aura */}
        {isTurnOwner && (
          <div className="pointer-events-none absolute -inset-2 rounded-3xl bg-[radial-gradient(circle_at_30%_20%,rgba(137,103,255,0.18),rgba(61,19,90,0.05))] blur-[2px] animate-pulse" />
        )}
        {/* Swap target indicator glow overlay */}
        {isSwapTarget && (
          <div className="absolute -inset-1 rounded-2xl bg-linear-to-t from-primary/20 via-primary/10 to-transparent pointer-events-none animate-pulse" />
        )}
        {/* Floating status chips */}
        {actionLabel && (
          <div className="pointer-events-none absolute -top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 text-[0.7rem] sm:text-xs text-muted-foreground bg-background/80 border border-border/60 rounded-full px-3 py-1 shadow-soft backdrop-blur-md">
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span className="whitespace-nowrap">{actionLabel}</span>
        </div>
      )}

      <div className="flex flex-col items-center gap-1 sm:gap-1.5 relative z-10">
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
          {isTurnOwner && (
            <span className="ml-2 text-[0.65rem] sm:text-xs uppercase tracking-[0.2em] text-primary font-semibold bg-primary/10 border border-primary/30 px-2 py-1 rounded-full">
              {t('game.yourTurn')}
            </span>
          )}
        </h3>

        <div
          className={cn(
            "flex justify-center w-full relative px-4 gap-1.5 sm:gap-2 md:gap-2.5",
            orientation === "vertical" && "flex-col items-center px-2 gap-2 sm:gap-2.5 md:gap-3"
          )}
        >
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
                  // Card change animation
                  animatingIndex === index && "animate-card-pop",
                  // Enhanced hover for swap candidates
                  isSwapCandidate
                    ? "cursor-pointer hover:-translate-y-6 hover:z-30 hover:scale-110 hover:shadow-[0_0_30px_hsl(var(--primary)/0.5)]"
                    : "hover:-translate-y-4 hover:z-30 hover:scale-105",
                  // Subtle glow on all cards when swap is available
                  isSwapCandidate && "swap-candidate",
                  // Swap 2 highlight effect for cards involved in recent swap
                  swap2HighlightIndex === index && "ring-2 ring-pink-500/70 ring-offset-2 ring-offset-background shadow-[0_0_20px_rgba(236,72,153,0.4)]",
                )}
                style={{ zIndex: animatingIndex === index ? 50 : index }} // Elevate during animation
              >
                {animatingIndex === index && (
                  <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-xs font-bold text-primary animate-bounce z-20 whitespace-nowrap pointer-events-none">
                    {t('actions.placed')}
                  </span>
                )}
                {/* Enhanced Swap 2 indicator with more prominent visual feedback */}
                {swap2HighlightIndex === index && (
                  <div className="absolute inset-0 z-20 pointer-events-none">
                    <div className="absolute inset-0 rounded-lg bg-linear-to-t from-pink-500/30 via-pink-400/20 to-transparent animate-pulse" />
                    <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[0.65rem] sm:text-xs font-bold text-pink-300 z-30 whitespace-nowrap bg-pink-600/40 px-2.5 py-1 rounded-full border border-pink-400/60 shadow-lg backdrop-blur-xs animate-bounce">
                      {t('actions.swappedTwo')}
                    </span>
                  </div>
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
                      cardWidth,
                      maxCardWidth,
                      getCardInteractionClass(index),
                    )}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
    </div>
  );
};

/** Inline action buttons that appear in each player's hand area */
const PlayerInlineActions: React.FC<{
  gamePhase: string;
  peekingState?: { playerIndex: number; peekedCount: number };
  drawnCard?: Card | null;
  drawSource: string | null;
  broadcastAction: (action: import('@/types').GameAction) => void;
  t: (key: string) => string;
}> = ({ gamePhase, peekingState, drawnCard, drawSource, broadcastAction, t }) => {
  const handleFinishPeeking = () => {
    if (peekingState?.peekedCount === 2) {
      broadcastAction({ type: "FINISH_PEEKING" });
    }
  };

  const handlePobudka = () => {
    broadcastAction({ type: "CALL_POBUDKA" });
  };

  const canUseSpecial =
    drawnCard?.isSpecial &&
    gamePhase === "holding_card" &&
    (drawSource === "deck" || drawSource === "take2");
  const mustSwap =
    gamePhase === "holding_card" && !!drawnCard && (drawSource === "discard" || drawSource === "take2");

  // All phases return a consistent height container
  // Peeking phase
  if (gamePhase === "peeking" && peekingState !== undefined) {
    return (
      <Button
        onClick={handleFinishPeeking}
        disabled={peekingState.peekedCount !== 2}
        variant="secondary"
        className="min-w-[120px] sm:min-w-[140px] h-10 sm:h-11 text-sm sm:text-base font-semibold shadow-xs hover:bg-secondary/80"
        size="sm"
      >
        {t('game.finishPeeking')}
      </Button>
    );
  }

  // Playing phase - show Pobudka button
  if (gamePhase === "playing") {
    return (
      <Button
        onClick={handlePobudka}
        variant="destructive"
        className="min-w-[100px] sm:min-w-[120px] h-10 sm:h-11 text-sm sm:text-base font-bold shadow-md rounded-full"
        size="sm"
      >
        {t('game.pobudka')}
      </Button>
    );
  }

  // Holding card phase - show discard/swap/action buttons (no extra text to avoid height change)
  if (gamePhase === "holding_card") {
    return (
      <div className="flex items-center justify-center gap-2 flex-wrap">
        <Button
          variant="outline"
          onClick={() => broadcastAction({ type: "DISCARD_HELD_CARD" })}
          disabled={mustSwap}
          className="min-w-[70px] sm:min-w-[90px] h-10 sm:h-11 text-xs sm:text-sm rounded-full border-border/70 bg-card/70 shadow-xs"
          size="sm"
        >
          {t('game.discard')}
        </Button>
        <Button
          onClick={() => broadcastAction({ type: "USE_SPECIAL_ACTION" })}
          disabled={!canUseSpecial}
          className="min-w-[70px] sm:min-w-[90px] h-10 sm:h-11 text-xs sm:text-sm rounded-full bg-linear-to-r from-[hsl(var(--primary))] to-[hsl(var(--accent))] text-[hsl(var(--primary-foreground))] shadow-soft-lg disabled:opacity-60"
          size="sm"
        >
          <Wand2 className="mr-1 h-3 w-3 sm:h-4 sm:w-4" />
          {t('game.action')}
        </Button>
      </div>
    );
  }

  // Special action phases
  if (gamePhase === "action_peek_1") {
    return (
      <p className="text-xs sm:text-sm text-center text-primary font-medium px-3 py-2.5 bg-primary/10 rounded-full border border-primary/30">
        {t('game.usedPeek1')}
      </p>
    );
  }

  if (gamePhase === "action_swap_2_select_1" || gamePhase === "action_swap_2_select_2") {
    return (
      <p className="text-xs sm:text-sm text-center text-pink-400 font-medium px-3 py-2.5 bg-pink-500/10 rounded-full border border-pink-400/30">
        {gamePhase === "action_swap_2_select_1"
          ? t('game.usedSwap2SelectFirst')
          : t('game.selectSecondCard')}
      </p>
    );
  }

  // Default empty state with same height
  return <div className="h-10 sm:h-11" />;
};

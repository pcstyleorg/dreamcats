import React, { useEffect, useState, useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { useGame } from "@/state/useGame";
import { Player } from "@/types";
import { PlayerHand } from "./PlayerHand";
import { GameCard } from "./Card";
import { Button } from "./ui/button";
import { Scoreboard } from "./Scoreboard";
import { Separator } from "./ui/separator";
import { toast } from "sonner";
import { Copy, Menu, Users, Cloud, ScrollText, Sparkles } from "lucide-react";
import { ActionModal } from "./ActionModal";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./ui/sheet";
import { ChatBox } from "./ChatBox";
import { GameActions } from "./GameActions";
import { ScrollArea } from "./ui/scroll-area";
import { getGameBackgroundAsset } from "@/lib/cardAssets";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./ThemeToggle";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { usePlayersView } from "@/state/hooks";
import { useNetStatus } from "@/state/selectors";

interface GameboardProps {
  theme: "light" | "dark";
  toggleTheme: () => void;
}

export const Gameboard: React.FC<GameboardProps> = ({ theme, toggleTheme }) => {
  const { t } = useTranslation();
  const { state, myPlayerId, broadcastAction, playSound } = useGame();
  const {
    currentPlayerIndex,
    discardPile,
    gamePhase,
    actionMessage,
    roomId,
    drawnCard,
    gameMode,
    lastMove,
  } = state;
  const players = usePlayersView();
  const { netStatus } = useNetStatus();
  const [isCompact, setIsCompact] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentPlayer = players[currentPlayerIndex];

  // Determine player positions
  // Bottom player is always "me" (online) or current player (hotseat)
  // Other players are distributed around the top area

  let bottomPlayer: Player;
  let otherPlayers: Player[] = [];

  if (gameMode === "hotseat") {
    // In hotseat, the current player is always at the bottom
    bottomPlayer = currentPlayer;
    // Other players are everyone else, ordered by turn order relative to current player
    otherPlayers = [
      ...players.slice(currentPlayerIndex + 1),
      ...players.slice(0, currentPlayerIndex),
    ];
  } else {
    // Online mode: show my player at bottom
    // If I'm not in the list (spectator or loading), default to current player
    const myPlayer = players.find((p) => p.id === myPlayerId);
    bottomPlayer = myPlayer || currentPlayer;
    
    if (bottomPlayer) {
        // Other players ordered by turn order relative to bottom player
        const bottomIndex = players.findIndex(p => p.id === bottomPlayer.id);
        if (bottomIndex !== -1) {
          otherPlayers = [
            ...players.slice(bottomIndex + 1),
            ...players.slice(0, bottomIndex),
          ];
        } else {
          // Fallback if index not found (shouldn't happen if bottomPlayer is from players)
          otherPlayers = players.filter(p => p.id !== bottomPlayer.id);
        }
    } else {
        // Extreme fallback if no players loaded yet
        otherPlayers = [];
    }
  }

  const isMyTurn =
    gameMode === "online" ? currentPlayer?.id === myPlayerId : true;

  useEffect(() => {
    const updateCompact = () => {
      setIsCompact(window.innerHeight < 860 || window.innerWidth < 1100);
    };
    updateCompact();
    window.addEventListener("resize", updateCompact);
    return () => window.removeEventListener("resize", updateCompact);
  }, []);

  const handleDrawFromDeck = () => {
    if (isMyTurn && gamePhase === "playing") {
      broadcastAction({ type: "DRAW_FROM_DECK" });
    }
  };

  const handleDrawFromDiscard = () => {
    if (isMyTurn && gamePhase === "playing") {
      broadcastAction({ type: "DRAW_FROM_DISCARD" });
    }
  };

  const copyRoomId = () => {
    if (roomId) {
      navigator.clipboard.writeText(roomId);
      toast.success(t('common:success.roomIdCopied'));
    }
  };

  const isPlayerActionable = isMyTurn && gamePhase === "playing";
  const pileCardClass = isCompact
    ? "!w-[82px] sm:!w-[96px] md:!w-[104px] lg:!w-[108px]"
    : "!w-24 sm:!w-28 md:!w-32 lg:!w-28 xl:!w-32";

  const RoomInfoPill = ({ variant }: { variant: "desktop" | "mobile" }) => {
    if (gameMode !== "online" || !roomId) return null;
    const base =
      variant === "desktop"
        ? "flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full border border-border/60 bg-card/80 backdrop-blur-sm shadow-soft text-xs sm:text-sm"
        : "hidden"; // Mobile variant disabled

    const dotClass =
      netStatus === "connected"
        ? "bg-emerald-500"
        : netStatus === "connecting"
          ? "bg-amber-400"
          : "bg-rose-500";

    return (
      <div className={cn(base, "whitespace-nowrap")}>
        <div className={`h-2.5 w-2.5 rounded-full ${dotClass}`} />
        <Cloud className="w-4 h-4 text-secondary" />
        <span className="font-mono text-sm text-foreground">{roomId}</span>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={copyRoomId}>
          <Copy className="h-4 w-4" />
        </Button>
      </div>
    );
  };

  const SidePanelContent = () => (
    <>
      <div className="my-4 p-4 bg-accent/40 backdrop-blur-sm rounded-lg min-h-[60px] border border-border/30">
        <h4 className="font-semibold mb-2 font-heading flex items-center gap-2 text-foreground">
          <ScrollText className="w-4 h-4 text-primary" />
          {t('game.actionLog')}
        </h4>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {actionMessage}
        </p>
      </div>

      <Separator className="my-4 bg-border/50" />
      <div data-tutorial-id="scoreboard">
        <Scoreboard players={players} />
      </div>
      {gameMode === "online" && (
        <>
          <Separator className="my-4 bg-border/50" />
          <div className="h-64">
            <ChatBox />
          </div>
        </>
      )}
    </>
  );

  const backgroundImage = getGameBackgroundAsset();

  const recentMove =
    lastMove && Date.now() - lastMove.timestamp < 2600 ? lastMove : null;
  const recentPlayer =
    recentMove && players.find((p) => p.id === recentMove.playerId);
  const recentMoveLabel = React.useMemo(() => {
    if (!recentMove || !recentPlayer) return null;
    switch (recentMove.action) {
      case "draw":
        return t('actions.drewFromDeck', {
          player: recentPlayer.name,
          context: recentMove.source === 'discard' ? 'discard' : 'deck'
        }).replace('deck', recentMove.source === 'discard' ? t('actions.fromDiscard') : t('actions.fromDeck'));
      case "swap":
        return t('actions.swappedCard', { player: recentPlayer.name });
      case "discard":
        return t('actions.discardedCard', { player: recentPlayer.name });
      case "peek":
        return t('actions.peekedAtCard', { player: recentPlayer.name });
      case "swap_2":
        return t('actions.swappedTwoCards', { player: recentPlayer.name });
      case "take_2":
        return t('actions.keptCard', { player: recentPlayer.name });
      default:
        return null;
    }
  }, [recentMove, recentPlayer, t]);

  const activeSpecialAction = React.useMemo(() => {
    if (drawnCard?.isSpecial && drawnCard.specialAction) {
      return drawnCard.specialAction;
    }
    if (gamePhase === "action_swap_2_select_1" || gamePhase === "action_swap_2_select_2") {
      return "swap_2";
    }
    if (gamePhase === "action_peek_1") {
      return "peek_1";
    }
    if (gamePhase === "action_take_2") {
      return "take_2";
    }
    return null;
  }, [drawnCard, gamePhase]);

  const specialAuraGradient = React.useMemo(() => {
    switch (activeSpecialAction) {
      case "swap_2":
        return "radial-gradient(circle at 50% 50%, rgba(255, 113, 206, 0.18), rgba(33, 0, 44, 0.0) 55%)";
      case "peek_1":
        return "radial-gradient(circle at 50% 50%, rgba(108, 209, 255, 0.22), rgba(0, 10, 30, 0.0) 58%)";
      case "take_2":
        return "radial-gradient(circle at 50% 50%, rgba(255, 221, 150, 0.2), rgba(40, 20, 0, 0.0) 60%)";
      default:
        return null;
    }
  }, [activeSpecialAction]);

  // GSAP Animations
  useGSAP(() => {
    if (!containerRef.current) return;

    // Recent Move Animation
    if (recentMoveLabel) {
      gsap.fromTo(".recent-move-label", 
        { opacity: 0, y: -10 },
        { opacity: 1, y: 0, duration: 0.25, ease: "power2.out" }
      );
    } else {
      gsap.to(".recent-move-label", { opacity: 0, y: -10, duration: 0.25 });
    }

    // Aura Animation
    if (specialAuraGradient) {
      gsap.fromTo(".special-aura",
        { opacity: 0.1, scale: 0.9 },
        { opacity: 0.35, scale: 1, duration: 0.4, ease: "power2.out" }
      );
    } else {
      gsap.to(".special-aura", { opacity: 0, scale: 0.95, duration: 0.4 });
    }

    // Drawn Card Modal Animation with staggered elements
    if (drawnCard && isMyTurn && gamePhase === "holding_card") {
      // Create a timeline for coordinated animations
      const tl = gsap.timeline();
      
      // Backdrop fade in
      tl.fromTo(".drawn-card-backdrop",
        { opacity: 0 },
        { opacity: 1, duration: 0.3, ease: "power2.out" },
        0
      );
      
      // Label slides down first
      tl.fromTo(".drawn-card-label",
        { opacity: 0, y: -30 },
        { opacity: 1, y: 0, duration: 0.4, ease: "power3.out" },
        0.1
      );
      
      // Card scales up with bounce
      tl.fromTo(".drawn-card-scale",
        { opacity: 0, scale: 0.3, y: 40, rotateY: -15 },
        { opacity: 1, scale: 1, y: 0, rotateY: 0, duration: 0.5, ease: "back.out(1.4)" },
        0.15
      );
      
      // Actions fade up
      tl.fromTo(".drawn-card-actions",
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.35, ease: "power2.out" },
        0.35
      );
      
      // Hint fades in last
      tl.fromTo(".drawn-card-hint",
        { opacity: 0 },
        { opacity: 1, duration: 0.4, ease: "power2.out" },
        0.5
      );
      
      // Swap target hand glow pulse
      tl.fromTo(".swap-target-hand",
        { boxShadow: "0 0 20px rgba(147, 51, 234, 0.2)" },
        { 
          boxShadow: "0 0 50px rgba(147, 51, 234, 0.5), 0 0 100px rgba(147, 51, 234, 0.25)",
          duration: 0.8, 
          ease: "power1.inOut",
          repeat: -1,
          yoyo: true 
        },
        0.4
      );
    } else {
      // Clean exit animation
      gsap.to(".drawn-card-content", { opacity: 0, y: -20, duration: 0.25, ease: "power2.in" });
      gsap.to(".drawn-card-backdrop", { opacity: 0, duration: 0.3 });
      gsap.killTweensOf(".swap-target-hand");
    }

  }, { scope: containerRef, dependencies: [recentMoveLabel, specialAuraGradient, drawnCard, isMyTurn, gamePhase] });

  if (players.length === 0) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center font-heading">
        <p>{t('game.loadingGame')}</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative w-full min-h-[100svh] lg:min-h-[100dvh] lg:h-full text-foreground px-1 sm:px-2 md:px-4 lg:px-6 py-2 sm:py-3 flex flex-col lg:flex-row gap-2 sm:gap-3 md:gap-4 bg-cover bg-center overflow-hidden",
        isCompact && "game-compact"
      )}
      style={{
        backgroundImage,
      }}
    >
      {/* Light overlays for better readability on bright background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[rgba(8,12,24,0.9)] via-[rgba(12,15,32,0.8)] to-[rgba(10,8,18,0.9)] pointer-events-none" />
      <div className="absolute inset-0 opacity-60 pointer-events-none" style={{ backgroundImage: backgroundImage }} />
      <div className="absolute -top-32 -left-16 w-72 h-72 rounded-full bg-[hsl(var(--primary)/0.25)] blur-3xl" />
      <div className="absolute top-12 -right-24 w-72 h-72 rounded-full bg-[hsl(var(--accent)/0.2)] blur-3xl" />
      <div className="absolute bottom-10 left-1/3 w-64 h-64 rounded-full bg-[hsl(var(--secondary)/0.16)] blur-3xl" />

      {recentMoveLabel && (
        <div
          className="recent-move-label absolute top-16 sm:top-14 lg:top-6 left-1/2 -translate-x-1/2 z-30 pointer-events-none px-3 w-max"
        >
          <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-card/90 dark:bg-background/90 border border-border/60 shadow-soft">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-xs sm:text-sm font-medium whitespace-nowrap">
              {recentMoveLabel}
            </span>
          </div>
        </div>
      )}

      <main className="flex-grow flex flex-col relative z-10 min-h-0 gap-3 sm:gap-4 overflow-hidden">
        <div

          className={cn(
            "flex flex-row items-center justify-between gap-2 sm:gap-4 px-2 sm:px-4 py-2 sm:py-3 sticky top-0 z-20 backdrop-blur-md bg-background/70 border-b border-border/40",
            isCompact && "py-1.5 sm:py-2"
          )}
        >
          {/* Left Side: Player Info + Actions + Room Code */}
          <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto no-scrollbar mask-linear-fade">
            <div className="flex items-center gap-2 sm:gap-3 bg-card/70 border border-border/60 px-3 sm:px-4 py-2 sm:py-3 rounded-2xl shadow-soft backdrop-blur-lg flex-shrink-0">
              <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] flex items-center justify-center text-[hsl(var(--primary-foreground))] font-heading text-base sm:text-lg shadow-soft">
                {currentPlayer?.name?.charAt(0) ?? 'S'}
              </div>
              <div className="flex flex-col">
                <span className="text-[0.65rem] sm:text-xs uppercase tracking-[0.2em] text-muted-foreground hidden sm:block">
                  {isMyTurn ? t('game.yourTurn') : t('game.playerTurn', { player: currentPlayer?.name ?? '' })}
                </span>
                <span className="text-xs sm:text-sm sm:text-base text-foreground font-semibold whitespace-nowrap">
                  {actionMessage}
                </span>
              </div>
            </div>

            <div className="hidden sm:block">
               <RoomInfoPill variant="desktop" />
            </div>
          </div>

          {/* Right Side: Settings & Menu */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0 bg-card/40 backdrop-blur-sm p-1 rounded-full border border-border/30">
            <LanguageSwitcher />
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
            
            <div className="lg:hidden">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full h-9 w-9 hover:bg-primary/10 hover:text-primary transition-colors">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent className="bg-card/95 backdrop-blur-lg border-border/40">
                  <SheetHeader>
                    <SheetTitle className="font-heading text-2xl">
                      {t('game.gameMenu')}
                    </SheetTitle>
                  </SheetHeader>
                  <ScrollArea className="h-[calc(100%-4rem)] pr-4">
                    <SidePanelContent />
                  </ScrollArea>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>

        {/* Opponents Area */}
        <div
          className={cn(
            "flex justify-start sm:justify-center items-start mt-6 sm:mt-8 lg:mt-8 xl:mt-10 mb-1.5 sm:mb-2 md:mb-3 flex-shrink-0 w-full px-1 sm:px-2 overflow-x-auto",
            isCompact && "mt-2 sm:mt-3 lg:mt-4 mb-1"
          )}
        >
          {otherPlayers.length > 0 ? (
            <div
              className={cn(
                "flex flex-nowrap sm:flex-wrap justify-start sm:justify-center gap-2 sm:gap-3 md:gap-4 lg:gap-6 xl:gap-10 w-full max-w-5xl mx-auto px-2 sm:px-3 py-2 sm:py-3 bg-card/70 border border-border/60 rounded-2xl shadow-soft-lg backdrop-blur-xl overflow-x-auto sm:overflow-visible no-scrollbar",
                isCompact && "gap-2 sm:gap-3 md:gap-3 lg:gap-4 py-2 sm:py-2.5"
              )}
            >
              {otherPlayers.map((player) => (
                <div key={player.id} className="flex-shrink-0 min-w-0">
                  <PlayerHand
                    player={player}
                    isCurrentPlayer={currentPlayer.id === player.id}
                    isOpponent={true}
                    playSound={playSound}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-20 sm:h-24 w-full max-w-md rounded-lg bg-primary/10 border-2 border-dashed border-border/60 mx-auto shadow-soft">
              <p className="text-muted-foreground font-heading text-xs sm:text-sm md:text-base">
                {t('game.waitingForOpponents')}
              </p>
            </div>
          )
          }
        </div>

        {/* Center Area */}
        <div
          className={cn(
            "flex-grow flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 md:gap-8 lg:gap-10 my-6 sm:my-8 md:my-10 min-h-0 w-full",
            isCompact && "gap-2 sm:gap-3 md:gap-5 my-1 sm:my-2"
          )}
          data-tutorial-id="piles"
        >
          <div className="relative w-full flex justify-center">
            {specialAuraGradient && (
              <div
                key={specialAuraGradient}
                className="special-aura absolute inset-[-10%] sm:inset-[-6%] blur-3xl rounded-[32px] pointer-events-none"
                style={{ background: specialAuraGradient }}
              />
            )}
            
            {/* Pile Mat */}
            <div
              className={cn(
                "bg-black/40 border border-white/5 rounded-3xl px-6 sm:px-8 py-6 sm:py-8 shadow-2xl backdrop-blur-xl flex items-center gap-8 sm:gap-12 md:gap-16 relative z-10",
                isCompact && "px-4 sm:px-5 py-4 sm:py-5 gap-4 sm:gap-6 md:gap-8 scale-[0.9]"
              )}
            >
              <div
                className="flex flex-col items-center w-full sm:w-auto"
                data-tutorial-id="draw-pile"
              >
                <div className="relative group">
                    <div className="absolute inset-0 bg-white/5 rounded-xl blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <GameCard
                    card={null}
                    isFaceUp={false}
                    className={cn(
                        isPlayerActionable ? "cursor-pointer" : "",
                        pileCardClass,
                        "shadow-2xl"
                    )}
                    onClick={handleDrawFromDeck}
                    isGlowing={isPlayerActionable}
                    playSound={playSound}
                    />
                </div>
                <div className="mt-3 sm:mt-4 bg-background/40 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 shadow-sm">
                  <span className="text-xs sm:text-sm font-bold text-foreground/90 uppercase tracking-widest text-center">
                    {t('game.draw')}
                  </span>
                </div>
              </div>



              <div
                className="flex flex-col items-center w-full sm:w-auto"
                data-tutorial-id="discard-pile"
              >
                <div className="relative group">
                    <div className="absolute inset-0 bg-white/5 rounded-xl blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <GameCard
                    card={
                        discardPile.length > 0
                        ? discardPile[discardPile.length - 1]
                        : null
                    }
                    isFaceUp={true}
                    className={cn(
                        isPlayerActionable ? "cursor-pointer" : "",
                        pileCardClass,
                        "shadow-2xl"
                    )}
                    onClick={handleDrawFromDiscard}
                    isGlowing={isPlayerActionable && discardPile.length > 0}
                    disableSpecialAnimation
                    playSound={playSound}
                    />
                </div>
                <div className="mt-3 sm:mt-4 bg-background/40 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 shadow-sm">
                  <span className="text-xs sm:text-sm font-bold text-foreground/90 uppercase tracking-widest text-center">
                    {t('game.discard')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Player Area */}
        {bottomPlayer && (
          <div
            className={cn(
              "mt-auto flex-shrink-0 pb-[calc(env(safe-area-inset-bottom)+16px)] sm:pb-3 lg:pb-2",
              isCompact && "pb-[calc(env(safe-area-inset-bottom)+10px)]"
            )}
          >
            <div
              className={cn(
                "flex justify-center mb-2 sm:mb-3 md:mb-4 h-8 sm:h-10 md:h-12",
                isCompact && "mb-1.5 h-9 sm:h-10 md:h-10"
              )}
              data-tutorial-id="game-actions"
            >
              {/* Always render GameActions but hide during holding_card phase - prevents layout shift */}
              <div className={cn(
                "transition-opacity duration-200",
                gamePhase === "holding_card" ? "opacity-0 pointer-events-none" : "opacity-100"
              )}>
                <GameActions />
              </div>
            </div>
            <div
              data-tutorial-id="player-hand"
              className={cn(isCompact && "scale-[0.95] origin-bottom")}
            >
              <PlayerHand
                player={bottomPlayer}
                isCurrentPlayer={currentPlayer.id === bottomPlayer.id}
                playSound={playSound}
              />
            </div>
          </div>
        )}
      </main>

      {/* Side Panel - Desktop */}
      <aside className="hidden lg:flex w-full lg:w-80 lg:max-w-xs flex-shrink-0 bg-card/95 backdrop-blur-lg p-5 rounded-xl border border-border/40 shadow-soft-lg flex-col relative z-10">
        <h2 className="text-3xl font-bold mb-3 text-center font-heading text-foreground">
          Sen
        </h2>
        {gameMode === "hotseat" && (
          <div className="flex items-center justify-center gap-2 mb-2 text-sm text-muted-foreground">
            <Users className="w-4 h-4" />
            <span>{t('game.localGame')}</span>
          </div>
        )}
        <Separator />
        <SidePanelContent />
      </aside>



      {/* Drawn Card Fullscreen Overlay - always mounted, visibility controlled via classes */}
      <div 
        className={cn(
          "fixed inset-0 z-[100] flex flex-col transition-all duration-300",
          drawnCard && isMyTurn && gamePhase === "holding_card"
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        )}
      >
        {/* Dark backdrop */}
        <div 
          className="drawn-card-backdrop absolute inset-0 bg-black/85 backdrop-blur-sm"
        style={{
          background: 'radial-gradient(ellipse 100% 100% at 50% 40%, rgba(10,0,20,0.9) 0%, rgba(0,0,0,0.95) 100%)'
        }}
        />
        
        {/* Ambient glow effects */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] sm:w-[400px] sm:h-[400px] bg-primary/25 rounded-full blur-[80px] sm:blur-[120px]" />
          <div className="absolute top-1/3 left-1/4 w-[150px] h-[150px] sm:w-[200px] sm:h-[200px] bg-accent/20 rounded-full blur-[60px] sm:blur-[80px]" />
          <div className="absolute top-1/3 right-1/4 w-[150px] h-[150px] sm:w-[200px] sm:h-[200px] bg-violet-500/15 rounded-full blur-[60px] sm:blur-[80px]" />
        </div>

        {/* Main content area - card and actions */}
        <div className="relative flex-1 flex flex-col items-center justify-center px-4 pt-16 sm:pt-20 pb-4">
          <div className="drawn-card-content flex flex-col items-center gap-3 sm:gap-4">
            
            {/* Label */}
            <div className="drawn-card-label">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/30 blur-lg rounded-full" />
                <div className="relative bg-gradient-to-r from-background/90 via-card/95 to-background/90 backdrop-blur-xl px-5 sm:px-7 py-2 sm:py-2.5 rounded-full border border-primary/30 shadow-lg">
                  <span className="text-sm sm:text-base font-bold bg-gradient-to-r from-primary via-violet-400 to-accent bg-clip-text text-transparent tracking-[0.12em] uppercase">
                    {t('game.yourCard')}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Drawn card - only render the card when drawnCard exists */}
            {drawnCard && (
              <div className="drawn-card-wrapper relative py-2">
                <div className="absolute -inset-8 sm:-inset-12 bg-primary/20 blur-2xl rounded-full" />
                <div className="absolute -inset-4 sm:-inset-6 bg-primary/30 blur-xl rounded-2xl animate-pulse" />
                
                <div className="drawn-card-scale relative transform scale-110 sm:scale-125 md:scale-[1.35]">
                  <GameCard
                    card={drawnCard}
                    isFaceUp={true}
                    isGlowing
                    className="shadow-[0_0_30px_rgba(168,85,247,0.4),0_15px_40px_rgba(0,0,0,0.5)]"
                  />
                </div>
              </div>
            )}
            
            {/* Action buttons */}
            <div className="drawn-card-actions flex gap-3 sm:gap-4 mt-2">
              <GameActions />
            </div>

            {/* Hint text */}
            <div className="drawn-card-hint flex flex-col items-center gap-1 mt-2">
              <div className="flex items-center gap-2">
                <div className="h-px w-8 sm:w-10 bg-gradient-to-r from-transparent to-white/30" />
                <p className="text-white/50 text-[0.65rem] sm:text-xs font-medium tracking-wider uppercase">
                  {t('game.orSelectCardToSwap')}
                </p>
                <div className="h-px w-8 sm:w-10 bg-gradient-to-l from-transparent to-white/30" />
              </div>
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-primary/60 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </div>
          </div>
        </div>

        {/* Bottom area - player's hand inside overlay */}
        {bottomPlayer && (
          <div className="relative flex-shrink-0 bg-gradient-to-t from-black/60 via-black/40 to-transparent pt-4 pb-[calc(env(safe-area-inset-bottom)+12px)] sm:pb-4">
            <div className="swap-target-hand rounded-xl mx-auto w-fit">
              <PlayerHand
                player={bottomPlayer}
                isCurrentPlayer={currentPlayer.id === bottomPlayer.id}
                playSound={playSound}
              />
            </div>
          </div>
        )}
      </div>

      <ActionModal />
    </div>
  );
};

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
import { Copy, Menu, Users, Cloud, ScrollText, Sparkles, LogOut } from "lucide-react";
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
import { getGameBackgroundAsset, getCardAsset } from "@/lib/cardAssets";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./ThemeToggle";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { usePlayersView } from "@/state/hooks";
import { useNetStatus } from "@/state/selectors";
import { PileCard } from "./PileCard";

interface GameboardProps {
  theme: "light" | "dark";
  toggleTheme: () => void;
}

export const Gameboard: React.FC<GameboardProps> = ({ theme, toggleTheme }) => {
  const { t } = useTranslation();
  const { state, myPlayerId, broadcastAction, playSound, leaveGame } = useGame();
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
  const [isCompact, setIsCompact] = useState(() => {
    if (typeof window !== 'undefined') {
      // Improved compact mode detection for better mobile and small screen support
      return window.innerHeight < 860 || window.innerWidth < 1300;
    }
    return false;
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      // Auto-collapse sidebar on screens narrower than 1400px
      return window.innerWidth >= 1400;
    }
    return true;
  });
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-collapse sidebar when screen width changes
  useEffect(() => {
    const handleResize = () => {
      const shouldBeOpen = window.innerWidth >= 1400;
      setIsSidebarOpen(shouldBeOpen);
      setIsCompact(window.innerHeight < 860 || window.innerWidth < 1300);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const currentPlayer = players[currentPlayerIndex];

  // Determine player positions
  // Compute active player for hotseat (during peeking use peekingState)
  const activeHotseatPlayerId =
    gameMode === "hotseat"
      ? gamePhase === "peeking" && state.peekingState
        ? players[state.peekingState.playerIndex]?.id
        : players[state.currentPlayerIndex]?.id
      : null;

  const turnOwnerId =
    state.gameMode === "hotseat"
      ? activeHotseatPlayerId ?? currentPlayer?.id
      : currentPlayer?.id;

  // Bottom player is fixed in hotseat (player 1) and is "me" in online.
  // We keep seating static for hotseat so players can sit on opposite sides.
  let bottomPlayer: Player;
  let otherPlayers: Player[] = [];

  if (gameMode === "hotseat") {
    bottomPlayer = players[0] || currentPlayer;
    otherPlayers = players.slice(1);
  } else {
    const myPlayer = players.find((p) => p.id === myPlayerId);
    bottomPlayer = myPlayer || currentPlayer;

    if (bottomPlayer) {
      const bottomIndex = players.findIndex((p) => p.id === bottomPlayer.id);
      if (bottomIndex !== -1) {
        otherPlayers = [
          ...players.slice(bottomIndex + 1),
          ...players.slice(0, bottomIndex),
        ];
      } else {
        otherPlayers = players.filter((p) => p.id !== bottomPlayer.id);
      }
    } else {
      otherPlayers = [];
    }
  }

  // In hotseat mode, always allow actions since everyone plays from the same device
  const isMyTurn =
    gameMode === "hotseat"
      ? true
      : currentPlayer?.id === myPlayerId;

  useEffect(() => {
    const updateLayout = () => {
      const h = window.innerHeight;
      const w = window.innerWidth;
      setIsCompact(h < 860 || w < 1300);
    };
    updateLayout();
    window.addEventListener("resize", updateLayout);
    return () => window.removeEventListener("resize", updateLayout);
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
    ? "!w-[clamp(64px,7.5vw,100px)]"
    : "!w-[clamp(68px,7.8vw,104px)]";
  const playerCount = players.length;

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
        <Scoreboard
          entries={orderedEntries.map(({ player, seat }) => ({
            player,
            seat,
            isLocal: player.id === bottomPlayer?.id || player.id === myPlayerId,
            isActive: player.id === turnOwnerId,
          }))}
        />
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

  // Consistent 3 second timing for recent move display across all clients
  const recentMove =
    lastMove && Date.now() - lastMove.timestamp < 3000 ? lastMove : null;
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
      const label = containerRef.current?.querySelector(".recent-move-label");
      if (label) {
        gsap.to(label, { opacity: 0, y: -10, duration: 0.25 });
      }
    }

    // Aura Animation
    if (specialAuraGradient) {
      gsap.fromTo(".special-aura",
        { opacity: 0.1, scale: 0.9 },
        { opacity: 0.35, scale: 1, duration: 0.4, ease: "power2.out" }
      );
    } else {
      const aura = containerRef.current?.querySelector(".special-aura");
      if (aura) {
        gsap.to(aura, { opacity: 0, scale: 0.95, duration: 0.4 });
      }
    }
  }, { scope: containerRef, dependencies: [recentMoveLabel, specialAuraGradient] });

  if (players.length === 0) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center font-heading">
        <p>{t('game.loadingGame')}</p>
      </div>
    );
  }

  const isFocusPhase = [
    "action_peek_1",
    "action_swap_2_select_1",
    "action_swap_2_select_2",
  ].includes(gamePhase);

  type SeatPosition = "bottom" | "top" | "left" | "right" | "bench";
  const seatFor = (idx: number, total: number): SeatPosition => {
    if (total === 1) return "top";
    if (total === 2) return idx === 0 ? "left" : "right";
    return idx === 0 ? "top" : idx === 1 ? "left" : idx === 2 ? "right" : "bench";
  };

  const seatingEntries: { player: Player; seat: SeatPosition }[] = bottomPlayer
    ? [
      { player: bottomPlayer, seat: "bottom" },
      ...otherPlayers.map((p, idx) => ({
        player: p,
        seat: seatFor(idx, otherPlayers.length),
      })),
    ]
    : otherPlayers.map((p, idx) => ({
      player: p,
      seat: seatFor(idx, otherPlayers.length),
    }));

  const seatOrder: SeatPosition[] = ["bottom", "top", "left", "right", "bench"];
  const orderedEntries = [...seatingEntries].sort(
    (a, b) => seatOrder.indexOf(a.seat) - seatOrder.indexOf(b.seat),
  );
  const seatMap = seatingEntries.reduce<Record<SeatPosition, Player | undefined>>((acc, entry) => {
    acc[entry.seat] = entry.player;
    return acc;
  }, { bottom: undefined, top: undefined, left: undefined, right: undefined, bench: undefined });
  const benchPlayers = seatingEntries.filter((s) => s.seat === "bench").map((s) => s.player);

  const handleExitGame = () => {
    leaveGame();
    toast.message(t('game.returnedToLobby', { defaultValue: 'Returned to lobby' }));
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative w-full min-h-[100svh] lg:min-h-[100dvh] lg:h-full text-foreground px-1 sm:px-2 md:px-3 lg:px-4 py-2 sm:py-3 flex flex-col lg:flex-row gap-2 sm:gap-3 md:gap-4 bg-cover bg-center overflow-x-hidden overflow-y-auto styled-scrollbar",
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
      <div
        className={cn(
          "absolute inset-0 pointer-events-none transition-opacity duration-250 bg-[radial-gradient(circle_at_center,rgba(8,6,18,0),rgba(6,4,12,0))] z-20",
          isFocusPhase &&
            "opacity-100 bg-[radial-gradient(circle_at_center,rgba(8,6,18,0.55),rgba(6,4,12,0.7))] md:bg-[radial-gradient(70%_70%_at_50%_45%,rgba(8,6,18,0.42),rgba(6,4,12,0.68))]"
        )}
      />

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

      <div
        className="flex-1 flex flex-col relative z-10 min-h-0 w-full transition-all duration-300"
      >
      <main className="flex-grow flex flex-col min-h-0 gap-3 sm:gap-4 overflow-visible w-full">
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
            <Button
              variant="ghost"
              size="sm"
              className="px-3 h-9 rounded-full text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={handleExitGame}
            >
              <LogOut className="h-4 w-4 mr-1.5" />
              {t('game.exitGame', { defaultValue: 'Exit' })}
            </Button>
            {/* Sidebar toggle - always visible on lg screens */}
            <Button
              variant="ghost"
              size="icon"
              className="hidden lg:flex rounded-full h-9 w-9 hover:bg-primary/10 hover:text-primary transition-colors"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              title={isSidebarOpen ? t('game.hideSidebar', { defaultValue: 'Hide sidebar' }) : t('game.showSidebar', { defaultValue: 'Show sidebar' })}
            >
              <Menu className="h-5 w-5" />
            </Button>
            {/* Mobile sheet menu - visible on small screens */}
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

        {/* Ring Layout: top/left/right around piles, bottom stays anchored */}
        <div
          className={cn(
            "grid grid-rows-[auto_1fr_auto] gap-2 sm:gap-3 lg:gap-4 xl:gap-5 items-center justify-items-center w-full flex-1 px-2 sm:px-4 lg:px-6 mt-4 sm:mt-6 mb-4 sm:mb-6",
            // Default 3-column layout
            "grid-cols-[minmax(80px,1fr)_minmax(0,2fr)_minmax(80px,1fr)]",
            isCompact && "gap-2 sm:gap-3 mt-3 sm:mt-4",
            !isSidebarOpen && "lg:px-8 xl:px-12"
          )}
        >
          {/* Top seat - rotated 180deg for tablet play */}
          <div className="col-start-2 row-start-1 rotate-180">
            {seatMap.top && (
              <PlayerHand
                player={seatMap.top}
                isCurrentPlayer={
                  gameMode === "hotseat"
                    ? activeHotseatPlayerId === seatMap.top.id
                    : currentPlayer.id === seatMap.top.id
                }
                isOpponent
                isLocalPlayer={false}
                playSound={playSound}
              />
            )}
          </div>

          {/* Left seat - rotated 90deg for tablet play, cards face center */}
          <div className="col-start-1 row-start-2 self-center rotate-90 origin-center">
            {seatMap.left && (
              <PlayerHand
                player={seatMap.left}
                orientation="horizontal"
                isCurrentPlayer={
                  gameMode === "hotseat"
                    ? activeHotseatPlayerId === seatMap.left.id
                    : currentPlayer.id === seatMap.left.id
                }
                isOpponent
                isLocalPlayer={false}
                playSound={playSound}
              />
            )}
          </div>

          {/* Center Piles */}
          <div
            className="col-start-2 row-start-2 w-full flex justify-center"
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
                  "bg-black/40 border border-white/5 rounded-3xl px-3 sm:px-4 md:px-5 py-3.5 sm:py-4.5 md:py-5.5 shadow-2xl backdrop-blur-xl inline-flex items-center justify-center gap-4.5 sm:gap-6.5 md:gap-8 relative z-10 mx-auto",
                  isCompact && "px-2.5 sm:px-3.5 py-3 sm:py-3.5 gap-4 sm:gap-5 md:gap-6",
                  isFocusPhase && "ring-[1.5px] ring-primary/25 shadow-[0_18px_40px_rgba(0,0,0,0.5)] bg-black/45"
                )}
              >
                <div
                  className="flex flex-col items-center w-full sm:w-auto"
                  data-tutorial-id="draw-pile"
                >
                  <div className="relative group">
                      <div className="absolute inset-0 bg-white/5 rounded-xl blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      <PileCard
                        card={null}
                        faceUp={false}
                        onClick={handleDrawFromDeck}
                        isGlowing={isPlayerActionable}
                        className={cn(
                          isPlayerActionable ? "cursor-pointer" : "",
                          pileCardClass,
                          "shadow-2xl"
                        )}
                      />
                  </div>
                  <div className="mt-3 sm:mt-4 bg-background/40 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 shadow-sm whitespace-nowrap">
                    <span className="text-xs sm:text-sm font-bold text-foreground/90 uppercase tracking-widest text-center">
                      {t('game.draw')}
                    </span>
                  </div>
                  <div className={cn(
                    "mt-2 sm:mt-2.5 px-2 py-1 rounded-full border text-xs font-semibold whitespace-nowrap",
                    state.drawPile.length < 3
                      ? "bg-red-500/20 border-red-500/40 text-red-200 animate-pulse"
                      : state.drawPile.length < 10
                      ? "bg-yellow-500/20 border-yellow-500/40 text-yellow-200"
                      : "bg-green-500/20 border-green-500/40 text-green-200"
                  )}>
                    {state.drawPile.length} {t('game.cards')}
                  </div>
                </div>

                {/* Drawn Card Slot - Always present to prevent layout shift */}
                <div className="flex flex-col items-center w-full sm:w-auto">
                  {drawnCard && isMyTurn && gamePhase === "holding_card" ? (
                    <>
                      <div className="relative animate-in fade-in duration-300">
                        <div className="absolute -inset-2 bg-primary/30 rounded-xl blur-md animate-pulse" />
                        <GameCard
                          card={drawnCard}
                          isFaceUp={true}
                          isGlowing
                          className={cn(pileCardClass, "shadow-2xl ring-2 ring-primary/60")}
                          playSound={playSound}
                        />
                      </div>
                      <div className="mt-3 sm:mt-4 bg-primary/20 backdrop-blur-md px-3 py-1 rounded-full border border-primary/30 shadow-sm animate-in slide-in-from-top-2 duration-300 whitespace-nowrap">
                        <span className="text-xs sm:text-sm font-bold text-primary uppercase tracking-widest text-center">
                          {t('game.yourCard')}
                        </span>
                      </div>
                    </>
                  ) : (
                    /* Placeholder to maintain layout stability */
                    <>
                      <div className={cn(pileCardClass, "opacity-0 pointer-events-none")} style={{ aspectRatio: "836/1214" }} />
                      <div className="mt-3 sm:mt-4 h-[26px] sm:h-[30px] w-full opacity-0 pointer-events-none" />
                    </>
                  )}
                </div>

                <div
                  className="flex flex-col items-center w-full sm:w-auto"
                  data-tutorial-id="discard-pile"
                >
                  <div className="relative group">
                      <div className="absolute inset-0 bg-white/5 rounded-xl blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      <PileCard
                        card={
                          discardPile.length > 0
                            ? discardPile[discardPile.length - 1]
                            : null
                        }
                        faceUp={true}
                        onClick={handleDrawFromDiscard}
                        isGlowing={isPlayerActionable && discardPile.length > 0}
                        className={cn(
                          isPlayerActionable ? "cursor-pointer" : "",
                          pileCardClass,
                          "shadow-2xl"
                        )}
                        valueBadge={
                          discardPile.length > 1 ? (
                            <div className="px-2 py-1 rounded-full bg-background/80 border border-border/60 text-[11px] font-semibold shadow-sm">
                              +{Math.min(discardPile.length - 1, 9)}
                            </div>
                          ) : null
                        }
                      />
                  </div>
                  <div className="mt-3 sm:mt-4 bg-background/40 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 shadow-sm whitespace-nowrap">
                    <span className="text-xs sm:text-sm font-bold text-foreground/90 uppercase tracking-widest text-center">
                      {t('game.discard')}
                    </span>
                  </div>
                  {state.discardPile.length > 0 && (
                    <div className="mt-2 sm:mt-2.5 px-2 py-1 rounded-full border border-white/20 bg-white/5 text-xs font-semibold text-foreground/70 whitespace-nowrap">
                      {state.discardPile.length} {t('game.cards')}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right seat - rotated -90deg for tablet play, cards face center */}
          <div className="col-start-3 row-start-2 self-center -rotate-90 origin-center">
            {seatMap.right && (
              <PlayerHand
                player={seatMap.right}
                orientation="horizontal"
                isCurrentPlayer={
                  gameMode === "hotseat"
                    ? activeHotseatPlayerId === seatMap.right.id
                    : currentPlayer.id === seatMap.right.id
                }
                isOpponent
                isLocalPlayer={false}
                playSound={playSound}
              />
            )}
          </div>

          {/* Bottom seat + actions */}
          {bottomPlayer && (
            <div className="col-start-2 row-start-3 w-full flex flex-col items-center gap-2 sm:gap-3">
              {/* Central game actions - only show for online mode */}
              {gameMode !== "hotseat" && (
                <div
                  className="min-h-[56px] w-full max-w-xl flex items-center justify-center"
                  data-tutorial-id="game-actions"
                >
                  <GameActions />
                </div>
              )}
              <div
                data-tutorial-id="player-hand"
                className="w-full flex justify-center"
              >
                <PlayerHand
                  player={bottomPlayer}
                  isCurrentPlayer={
                    gameMode === "hotseat"
                      ? activeHotseatPlayerId === bottomPlayer.id
                      : currentPlayer.id === bottomPlayer.id
                  }
                  isOpponent={
                    gameMode === "hotseat"
                      ? activeHotseatPlayerId !== bottomPlayer.id
                      : false
                  }
                  isLocalPlayer
                  playSound={playSound}
                />
              </div>
            </div>
          )}
        </div>

        {/* Extra bench players (5+) */}
        {benchPlayers.length > 0 && (
          <div className="w-full max-w-5xl mx-auto mb-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4 justify-items-center">
              {benchPlayers.map((player) => (
                <PlayerHand
                  key={player.id}
                  player={player}
                  isCurrentPlayer={
                    gameMode === "hotseat"
                      ? activeHotseatPlayerId === player.id
                      : currentPlayer.id === player.id
                  }
                  isOpponent
                  isLocalPlayer={false}
                  playSound={playSound}
                />
              ))}
            </div>
          </div>
        )}
      </main>
      </div>

      {/* Side Panel - Desktop (collapsible) */}
      <aside
        className={cn(
          "hidden lg:flex bg-card/95 backdrop-blur-lg rounded-xl border border-border/40 shadow-soft-lg flex-col relative z-10 transition-all duration-300 ease-in-out overflow-hidden",
          isSidebarOpen ? "w-80 max-w-xs p-5 flex-shrink-0" : "w-0 p-0 border-0 flex-shrink"
        )}
      >
        <div className={cn("transition-opacity duration-200", isSidebarOpen ? "opacity-100" : "opacity-0")}>
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
        </div>
      </aside>

      <ActionModal />
    </div>
  );
};

import React from "react";
import { useGame } from "@/context/GameContext";
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
import { AnimatePresence, motion } from "framer-motion";
import { getGameBackgroundAsset } from "@/lib/cardAssets";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./ThemeToggle";
import { LanguageSwitcher } from "./LanguageSwitcher";
import {
  usePlayersView,
  useIsMyTurn,
  useCurrentPlayer,
  useGamePhase,
  useGameMode,
  useDrawPileCount,
  useDiscardTop,
  useDrawnCard,
  useActionMessage,
  useRoomId,
  useLastMove,
  useMyPlayerId,
  useCanTakeAction,
} from "@/state/hooks";

interface GameboardProps {
  theme: "light" | "dark";
  toggleTheme: () => void;
}

export const Gameboard: React.FC<GameboardProps> = ({ theme, toggleTheme }) => {
  const { t } = useTranslation();
  const { broadcastAction, playSound } = useGame();
  
  // Use unified state hooks
  const players = usePlayersView();
  const currentPlayer = useCurrentPlayer();
  const isMyTurn = useIsMyTurn();
  const gamePhase = useGamePhase();
  const gameMode = useGameMode();
  const drawPileCount = useDrawPileCount();
  const discardTop = useDiscardTop();
  const drawnCard = useDrawnCard();
  const actionMessage = useActionMessage();
  const roomId = useRoomId();
  const lastMove = useLastMove();
  const myPlayerId = useMyPlayerId();
  const isPlayerActionable = useCanTakeAction();

  const currentPlayerIndex = players.findIndex(p => p.id === currentPlayer?.id);

  // Determine player positions
  // Bottom player is always "me" (online) or current player (hotseat)
  // Other players are distributed around the top area

  let bottomPlayer: Player;
  let otherPlayers: Player[] = [];

  if (gameMode === "hotseat") {
    // In hotseat, the current player is always at the bottom
    bottomPlayer = currentPlayer!;
    // Other players are everyone else, ordered by turn order relative to current player
    otherPlayers = [
      ...players.slice(currentPlayerIndex + 1),
      ...players.slice(0, currentPlayerIndex),
    ];
  } else {
    // Online mode: show my player at bottom
    bottomPlayer = players.find((p) => p.id === myPlayerId) || currentPlayer!;
    // Other players ordered by turn order relative to me
    const myIndex = players.findIndex(p => p.id === bottomPlayer?.id);
    if (myIndex !== -1) {
      otherPlayers = [
        ...players.slice(myIndex + 1),
        ...players.slice(0, myIndex),
      ];
    } else {
      otherPlayers = players.filter(p => p.id !== bottomPlayer?.id);
    }
  }

  const handleDrawFromDeck = () => {
    if (isPlayerActionable) {
      broadcastAction({ type: "DRAW_FROM_DECK" });
    }
  };

  const handleDrawFromDiscard = () => {
    if (isPlayerActionable) {
      broadcastAction({ type: "DRAW_FROM_DISCARD" });
    }
  };

  const copyRoomId = () => {
    if (roomId) {
      navigator.clipboard.writeText(roomId);
      toast.success(t('common:success.roomIdCopied'));
    }
  };

  const pileCardClass =
    "!w-20 sm:!w-24 md:!w-28 lg:!w-24 xl:!w-28";

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

  if (players.length === 0) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center font-heading">
        <p>{t('game.loadingGame')}</p>
      </div>
    );
  }

  return (
    <div
      className="relative w-full min-h-[100svh] lg:min-h-[100dvh] lg:h-full text-foreground px-1 sm:px-2 md:px-4 lg:px-6 py-2 sm:py-3 flex flex-col lg:flex-row gap-2 sm:gap-3 md:gap-4 bg-cover bg-center overflow-hidden"
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

      <AnimatePresence>
        {recentMoveLabel && (
          <motion.div
            key="recent-move"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            className="absolute top-16 sm:top-14 lg:top-6 left-1/2 -translate-x-1/2 z-30 pointer-events-none px-3 w-max"
          >
            <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-card/90 dark:bg-background/90 border border-border/60 shadow-soft">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-xs sm:text-sm font-medium whitespace-nowrap">
                {recentMoveLabel}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-grow flex flex-col justify-between relative z-10 min-h-0 gap-2 sm:gap-3 overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3 px-1 sm:px-3 md:px-4 py-2 sm:py-3 flex-shrink-0 z-20 backdrop-blur-md bg-background/70 border-b border-border/40">
          <div className="flex items-center gap-3 bg-card/70 border border-border/60 px-3 py-2 sm:px-4 sm:py-3 rounded-2xl shadow-soft backdrop-blur-lg">
            <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] flex items-center justify-center text-[hsl(var(--primary-foreground))] font-heading text-base sm:text-lg shadow-soft">
              {currentPlayer?.name?.charAt(0) ?? 'S'}
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] sm:text-xs uppercase tracking-[0.2em] text-muted-foreground">
                {isMyTurn ? t('game.yourTurn') : t('game.playerTurn', { player: currentPlayer?.name ?? '' })}
              </span>
              <span className="text-xs sm:text-sm md:text-base text-foreground font-semibold">
                {actionMessage}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {gameMode === "online" && roomId && (
              <div className="flex items-center gap-2 bg-card/70 px-3 py-2 rounded-xl border border-border/60 shadow-soft lg:hidden">
                <Cloud className="w-4 h-4 text-secondary" />
                <span className="font-mono text-sm text-foreground">{roomId}</span>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={copyRoomId}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            )}
            <div className="hidden sm:flex items-center gap-2">
              <LanguageSwitcher />
              <ThemeToggle theme={theme} onToggle={toggleTheme} />
            </div>
          </div>
        </div>

        {/* Opponents Area */}
        <div className="flex justify-start sm:justify-center items-start flex-shrink-0 w-full px-1 sm:px-2 overflow-x-auto relative z-20">
          {otherPlayers.length > 0 ? (
            <div className="flex flex-nowrap sm:flex-wrap justify-start sm:justify-center gap-1 sm:gap-2 md:gap-3 lg:gap-4 w-full max-w-5xl mx-auto px-2 py-1.5 sm:py-2 bg-card/70 border border-border/60 rounded-2xl shadow-soft-lg backdrop-blur-xl overflow-x-auto sm:overflow-visible relative z-20">
              {otherPlayers.map((player) => (
                <div key={player.id} className="flex-shrink-0 min-w-0">
                  <PlayerHand
                    player={player}
                    isCurrentPlayer={currentPlayer?.id === player.id}
                    isOpponent={true}
                    playSound={playSound}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-16 sm:h-20 w-full max-w-md rounded-lg bg-primary/10 border-2 border-dashed border-border/60 mx-auto shadow-soft">
              <p className="text-muted-foreground font-heading text-xs sm:text-sm md:text-base">
                {t('game.waitingForOpponents')}
              </p>
            </div>
          )
          }
        </div>

        {/* Center Area */}
        <div
          className="flex-shrink-0 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 md:gap-6 w-full"
          data-tutorial-id="piles"
        >
          <div className="relative w-auto flex justify-center">
            <AnimatePresence>
              {specialAuraGradient && (
                <motion.div
                  key={specialAuraGradient}
                  className="absolute inset-[-10%] sm:inset-[-6%] blur-3xl rounded-[32px] pointer-events-none z-0"
                  style={{ background: specialAuraGradient }}
                  initial={{ opacity: 0.1, scale: 0.9 }}
                  animate={{ opacity: 0.35, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                />
              )}
            </AnimatePresence>
            <div className="bg-card/70 border border-border/60 rounded-2xl px-3 sm:px-4 py-3 sm:py-4 shadow-soft-lg backdrop-blur-xl flex items-center gap-3 sm:gap-5 md:gap-6 relative z-10">
              <div
                className="flex flex-col items-center w-full sm:w-auto"
                data-tutorial-id="draw-pile"
              >
                <GameCard
                  card={null}
                  isFaceUp={false}
                  className={cn(
                    isPlayerActionable ? "cursor-pointer" : "",
                    pileCardClass,
                  )}
                  onClick={handleDrawFromDeck}
                  isGlowing={isPlayerActionable}
                  playSound={playSound}
                />
                <span className="mt-1 sm:mt-1.5 text-xs sm:text-sm md:text-base font-medium text-foreground text-center">
                  {t('game.draw')} ({drawPileCount})
                </span>
              </div>

              <AnimatePresence>
                {drawnCard && isMyTurn && gamePhase === "holding_card" && (
                  <motion.div
                    className="flex flex-col items-center px-2"
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    transition={{ duration: 0.3 }}
                  >
                    <p className="mb-2 text-sm sm:text-base font-semibold font-heading text-foreground">
                      {t('game.yourCard')}
                    </p>
                    <GameCard
                      card={drawnCard}
                      isFaceUp={true}
                      isGlowing
                      className={pileCardClass}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              <div
                className="flex flex-col items-center w-full sm:w-auto"
                data-tutorial-id="discard-pile"
              >
                <GameCard
                  card={discardTop}
                  isFaceUp={true}
                  className={cn(
                    isPlayerActionable ? "cursor-pointer" : "",
                    pileCardClass,
                  )}
                  onClick={handleDrawFromDiscard}
                  isGlowing={isPlayerActionable && discardTop !== null}
                  disableSpecialAnimation
                  playSound={playSound}
                />
                <span className="mt-1 sm:mt-1.5 text-xs sm:text-sm md:text-base font-medium text-foreground text-center">
                  {t('game.discard')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Player Area */}
        {bottomPlayer && (
          <div className="flex-shrink-0 pb-[calc(env(safe-area-inset-bottom)+8px)] sm:pb-2">
            <div data-tutorial-id="player-hand">
              <PlayerHand
                player={bottomPlayer}
                isCurrentPlayer={currentPlayer?.id === bottomPlayer.id}
                playSound={playSound}
              />
            </div>
            <div
              className="flex justify-center mt-1 sm:mt-2 h-8 sm:h-10"
              data-tutorial-id="game-actions"
            >
              <GameActions />
            </div>
          </div>
        )}
      </main>

      {/* Side Panel - Desktop */}
      <aside className="hidden lg:flex w-full lg:w-80 lg:max-w-xs flex-shrink-0 bg-card/95 backdrop-blur-lg p-5 rounded-xl border border-border/40 shadow-soft-lg flex-col relative z-10">
        <h2 className="text-3xl font-bold mb-3 text-center font-heading text-foreground">
          Sen
        </h2>
        {gameMode === "online" && roomId && (
          <div className="flex items-center justify-center gap-2 mb-2 text-sm text-muted-foreground">
            <Cloud className="w-4 h-4" />
            <span>{roomId}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={copyRoomId}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        )}
        {gameMode === "hotseat" && (
          <div className="flex items-center justify-center gap-2 mb-2 text-sm text-muted-foreground">
            <Users className="w-4 h-4" />
            <span>{t('game.localGame')}</span>
          </div>
        )}
        <Separator />
        <SidePanelContent />
      </aside>

      {/* Side Panel Trigger - Mobile */}
      <div className="lg:hidden absolute top-2 right-2 z-20 flex gap-2">
        <LanguageSwitcher />
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="rounded-full h-10 w-10 border-border/60 bg-card/80 backdrop-blur-sm shadow-soft hover:scale-105 transition-transform">
              <Menu />
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

      <ActionModal />
    </div>
  );
};

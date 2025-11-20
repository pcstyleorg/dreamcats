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

interface GameboardProps {
  theme: "light" | "dark";
  toggleTheme: () => void;
}

export const Gameboard: React.FC<GameboardProps> = ({ theme, toggleTheme }) => {
  const { t } = useTranslation();
  const { state, myPlayerId, broadcastAction, playSound } = useGame();
  const {
    players,
    currentPlayerIndex,
    drawPile,
    discardPile,
    gamePhase,
    actionMessage,
    roomId,
    drawnCard,
    gameMode,
    lastMove,
  } = state;

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
    bottomPlayer = players.find((p) => p.id === myPlayerId) || currentPlayer;
    // Other players ordered by turn order relative to me
    const myIndex = players.findIndex(p => p.id === bottomPlayer.id);
    if (myIndex !== -1) {
      otherPlayers = [
        ...players.slice(myIndex + 1),
        ...players.slice(0, myIndex),
      ];
    } else {
      otherPlayers = players.filter(p => p.id !== bottomPlayer.id);
    }
  }

  const isMyTurn =
    gameMode === "online" ? currentPlayer?.id === myPlayerId : true;

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
  const pileCardClass =
    "!w-[34vw] !max-w-[6.5rem] sm:!w-36 sm:!max-w-[8.5rem] md:!w-40 md:!max-w-[9.5rem] lg:!w-48 lg:!max-w-[10.5rem]";

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

  if (players.length === 0) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center font-heading">
        <p>{t('game.loadingGame')}</p>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 lg:relative lg:w-full lg:h-full w-full h-full text-foreground px-1 sm:px-2 md:px-4 lg:px-6 py-2 sm:py-3 flex flex-col lg:flex-row gap-2 sm:gap-3 md:gap-4 bg-cover bg-center overflow-hidden"
      style={{
        backgroundImage: `url(${backgroundImage})`,
      }}
    >
      {/* Light overlays for better readability on bright background */}
      <div className="absolute inset-0 bg-white/35 dark:bg-black/45 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-b from-white/25 via-transparent to-white/20 dark:from-black/60 dark:via-transparent dark:to-black/50 pointer-events-none" />

      <AnimatePresence>
        {recentMoveLabel && (
          <motion.div
            key="recent-move"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            className="absolute top-3 left-1/2 -translate-x-1/2 z-30 pointer-events-none"
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

      <main className="flex-grow flex flex-col relative z-10 min-h-0">
        {/* Opponents Area */}
        <div className="flex justify-center items-start mt-12 mb-1.5 sm:mb-3 md:mb-4 flex-shrink-0 w-full px-1 sm:px-2">
          {otherPlayers.length > 0 ? (
            <div className="flex flex-wrap justify-center gap-2 sm:gap-3 md:gap-4 w-full max-w-5xl mx-auto px-2 sm:px-3 py-2">
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
            <div className="flex items-center justify-center h-20 sm:h-24 w-full max-w-md rounded-lg bg-purple-50/50 border-2 border-dashed border-purple-200/60 mx-auto">
              <p className="text-muted-foreground font-heading text-xs sm:text-sm md:text-base">
                {t('game.waitingForOpponents')}
              </p>
            </div>
          )
          }
        </div>

        {/* Center Area */}
        <div
          className="flex-grow flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 md:gap-6 lg:gap-8 my-2 sm:my-3 md:my-4 min-h-0 w-full"
          data-tutorial-id="piles"
        >
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
            <span className="mt-1 sm:mt-1.5 text-xs sm:text-sm md:text-base font-medium text-foreground dark:text-gray-200 text-center">
              {t('game.draw')} ({drawPile.length})
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
                <p className="mb-2 text-sm sm:text-base font-semibold font-heading text-foreground dark:text-purple-300">
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
              card={
                discardPile.length > 0
                  ? discardPile[discardPile.length - 1]
                  : null
              }
              isFaceUp={true}
              className={cn(
                isPlayerActionable ? "cursor-pointer" : "",
                pileCardClass,
              )}
              onClick={handleDrawFromDiscard}
              isGlowing={isPlayerActionable && discardPile.length > 0}
              disableSpecialAnimation
              playSound={playSound}
            />
            <span className="mt-1 sm:mt-1.5 text-xs sm:text-sm md:text-base font-medium text-foreground dark:text-gray-200 text-center">
              {t('game.discard')}
            </span>
          </div>
        </div>

        {/* Bottom Player Area */}
        {bottomPlayer && (
          <div className="mt-auto flex-shrink-0 pb-8 sm:pb-2">
            <div data-tutorial-id="player-hand">
              <PlayerHand
                player={bottomPlayer}
                isCurrentPlayer={currentPlayer.id === bottomPlayer.id}
                playSound={playSound}
              />
            </div>
            <div
              className="flex justify-center mt-1 sm:mt-2 md:mt-3 h-8 sm:h-10 md:h-12"
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

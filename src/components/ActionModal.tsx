import React from "react";
import { useGame } from "@/state/useGame";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "./ui/button";
import { GameCard } from "./Card";
import { Card as CardType } from "@/types";
import { useTranslation } from "react-i18next";

export const ActionModal: React.FC = () => {
  const { t } = useTranslation();
  const { state, broadcastAction, myPlayerId } = useGame();
  const { gamePhase, tempCards, lastRoundScores, gameWinnerName, players, currentPlayerIndex } =
    state;

  const isMyTurn =
    state.gameMode === "hotseat" ||
    players[currentPlayerIndex]?.id === myPlayerId;

  const handleTake2Choose = (card: CardType) => {
    broadcastAction({ type: "ACTION_TAKE_2_CHOOSE", payload: { card } });
  };

  const handleNewRound = () => {
    broadcastAction({ type: "START_NEW_ROUND" });
  };

  const renderTake2Content = () => (
    <>
      <DialogHeader className="space-y-2 sm:space-y-3">
        <DialogTitle className="font-heading text-xl sm:text-2xl md:text-3xl text-center">
          {t('modal.take2Title')}
        </DialogTitle>
        <DialogDescription className="text-sm sm:text-base text-center">
          {t('modal.take2Description')}
        </DialogDescription>
      </DialogHeader>
      <div className="flex justify-center gap-4 sm:gap-6 md:gap-8 py-4 sm:py-6 flex-wrap">
        {tempCards?.map((card) => (
          <div key={card.id} className="flex flex-col items-center gap-3">
            <GameCard card={card} isFaceUp={true} />
            <Button
              onClick={() => handleTake2Choose(card)}
              className="min-w-[100px] min-h-[48px] text-base font-semibold"
              size="lg"
            >
              {t('modal.choose')}
            </Button>
          </div>
        ))}
      </div>
    </>
  );

  const renderRoundEndContent = () => (
    <>
      <DialogHeader className="space-y-2 sm:space-y-3">
        <DialogTitle className="font-heading text-xl sm:text-2xl md:text-3xl text-center">
          {t('modal.roundOverTitle')}
        </DialogTitle>
        <DialogDescription className="text-sm sm:text-base text-center">
          {state.actionMessage}
        </DialogDescription>
      </DialogHeader>
      <div className="py-3 sm:py-4 md:py-6">
        <ul className="space-y-3 sm:space-y-4 bg-accent/30 rounded-lg p-3 sm:p-4 border border-border/30">
          {lastRoundScores?.map(({ playerId, score, penalty }) => {
            const player = players.find((p) => p.id === playerId);
            return (
              <li
                key={playerId}
                className="flex justify-between items-center text-sm sm:text-base py-2 border-b border-border/30 last:border-0"
              >
                <span className="font-medium">{player?.name}</span>
                <span className="font-mono text-sm sm:text-base">
                  {score}{" "}
                  {penalty > 0 && (
                    <span className="text-destructive font-semibold">
                      + {penalty}
                    </span>
                  )}{" "}
                  <span className="font-bold">= {score + penalty}</span>
                </span>
              </li>
            );
          })}
        </ul>
      </div>
      <Button
        onClick={handleNewRound}
        className="w-full min-h-[52px] text-base sm:text-lg font-semibold"
        size="lg"
      >
        {t('modal.startNextRound')}
      </Button>
    </>
  );

  const renderGameOverContent = () => (
    <>
      <DialogHeader className="space-y-2 sm:space-y-3">
        <DialogTitle className="font-heading text-2xl sm:text-3xl md:text-4xl text-center bg-gradient-to-br from-purple-600 to-pink-600 bg-clip-text text-transparent">
          {t('modal.gameOverTitle')}
        </DialogTitle>
        <DialogDescription className="text-base sm:text-lg text-center font-semibold">
          {t('modal.winsTheGame', { player: gameWinnerName || "Unknown" })}
        </DialogDescription>
      </DialogHeader>
      <div className="py-3 sm:py-4 md:py-6">
        <h4 className="font-bold mb-3 sm:mb-4 font-heading text-base sm:text-lg text-center">
          {t('modal.finalScores')}
        </h4>
        <ul className="space-y-3 sm:space-y-4 bg-accent/30 rounded-lg p-3 sm:p-4 border-2 border-border/50">
          {players
            .sort((a, b) => a.score - b.score)
            .map((player, index) => (
              <li
                key={player.id}
                className="flex justify-between items-center text-sm sm:text-base py-2 border-b border-border/30 last:border-0"
              >
                <span className="flex items-center gap-2">
                  <span className="text-lg sm:text-xl">
                    {index === 0 ? "🥇" : index === 1 ? "🥈" : ""}
                  </span>
                  <span className="font-medium">{player.name}</span>
                </span>
                <span className="font-mono font-bold text-base sm:text-lg">
                  {player.score}
                </span>
              </li>
            ))}
        </ul>
      </div>
    </>
  );



  const isOpen =
    (gamePhase === "action_take_2" && isMyTurn) ||
    gamePhase === "round_end" ||
    gamePhase === "game_over";

  // Only allow dismissing on non-critical phases to prevent players from closing during their action
  const canDismiss = gamePhase === "round_end" || gamePhase === "game_over";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      // Only allow closing if it's safe to dismiss
      if (!open && !canDismiss) {
        return; // Prevent closing during active game phases
      }
    }}>
      <DialogContent className="bg-background/95 backdrop-blur-lg border-2 border-border/50 shadow-dreamy max-w-[calc(100vw-2rem)] sm:max-w-md md:max-w-lg">
        {gamePhase === "action_take_2" && renderTake2Content()}
        {gamePhase === "round_end" && renderRoundEndContent()}
        {gamePhase === "game_over" && renderGameOverContent()}
      </DialogContent>
    </Dialog>
  );
};

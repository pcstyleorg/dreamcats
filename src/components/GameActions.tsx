import React from "react";
import { useGame } from "@/state/useGame";
import { Button } from "./ui/button";
import { Wand2 } from "lucide-react";
import { useTranslation } from "react-i18next";

export const GameActions: React.FC = () => {
  const { t } = useTranslation("translation");
  const { state, broadcastAction, myPlayerId } = useGame();
  const {
    gamePhase,
    peekingState,
    drawnCard,
    drawSource,
    gameMode,
    currentPlayerIndex,
  } = state;

  const currentPlayer = state.players[currentPlayerIndex];

  // In hotseat mode, we always allow the active player to take actions
  // since everyone is playing from the same device
  const isMyTurn =
    gameMode === "hotseat"
      ? true // Always allow actions in hotseat - the reducer enforces turn order
      : currentPlayer?.id === myPlayerId;
  const amICurrentPeeker =
    gameMode === "hotseat"
      ? gamePhase === "peeking" && peekingState !== undefined
      : gamePhase === "peeking" &&
        peekingState &&
        peekingState.playerIndex ===
          state.players.findIndex((p) => p.id === myPlayerId);

  const handleFinishPeeking = () => {
    if (peekingState?.peekedCount === 2) {
      broadcastAction({ type: "FINISH_PEEKING" });
    }
  };

  const handlePobudka = () => {
    if (isMyTurn && gamePhase === "playing") {
      broadcastAction({ type: "CALL_POBUDKA" });
    }
  };

  const canUseSpecial =
    drawnCard?.isSpecial &&
    gamePhase === "holding_card" &&
    (drawSource === "deck" || drawSource === "take2");
  const mustSwap =
    gamePhase === "holding_card" && !!drawnCard && (drawSource === "discard" || drawSource === "take2");

  const isPeekingPhase =
    gamePhase === "peeking" && peekingState !== undefined;

  const finishPeekingDisabled = peekingState?.peekedCount !== 2;
  const finishPeekingTitle = finishPeekingDisabled ? t("game.finishPeekingHint") : undefined;

  if (
    isPeekingPhase &&
    (gameMode === "hotseat" || amICurrentPeeker)
  ) {
    return (
      <Button
        onClick={handleFinishPeeking}
        disabled={finishPeekingDisabled}
        variant="secondary"
        className="w-auto min-w-[160px] sm:min-w-[180px] min-h-[52px] sm:min-h-[56px] text-base sm:text-lg font-semibold shadow-xs hover:bg-secondary/80"
        size="lg"
        title={finishPeekingTitle}
      >
        {t('game.finishPeeking')}
      </Button>
    );
  }

  if (gamePhase === "playing" && isMyTurn) {
    return (
      <div data-tutorial-id="pobudka-button">
        <Button
          onClick={handlePobudka}
          variant="destructive"
          className="w-auto min-w-[170px] sm:min-w-[190px] min-h-[56px] sm:min-h-[60px] text-lg sm:text-xl font-bold shadow-[0_12px_30px_rgba(0,0,0,0.28)] hover:shadow-[0_16px_38px_rgba(0,0,0,0.35)] rounded-full"
          size="lg"
        >
          {t('game.pobudka')}
        </Button>
      </div>
    );
  }

  if (gamePhase === "holding_card" && isMyTurn) {
    return (
      <div className="flex items-center justify-center gap-3 sm:gap-4 w-full flex-wrap sm:flex-nowrap">
        <Button
          variant="outline"
          onClick={() => broadcastAction({ type: "DISCARD_HELD_CARD" })}
          disabled={mustSwap}
          className="flex-1 sm:flex-none min-w-[100px] sm:min-w-[140px] h-12 sm:h-[54px] text-sm sm:text-lg rounded-full border-border/70 bg-card/70 shadow-xs"
          size="lg"
          title={mustSwap ? t("game.mustSwapHint") : undefined}
        >
          {t('game.discard')}
        </Button>
        <Button
          onClick={() => broadcastAction({ type: "USE_SPECIAL_ACTION" })}
          disabled={!canUseSpecial}
          className="flex-1 sm:flex-none min-w-[110px] sm:min-w-[150px] h-12 sm:h-[54px] text-sm sm:text-lg rounded-full bg-linear-to-r from-[hsl(var(--primary))] to-[hsl(var(--accent))] text-[hsl(var(--primary-foreground))] shadow-soft-lg disabled:opacity-60"
          size="lg"
          title={!canUseSpecial ? t("game.specialActionHint") : undefined}
        >
          <Wand2 className="mr-1.5 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5" />
          {t('game.action')}
        </Button>
      </div>
    );
  }

  // Contextual instructions for special action phases with clearer affordances
  if (gamePhase === "action_peek_1" && isMyTurn) {
    return (
      <div className="flex flex-col items-center gap-2">
        <p className="text-sm sm:text-base text-center text-primary font-semibold px-5 py-2.5 bg-primary/15 rounded-full border border-primary/40 shadow-sm animate-pulse">
          {t('game.peek1Instruction')}
        </p>
        <span className="text-xs text-muted-foreground">
          {t('game.peek1Hint')}
        </span>
      </div>
    );
  }

  if ((gamePhase === "action_swap_2_select_1" || gamePhase === "action_swap_2_select_2") && isMyTurn) {
    return (
      <div className="flex flex-col items-center gap-2">
        <p className="text-sm sm:text-base text-center text-pink-400 font-semibold px-5 py-2.5 bg-pink-500/15 rounded-full border border-pink-400/40 shadow-sm animate-pulse">
          {gamePhase === "action_swap_2_select_1"
            ? t('game.swap2SelectFirst')
            : t('game.swap2SelectSecond')}
        </p>
        <span className="text-xs text-muted-foreground">
          {t('game.swap2Hint')}
        </span>
      </div>
    );
  }

  return null;
};

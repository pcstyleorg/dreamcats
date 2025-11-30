import { useGame } from "@/state/useGame";
import { Button } from "./ui/button";
import { Wand2 } from "lucide-react";
import { useTranslation } from "react-i18next";

export const GameActions = () => {
  const { t } = useTranslation();
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
  // Determine active player (hotseat uses peekingState during peeks)
  const activeHotseatPlayerId =
    gameMode === "hotseat" && gamePhase === "peeking" && peekingState
      ? state.players[peekingState.playerIndex]?.id
      : currentPlayer?.id;

  const isMyTurn =
    gameMode === "online"
      ? currentPlayer?.id === myPlayerId
      : activeHotseatPlayerId === myPlayerId;
  const amICurrentPeeker =
    gamePhase === "peeking" &&
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

  if (
    isPeekingPhase &&
    (gameMode === "hotseat" || amICurrentPeeker)
  ) {
    return (
      <Button
        onClick={handleFinishPeeking}
        disabled={peekingState?.peekedCount !== 2}
        variant="secondary"
        className="w-auto min-w-[160px] sm:min-w-[180px] min-h-[52px] sm:min-h-[56px] text-base sm:text-lg font-semibold shadow-sm hover:bg-secondary/80"
        size="lg"
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
      <div className="flex flex-col items-center justify-center gap-3 sm:gap-4 w-full">
        <div className="flex items-center justify-center gap-3 sm:gap-4 w-full flex-wrap sm:flex-nowrap">
          <Button
            variant="outline"
            onClick={() => broadcastAction({ type: "DISCARD_HELD_CARD" })}
            disabled={mustSwap}
            className="flex-1 sm:flex-none min-w-[100px] sm:min-w-[140px] h-12 sm:h-[54px] text-sm sm:text-lg rounded-full border-border/70 bg-card/70 shadow-sm"
            size="lg"
          >
            {t('game.discard')}
          </Button>
          <Button
            variant="secondary"
            onClick={() => { /* Swap is done by tapping a hand card; button exists to make option visible */ }}
            disabled
            className="flex-1 sm:flex-none min-w-[110px] sm:min-w-[150px] h-12 sm:h-[54px] text-sm sm:text-lg rounded-full bg-muted/60 text-foreground/80 border border-border/60"
            size="lg"
            data-testid="swap-hint-button"
          >
            {t('game.swap')}
          </Button>
          <Button
            onClick={() => broadcastAction({ type: "USE_SPECIAL_ACTION" })}
            disabled={!canUseSpecial}
            className="flex-1 sm:flex-none min-w-[110px] sm:min-w-[150px] h-12 sm:h-[54px] text-sm sm:text-lg rounded-full bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--accent))] text-[hsl(var(--primary-foreground))] shadow-soft-lg disabled:opacity-60"
            size="lg"
          >
            <Wand2 className="mr-1.5 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5" />
            {t('game.action')}
          </Button>
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground text-center px-2">
          {mustSwap
            ? t('game.mustSwapCard')
            : t('game.orTapCardToSwap')}
        </p>
      </div>
    );
  }

  // Contextual instructions for special action phases
  if (gamePhase === "action_peek_1" && isMyTurn) {
    return (
      <p className="text-sm sm:text-base text-center text-primary font-medium px-4 py-2 bg-primary/10 rounded-full border border-primary/30">
        {t('game.usedPeek1')}
      </p>
    );
  }

  if ((gamePhase === "action_swap_2_select_1" || gamePhase === "action_swap_2_select_2") && isMyTurn) {
    return (
      <p className="text-sm sm:text-base text-center text-pink-400 font-medium px-4 py-2 bg-pink-500/10 rounded-full border border-pink-400/30">
        {gamePhase === "action_swap_2_select_1"
          ? t('game.usedSwap2SelectFirst')
          : t('game.selectSecondCard')}
      </p>
    );
  }

  return null;
};

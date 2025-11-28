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
  const isMyTurn =
    gameMode === "online" ? currentPlayer?.id === myPlayerId : true;
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
    drawSource === "deck";
  const mustSwap =
    gamePhase === "holding_card" && !!drawnCard && drawSource === "discard";

  if (
    (gameMode === "hotseat" || amICurrentPeeker) &&
    gamePhase === "peeking" &&
    peekingState &&
    peekingState.playerIndex ===
      state.players.findIndex(
        (p) => p.id === state.players[peekingState.playerIndex].id,
      )
  ) {
    return (
      <Button
        onClick={handleFinishPeeking}
        disabled={peekingState?.peekedCount !== 2}
        className="w-auto min-w-[160px] sm:min-w-[180px] min-h-[52px] sm:min-h-[56px] text-base sm:text-lg font-semibold bg-gradient-to-r from-[hsl(var(--accent))] to-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-soft-lg hover:shadow-dreamy"
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
      <div className="flex gap-2 sm:gap-3">
        <Button
          variant="outline"
          onClick={() => broadcastAction({ type: "DISCARD_HELD_CARD" })}
          disabled={mustSwap}
          className="min-w-[120px] sm:min-w-[140px] min-h-[50px] sm:min-h-[54px] text-base sm:text-lg rounded-full border-border/70 bg-card/70"
          size="lg"
        >
          {t('game.discard')}
        </Button>
        <Button
          onClick={() => broadcastAction({ type: "USE_SPECIAL_ACTION" })}
          disabled={!canUseSpecial}
          className="min-w-[130px] sm:min-w-[150px] min-h-[50px] sm:min-h-[54px] text-base sm:text-lg rounded-full bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--accent))] text-[hsl(var(--primary-foreground))] shadow-soft-lg disabled:opacity-60"
          size="lg"
        >
          <Wand2 className="mr-1.5 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5" />
          {t('game.action')}
        </Button>
      </div>
    );
  }

  return null;
};

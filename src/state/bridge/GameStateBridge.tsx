import { useEffect } from "react";
import { useGame } from "@/context/GameContext";
import { isNewStateEnabled } from "../featureFlag";
import { useAppStore } from "../store";

/**
 * Syncs existing GameContext state into the new Zustand store when the
 * feature flag is enabled. This keeps selectors safe to adopt gradually.
 */
export const GameStateBridge: React.FC = () => {
  const enabled = isNewStateEnabled();
  const { state } = useGame();

  const setRoomState = useAppStore((s) => s.setRoomState);
  const setHands = useAppStore((s) => s.setHands);
  const setDrawnCard = useAppStore((s) => s.setDrawnCard);
  const setLastMove = useAppStore((s) => s.setLastMove);
  const setActionMessage = useAppStore((s) => s.setActionMessage);
  const setChat = useAppStore((s) => s.setChat);

  useEffect(() => {
    if (!enabled) return;

    setRoomState({
      roomStatus:
        state.gamePhase === "lobby"
          ? "lobby"
          : state.gamePhase === "game_over"
            ? "game_over"
            : "playing",
      gamePhase: state.gamePhase,
      gameMode: state.gameMode,
      hostId: state.hostId,
      players: state.players,
      drawPileCount: state.drawPile.length,
      discardTop:
        state.discardPile.length > 0
          ? state.discardPile[state.discardPile.length - 1]
          : null,
      currentPlayerIndex: state.currentPlayerIndex,
      actionMessage: state.actionMessage,
      drawSource: state.drawSource,
    });

    setHands(state.players);
    setDrawnCard(state.drawnCard ?? null, state.drawSource ?? null);
    setLastMove(state.lastMove ?? null);
    setActionMessage(state.actionMessage);
    setChat(state.chatMessages ?? []);
  }, [
    enabled,
    state.gamePhase,
    state.gameMode,
    state.hostId,
    state.players,
    state.drawPile.length,
    state.discardPile,
    state.currentPlayerIndex,
    state.actionMessage,
    state.drawnCard,
    state.drawSource,
    state.lastMove,
    state.chatMessages,
    setRoomState,
    setHands,
    setDrawnCard,
    setLastMove,
    setActionMessage,
    setChat,
  ]);

  return null;
};

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
  const { state, myPlayerId } = useGame();

  const setRoomState = useAppStore((s) => s.setRoomState);
  const setHands = useAppStore((s) => s.setHands);
  const setDrawnCard = useAppStore((s) => s.setDrawnCard);
  const setLastMove = useAppStore((s) => s.setLastMove);
  const setActionMessage = useAppStore((s) => s.setActionMessage);
  const setChat = useAppStore((s) => s.setChat);
  const setPlayer = useAppStore((s) => s.setPlayer);
  const setRoom = useAppStore((s) => s.setRoom);

  // Sync session state (playerId, roomId)
  useEffect(() => {
    if (!enabled) return;
    
    const players = state?.players ?? [];
    if (myPlayerId) {
      const me = players.find((p) => p.id === myPlayerId);
      setPlayer(myPlayerId, me?.name ?? "");
    }
    if (state?.roomId) {
      setRoom(state.roomId);
    }
  }, [enabled, myPlayerId, state?.players, state?.roomId, setPlayer, setRoom]);

  // Sync game state
  useEffect(() => {
    if (!enabled || !state) return;

    const drawPile = state.drawPile ?? [];
    const discardPile = state.discardPile ?? [];
    const players = state.players ?? [];

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
      players: players,
      drawPileCount: drawPile.length,
      discardTop:
        discardPile.length > 0
          ? discardPile[discardPile.length - 1]
          : null,
      currentPlayerIndex: state.currentPlayerIndex,
      actionMessage: state.actionMessage,
      drawSource: state.drawSource,
    });

    setHands(players);
    setDrawnCard(state.drawnCard ?? null, state.drawSource ?? null);
    setLastMove(state.lastMove ?? null);
    setActionMessage(state.actionMessage);
    setChat(state.chatMessages ?? []);
  }, [
    enabled,
    state,
    setRoomState,
    setHands,
    setDrawnCard,
    setLastMove,
    setActionMessage,
    setChat,
  ]);

  return null;
};

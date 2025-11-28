import { useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAppStore } from "./store";
import { GameState, ChatMessage } from "@/types";

export const ConvexSync: React.FC = () => {
  const roomId = useAppStore((s) => s.roomId);
  const playerId = useAppStore((s) => s.playerId);
  const gameMode = useAppStore((s) => s.game.gameMode);
  const setGame = useAppStore((s) => s.setGame);
  const setChat = useAppStore((s) => s.setChat);
  const setNetStatus = useAppStore((s) => s.setNetStatus);
  const setRoomStatus = useAppStore((s) => s.setRoomStatus);
  const setPlayer = useAppStore((s) => s.setPlayer);
  const setRoom = useAppStore((s) => s.setRoom);

  const updatePresenceMutation = useMutation(api.rooms.updatePlayerPresence);

  const remoteGame = useQuery(
    api.games.getGameState,
    gameMode === "online" && roomId ? { roomId, playerId: playerId ?? undefined } : "skip",
  ) as GameState | null;

  const remoteMessages = useQuery(
    api.chat.getMessages,
    gameMode === "online" && roomId ? { roomId } : "skip",
  ) as { _id: string; senderId: string; senderName: string; message: string; timestamp: number }[] | null;

  const remotePlayers = useQuery(
    api.rooms.getPlayers,
    gameMode === "online" && roomId ? { roomId } : "skip",
  ) as { playerId: string; lastSeenAt: number }[] | null;

  // Restore session from storage (lightweight reconnection)
  useEffect(() => {
    if (playerId) return;
    const storedId = sessionStorage.getItem("sen-playerId");
    const storedRoom = sessionStorage.getItem("sen-roomId");
    const storedName = sessionStorage.getItem("sen-playerName");
    if (storedId && storedName) {
      setPlayer(storedId, storedName);
    }
    if (storedRoom) {
      setRoom(storedRoom);
    }
  }, [playerId, setPlayer, setRoom]);

  // Apply remote game state (One-way sync)
  useEffect(() => {
    if (!remoteGame || gameMode !== "online" || !roomId) return;
    
    // Server now handles visibility filtering!
    // We just trust the server state.
    setGame(remoteGame, { source: "remote" });
    
    setRoomStatus(
      remoteGame.gamePhase === "lobby"
        ? "lobby"
        : remoteGame.gamePhase === "game_over"
          ? "game_over"
          : "playing",
    );
  }, [gameMode, remoteGame, roomId, setGame, setRoomStatus]);

  // Sync chat
  useEffect(() => {
    if (!remoteMessages || gameMode !== "online") return;
    const chatMessages: ChatMessage[] = remoteMessages.map((msg) => ({
      id: msg._id,
      senderId: msg.senderId,
      senderName: msg.senderName,
      message: msg.message,
      timestamp: msg.timestamp,
    }));
    setChat(chatMessages);
  }, [gameMode, remoteMessages, setChat]);

  // Presence heartbeat
  useEffect(() => {
    if (gameMode !== "online" || !roomId || !playerId) return;
    const interval = setInterval(() => {
      updatePresenceMutation({ roomId, playerId }).catch(() => {
        /* swallow */
      });
    }, 10000);
    return () => clearInterval(interval);
  }, [gameMode, playerId, roomId, updatePresenceMutation]);

  // Remote player connectivity feedback (simple)
  useEffect(() => {
    if (!remotePlayers || gameMode !== "online") return;
    const active = remotePlayers.filter(
      (p) => Date.now() - p.lastSeenAt < 30000,
    );
    setNetStatus(active.length ? "connected" : "disconnected");
  }, [gameMode, remotePlayers, setNetStatus]);

  return null;
};

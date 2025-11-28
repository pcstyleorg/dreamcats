import { useCallback } from "react";
import { toast } from "sonner";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useSounds } from "@/hooks/use-sounds";
import { GameAction, GameState, Player } from "@/types";
import { useAppStore } from "./store";
import { initialGameState } from "./initialGame";

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

export const useGame = () => {
  const { playSound } = useSounds();
  const game = useAppStore((s) => s.game);
  const setGame = useAppStore((s) => s.setGame);
  const setPlayer = useAppStore((s) => s.setPlayer);
  const setRoom = useAppStore((s) => s.setRoom);
  const playerId = useAppStore((s) => s.playerId);
  const playerName = useAppStore((s) => s.playerName);
  const roomId = useAppStore((s) => s.roomId);

  const createRoomMutation = useMutation(api.rooms.createRoom);
  const joinRoomMutation = useMutation(api.rooms.joinRoom);
  const performActionMutation = useMutation(api.actions.performAction);
  const sendMessageMutation = useMutation(api.chat.sendMessage);

  // No need to filter locally anymore, server does it!
  const visibleState = game;

  const persistSession = useCallback(
    (id: string, name: string, room: string) => {
      sessionStorage.setItem("sen-playerId", id);
      sessionStorage.setItem("sen-roomId", room);
      sessionStorage.setItem("sen-playerName", name);
    },
    [],
  );

  const createRoom = useCallback(
    async (name: string) => {
      const newRoomId = `sen-${Math.random().toString(36).slice(2, 6)}`;
      const newPlayerId = `player-${Math.random().toString(36).slice(2, 9)}`;

      const newPlayer: Player = {
        id: newPlayerId,
        name,
        hand: [],
        score: 0,
      };

      const next: GameState = {
        ...clone(initialGameState),
        gameMode: "online",
        roomId: newRoomId,
        hostId: newPlayerId,
        players: [newPlayer],
        actionMessage: `Room ${newRoomId} created`,
      };

      try {
        await createRoomMutation({
          roomId: newRoomId,
          hostId: newPlayerId,
          hostName: name,
        });
        setPlayer(newPlayerId, name);
        setRoom(newRoomId);
        persistSession(newPlayerId, name, newRoomId);
        setGame(next, { source: "local" });
        toast.success(`Room created! Share code ${newRoomId}.`);
      } catch (err) {
        console.error(err);
        toast.error("Could not create room. Try again.");
      }
    },
    [createRoomMutation, persistSession, setGame, setPlayer, setRoom],
  );

  const joinRoom = useCallback(
    async (room: string, name: string) => {
      const newPlayerId = `player-${Math.random().toString(36).slice(2, 9)}`;

      const joinState: GameState = {
        ...clone(initialGameState),
        gameMode: "online",
        roomId: room,
        players: [
          {
            id: newPlayerId,
            name,
            hand: [],
            score: 0,
          },
        ],
        actionMessage: `Joined room ${room}`,
      };

      try {
        await joinRoomMutation({
          roomId: room,
          playerId: newPlayerId,
          name,
        });
        setPlayer(newPlayerId, name);
        setRoom(room);
        persistSession(newPlayerId, name, room);
        setGame(joinState, { source: "local" });
        toast.success(`Joined room ${room}. Waiting for sync.`);
      } catch (err) {
        console.error(err);
        toast.error("Could not join room. Check the code and try again.");
      }
    },
    [joinRoomMutation, persistSession, setGame, setPlayer, setRoom],
  );

  const startHotseatGame = useCallback(
    (_playerNames: string[]) => {
       toast.error("Hotseat mode is temporarily disabled for refactoring.");
       // We need to implement local hotseat logic using the same actions if we want to support it.
       // For now, disabling to focus on online fix.
    },
    [],
  );

  const startGame = useCallback(async () => {
    if (game.gameMode !== "online" || !game.roomId || !playerId) {
      toast.error("Create or join a room first.");
      return;
    }

    if (game.players.length < 2) {
      toast.error("Need at least 2 players to start.");
      return;
    }

    try {
      // Use START_NEW_ROUND to initialize the game (deal cards etc)
      await performActionMutation({
          roomId: game.roomId,
          playerId,
          action: { type: "START_NEW_ROUND" }
      });
    } catch (error) {
      console.error("Failed to start game:", error);
      toast.error("Failed to start game.");
    }
  }, [game, performActionMutation, playerId]);

  const broadcastAction = useCallback(
    async (action: GameAction) => {
      if (!game.roomId || !playerId) return;

      // Optimistic UI updates (sounds)
      switch (action.type) {
        case "PEEK_CARD":
        case "SWAP_HELD_CARD":
        case "ACTION_PEEK_1_SELECT":
          playSound("flip");
          break;
        case "DRAW_FROM_DECK":
        case "DRAW_FROM_DISCARD":
          playSound("draw");
          break;
        case "CALL_POBUDKA":
          playSound("pobudka");
          break;
      }

      try {
          const result = await performActionMutation({
              roomId: game.roomId,
              playerId,
              action,
          });
          return result;
      } catch (error) {
          console.error("Action failed:", error);
          toast.error("Action failed. It might not be your turn.");
          return null;
      }
    },
    [game.roomId, performActionMutation, playerId, playSound],
  );

  const sendChatMessage = useCallback(
    async (message: string) => {
      if (game.gameMode !== "online" || !game.roomId || !playerId) return;
      const me = game.players.find((p) => p.id === playerId);
      if (!me) return;

      // Optimistic local add? Maybe not needed if sync is fast.
      // But we can add it locally for instant feedback.
      // dispatch({ type: "ADD_CHAT_MESSAGE", payload: chatMessage }); // No dispatch anymore
      
      playSound("chat");

      try {
        await sendMessageMutation({
          roomId: game.roomId,
          senderId: playerId,
          senderName: me.name,
          message,
        });
      } catch (error) {
        console.error("Failed to send chat message:", error);
      }
    },
    [game.gameMode, game.players, game.roomId, playerId, playSound, sendMessageMutation],
  );

  return {
    state: visibleState,
    rawState: game,
    myPlayerId: playerId,
    playerName,
    roomId,
    createRoom,
    joinRoom,
    startHotseatGame,
    startGame,
    broadcastAction,
    sendChatMessage,
    playSound,
  };
};

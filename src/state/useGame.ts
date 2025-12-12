import { useCallback } from "react";
import { toast } from "sonner";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useSounds } from "@/hooks/use-sounds";
import { GameAction, GameState, Player } from "@/types";
import { useAppStore } from "./store";
import { initialGameState } from "./initialGame";
import i18n from "@/i18n/config";
import { gameReducer } from "./gameReducer";
import { createDeck, shuffleDeck } from "@/lib/game-logic";

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const createIdempotencyKey = (): string => {
  const randomUUID = globalThis.crypto?.randomUUID?.bind(globalThis.crypto);
  if (randomUUID) return randomUUID();
  return `idem-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
};

const retryMutation = async <T>({
  attempt,
  maxAttempts = 3,
  baseDelayMs = 120,
  fn,
}: {
  attempt?: number;
  maxAttempts?: number;
  baseDelayMs?: number;
  fn: () => Promise<T>;
}): Promise<T> => {
  let tries = attempt ?? 0;
  while (true) {
    try {
      return await fn();
    } catch (error) {
      const errMsg =
        error instanceof Error ? error.message : "Unexpected error occurred";

      // Do not retry for user/action errors
      const nonRetriable =
        errMsg.includes("Not your turn") ||
        errMsg.includes("Invalid phase") ||
        errMsg.includes("Room not found") ||
        errMsg.includes("Game not found") ||
        errMsg.includes("Target player not found") ||
        errMsg.includes("Invalid card index") ||
        errMsg.includes("Missing first card selection");

      if (nonRetriable || tries >= maxAttempts - 1) {
        throw error;
      }

      const delay = baseDelayMs * Math.pow(2, tries);
      await sleep(delay);
      tries += 1;
    }
  }
};

export const useGame = () => {
  const { playSound } = useSounds();
  const game = useAppStore((s) => s.game);
  const setGame = useAppStore((s) => s.setGame);
  const updateGame = useAppStore((s) => s.updateGame);
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
      sessionStorage.setItem("dreamcats-playerId", id);
      sessionStorage.setItem("dreamcats-roomId", room);
      sessionStorage.setItem("dreamcats-playerName", name);
    },
    [],
  );

  const createRoom = useCallback(
    async (name: string) => {
      const newRoomId = `dreamcats-${Math.random().toString(36).slice(2, 6)}`;
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
        toast.success(i18n.t("common:success.roomCreated", { roomId: newRoomId }));
      } catch (err) {
        console.error(err);
        toast.error(i18n.t("common:errors.createRoomTryAgain"));
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
        toast.success(i18n.t("common:success.joinedRoom", { room }));
      } catch (err) {
        console.error(err);
        toast.error(i18n.t("common:errors.joinRoomCheckCode"));
      }
    },
    [joinRoomMutation, persistSession, setGame, setPlayer, setRoom],
  );

  // Rejoin an existing room with a known player ID (for reconnection after refresh)
  const rejoinRoom = useCallback(
    async (room: string, existingPlayerId: string, name: string) => {
      try {
        // Use the existing player ID to rejoin
        await joinRoomMutation({
          roomId: room,
          playerId: existingPlayerId,
          name,
        });
        setPlayer(existingPlayerId, name);
        setRoom(room);
        persistSession(existingPlayerId, name, room);
        
        // Set minimal game state to trigger ConvexSync to start querying
        // The server will send us the full current state
        setGame({
          ...clone(initialGameState),
          gameMode: "online",
          roomId: room,
          actionMessage: `Rejoining room ${room}...`,
        }, { source: "local" });
        
        toast.success(i18n.t("common:success.rejoinedRoom", { room }));
      } catch (err) {
        console.error(err);
        throw err; // Re-throw so caller can handle
      }
    },
    [joinRoomMutation, persistSession, setGame, setPlayer, setRoom],
  );

  const startHotseatGame = useCallback(
    (playerNames: string[]) => {
      const names = playerNames.map((n) => n.trim()).filter(Boolean);
      if (names.length < 2) {
        toast.error(i18n.t("common:errors.needTwoPlayers"));
        return;
      }

      const deck = shuffleDeck(createDeck());
      const requiredCards = names.length * 4 + 1;
      if (deck.length < requiredCards) {
        toast.error(i18n.t("common:errors.notEnoughCards"));
        return;
      }

      const players: Player[] = names.map((name, index) => ({
        id: `hotseat-${index}-${Math.random().toString(36).slice(2, 8)}`,
        name,
        hand: [],
        score: 0,
      }));

      for (let i = 0; i < 4; i++) {
        for (const p of players) {
          const card = deck.shift();
          if (card) {
            p.hand.push({ card, isFaceUp: false, hasBeenPeeked: false });
          }
        }
      }

      const discardPile = [deck.pop()!];

      const next: GameState = {
        ...clone(initialGameState),
        gameMode: "hotseat",
        hostId: players[0]?.id ?? null,
        players,
        drawPile: deck,
        discardPile,
        startingPlayerIndex: 0,
        currentPlayerIndex: 0,
        gamePhase: "peeking",
        peekingState: { playerIndex: 0, peekedCount: 0, startIndex: 0 },
        actionMessage: i18n.t("game.peekTwoCards", {
          player: players[0]?.name ?? "",
        }),
        lastMove: null,
        lastCallerId: null,
      };

      // Set viewer to the first player for consistency with existing selectors
      const viewerId = players[0]?.id ?? "hotseat-viewer";
      const viewerName = players[0]?.name ?? "Hotseat";
      setPlayer(viewerId, viewerName);
      setRoom(null);
      setGame(next, { source: "local" });
      toast.success(i18n.t("common:success.hotseatStarted"));
    },
    [setGame, setPlayer, setRoom],
  );

  const startGame = useCallback(async () => {
    if (game.gameMode !== "online" || !game.roomId || !playerId) {
      toast.error(i18n.t("common:errors.createOrJoinFirst"));
      return;
    }

    if (game.players.length < 2) {
      toast.error(i18n.t("common:errors.needTwoPlayers"));
      return;
    }

    try {
      // Use START_NEW_ROUND to initialize the game (deal cards etc)
      await performActionMutation({
          roomId: game.roomId,
          playerId,
          action: { type: "START_NEW_ROUND" },
          idempotencyKey: createIdempotencyKey(),
      });
    } catch (error) {
      console.error("Failed to start game:", error);
      toast.error(i18n.t("common:errors.startGameFailed"));
    }
  }, [game, performActionMutation, playerId]);

  const leaveGame = useCallback(() => {
    setRoom(null);
    setGame(initialGameState, { source: "local" });
  }, [setGame, setRoom]);

  const broadcastAction = useCallback(
    async (action: GameAction) => {
      // sounds for actions
      switch (action.type) {
        case "PEEK_CARD":
        case "SWAP_HELD_CARD":
        case "ACTION_PEEK_1_SELECT":
        case "DISCARD_HELD_CARD":
        case "ACTION_SWAP_2_SELECT":
          playSound("flip");
          break;
        case "DRAW_FROM_DECK":
        case "DRAW_FROM_DISCARD":
          playSound("draw");
          break;
        case "CALL_POBUDKA":
          playSound("pobudka");
          break;
        case "USE_SPECIAL_ACTION":
        case "FINISH_PEEKING":
        case "ACTION_TAKE_2_CHOOSE":
        case "START_NEW_ROUND":
          playSound("click");
          break;
      }

      // Local hotseat path
      if (game.gameMode === "hotseat") {
        let result: unknown = null;
        updateGame((prev) => {
          // Capture return value for peek_1 so UI toast stays in sync
          if (action.type === "ACTION_PEEK_1_SELECT") {
            const targetPlayer = prev.players.find(
              (p) => p.id === action.payload.playerId,
            );
            result =
              targetPlayer?.hand[action.payload.cardIndex]?.card ?? null;
          }
          return gameReducer(prev, {
            type: "PROCESS_ACTION",
            payload: { action, isLocal: true },
          });
        }, { source: "local" });
        return result;
      }

      if (!game.roomId || !playerId) return;

      try {
        const idempotencyKey = createIdempotencyKey();
        const result = await retryMutation({
          fn: () =>
            performActionMutation({
              roomId: game.roomId!,
              playerId,
              action,
              idempotencyKey,
            }),
        });
        return result;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Action failed.";
        toast.error(message);
        return null;
      }
    },
    [game.gameMode, game.roomId, performActionMutation, playerId, playSound, updateGame],
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
        await retryMutation({
          fn: () =>
            sendMessageMutation({
              roomId: game.roomId!,
              senderId: playerId,
              senderName: me.name,
              message,
            }),
        });
      } catch (error) {
        const msg =
          error instanceof Error
            ? error.message
            : "Failed to send chat message.";
        toast.error(msg);
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
    rejoinRoom,
    startHotseatGame,
    startGame,
    leaveGame,
    broadcastAction,
    sendChatMessage,
    playSound,
  };
};

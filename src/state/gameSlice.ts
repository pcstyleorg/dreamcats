import { SliceCreator, GameSlice, RoomStatus } from "./types";
import { GameState, ChatMessage } from "@/types";
import { initialGameState } from "./initialGame";

const cloneGameState = (state: GameState): GameState =>
  JSON.parse(JSON.stringify(state));

const deriveRoomStatus = (game: GameState): RoomStatus => {
  switch (game.gamePhase) {
    case "round_end":
      return "round_end";
    case "game_over":
      return "game_over";
    case "lobby":
      return "lobby";
    default:
      return "playing";
  }
};

export const createGameSlice: SliceCreator<GameSlice> = (set) => ({
  game: cloneGameState(initialGameState),
  roomStatus: "lobby",
  gameVersion: null,

  setGame: (next, meta) =>
    set((state) => ({
      game: cloneGameState(next),
      gameVersion: meta?.version ?? state.gameVersion ?? null,
      roomStatus: deriveRoomStatus(next),
    })),

  updateGame: (updater, meta) =>
    set((state) => {
      const next = updater(cloneGameState(state.game));
      return {
        game: cloneGameState(next),
        gameVersion: meta?.version ?? state.gameVersion ?? null,
        roomStatus: deriveRoomStatus(next),
      };
    }),

  resetGameState: () =>
    set(() => ({
      game: cloneGameState(initialGameState),
      roomStatus: "lobby",
      gameVersion: null,
    })),

  setActionMessage: (message: string) =>
    set((state) => ({
      game: { ...state.game, actionMessage: message },
    })),

  setLastMove: (move: GameState["lastMove"] | null) =>
    set((state) => ({ game: { ...state.game, lastMove: move } })),

  appendChat: (message: ChatMessage) =>
    set((state) => ({
      game: {
        ...state.game,
        chatMessages: [...(state.game.chatMessages ?? []), message],
      },
    })),

  setChat: (messages: ChatMessage[]) =>
    set((state) => ({ game: { ...state.game, chatMessages: messages } })),

  setRoomStatus: (status) => set({ roomStatus: status }),

  setGameVersion: (version) => set({ gameVersion: version }),
});

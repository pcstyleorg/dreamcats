import { SliceCreator, GameSlice } from "./types";
import { GameState, Player, Card, ChatMessage } from "@/types";

const initialGame: Omit<GameSlice, keyof GameState["players"] | "setRoomState" | "resetGameState" | "setHands" | "setActionMessage" | "setDrawnCard" | "setLastMove" | "appendChat" | "setChat"> = {
  roomStatus: "lobby",
  gamePhase: "lobby",
  gameMode: "lobby",
  hostId: null,
  players: [],
  drawPileCount: 0,
  discardTop: null,
  hands: [],
  currentPlayerIndex: 0,
  drawnCard: null,
  drawSource: null,
  lastMove: null,
  actionMessage: "",
  chatMessages: [],
  timers: undefined,
};

export const createGameSlice: SliceCreator<GameSlice> = (set) => ({
  ...initialGame,

  setRoomState: (partial) => set((state) => ({ ...state, ...partial })),

  resetGameState: () => set({ ...initialGame }),

  setHands: (players: Player[]) =>
    set(() => ({
      players,
      hands: players,
    })),

  setActionMessage: (message: string) => set({ actionMessage: message }),

  setDrawnCard: (card: Card | null, source: GameState["drawSource"]) =>
    set({ drawnCard: card, drawSource: source }),

  setLastMove: (move: GameState["lastMove"] | null) => set({ lastMove: move }),

  appendChat: (message: ChatMessage) =>
    set((state) => ({ chatMessages: [...state.chatMessages, message] })),

  setChat: (messages: ChatMessage[]) => set({ chatMessages: messages }),
});

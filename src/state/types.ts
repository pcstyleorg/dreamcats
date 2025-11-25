import { StateCreator } from "zustand";
import { GamePhase, GameState, Player, Card, ChatMessage } from "@/types";

export type RoomStatus = "lobby" | "playing" | "round_end" | "game_over";
export type NetStatus = "connected" | "connecting" | "disconnected" | "error";

export interface SafeAreaInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface SessionSlice {
  playerId: string | null;
  playerName: string;
  roomId: string | null;
  locale: string;
  theme: "light" | "dark";
  authToken?: string | null;
  setPlayer(id: string, name: string): void;
  setRoom(roomId: string | null): void;
  setLocale(locale: string): void;
  setTheme(theme: "light" | "dark"): void;
  setAuthToken(token: string | null): void;
}

export interface GameSlice {
  roomStatus: RoomStatus;
  gamePhase: GamePhase;
  gameMode: GameState["gameMode"];
  hostId: string | null;
  players: Player[];
  drawPileCount: number;
  discardTop: Card | null;
  hands: GameState["players"]; // will be normalized later
  currentPlayerIndex: number;
  drawnCard: Card | null;
  drawSource: GameState["drawSource"];
  lastMove: GameState["lastMove"] | null;
  actionMessage: string;
  timers?: { turnEndsAt?: number };
  chatMessages: ChatMessage[];
  setRoomState(state: Partial<GameSlice>): void;
  resetGameState(): void;
  setHands(players: Player[]): void;
  setActionMessage(message: string): void;
  setDrawnCard(card: Card | null, source: GameState["drawSource"]): void;
  setLastMove(move: GameState["lastMove"] | null): void;
  appendChat(message: ChatMessage): void;
  setChat(messages: ChatMessage[]): void;
}

export interface UISlice {
  isMenuOpen: boolean;
  isSheetOpen: boolean;
  safeArea: SafeAreaInsets;
  reducedMotion: boolean;
  viewportHeight: number;
  setMenuOpen(value: boolean): void;
  setSheetOpen(value: boolean): void;
  setSafeArea(insets: SafeAreaInsets): void;
  setReducedMotion(value: boolean): void;
  setViewportHeight(value: number): void;
}

export interface NetSlice {
  netStatus: NetStatus;
  latencyMs: number | null;
  reconnectAttempts: number;
  setNetStatus(status: NetStatus): void;
  setLatency(value: number | null): void;
  bumpReconnect(): void;
  resetReconnect(): void;
}

export type AppState = SessionSlice & GameSlice & UISlice & NetSlice;

export type SliceCreator<S> = StateCreator<
  AppState,
  [["zustand/devtools", never], ["zustand/subscribeWithSelector", never], ["zustand/persist", unknown?]],
  [],
  S
>;

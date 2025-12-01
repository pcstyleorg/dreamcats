import { StateCreator } from "zustand";
import { GameState, ChatMessage } from "@/types";

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
  game: GameState;
  roomStatus: RoomStatus;
  gameVersion: number | null;
  setGame(next: GameState, meta?: { version?: number | null; source?: "remote" | "local" }): void;
  updateGame(updater: (prev: GameState) => GameState, meta?: { version?: number | null; source?: "remote" | "local" }): void;
  resetGameState(): void;
  setActionMessage(message: string): void;
  setLastMove(move: GameState["lastMove"] | null): void;
  appendChat(message: ChatMessage): void;
  setChat(messages: ChatMessage[]): void;
  setRoomStatus(status: RoomStatus): void;
  setGameVersion(version: number | null): void;
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

/**
 * Zustand v5 SliceCreator type.
 * Uses the base StateCreator without middleware mutators since slices
 * only use set/get and don't interact directly with middleware.
 */
export type SliceCreator<S> = StateCreator<AppState, [], [], S>;

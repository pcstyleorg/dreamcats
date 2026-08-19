/**
 * Online session adapter: bridges the Convex room document to the TableGame
 * interface GameTable consumes. The server sends redacted state; this side
 * rotates it so the viewer is always player 0 and de-rotates outgoing events.
 */

import { ConvexError } from "convex/values";
import {
  EngineState,
  GameEvent,
  rotateEventForServer,
  rotateStateForViewer,
} from "../../convex/engine";
import { safeLocalStorage } from "@/lib/storage";
import type { TableGame } from "./store";

const PLAYER_ID_KEY = "table.playerId";
const NAME_KEY = "table.playerName";
const ROOM_KEY = "table.roomCode";

export const getPlayerId = (): string => {
  let id = safeLocalStorage.getItem(PLAYER_ID_KEY);
  if (!id) {
    id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `p-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    safeLocalStorage.setItem(PLAYER_ID_KEY, id);
  }
  return id;
};

export const getSavedName = (): string =>
  safeLocalStorage.getItem(NAME_KEY) ?? "";
export const saveName = (name: string): void =>
  safeLocalStorage.setItem(NAME_KEY, name);

/** Persist the active room so a refresh rejoins automatically. */
export const getSavedRoom = (): string | null =>
  safeLocalStorage.getItem(ROOM_KEY);
export const saveRoom = (code: string | null): void => {
  if (code) safeLocalStorage.setItem(ROOM_KEY, code);
  else safeLocalStorage.removeItem(ROOM_KEY);
};

export const errorMessage = (error: unknown): string =>
  error instanceof ConvexError && typeof error.data === "string"
    ? error.data
    : "Connection hiccup — try again";

/**
 * TableGame backed by reactive Convex query data. The owning component feeds
 * fresh snapshots via `update` during render (ref-held, idempotent); re-renders
 * flow top-down from useQuery, so listener notification is only a safety net.
 */
export class OnlineGame implements TableGame {
  private snapshot: EngineState | null = null;
  private listeners = new Set<() => void>();
  sender: (event: GameEvent) => Promise<string | null> = async () => null;

  /** True once the first server snapshot has arrived. */
  get ready(): boolean {
    return this.snapshot !== null;
  }

  update(serverStateJson: string, seat: number): void {
    const state = JSON.parse(serverStateJson) as EngineState;
    this.snapshot = rotateStateForViewer(state, seat);
    this.listeners.forEach((l) => l());
  }

  getState = (): EngineState => {
    if (!this.snapshot) throw new Error("OnlineGame not ready");
    return this.snapshot;
  };

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  dispatch = (event: GameEvent): Promise<string | null> => this.sender(event);

  resume(): void {}
  pause(): void {}
}

/** Builds the mutation payload for an event from the viewer's perspective. */
export const toServerEvent = (
  event: GameEvent,
  seat: number,
  playerCount: number,
): GameEvent => rotateEventForServer(event, seat, playerCount);

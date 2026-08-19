/**
 * Local game session: wraps the pure engine, drives bot turns on timers,
 * and exposes a subscribable snapshot for React (useSyncExternalStore).
 */

import { useSyncExternalStore } from "react";
import {
  EngineError,
  EngineState,
  GameEvent,
  applyEvent,
  createGame,
} from "../../convex/engine";
import { chooseBotEvent } from "./bot";

export const BOT_NAMES = ["Miso", "Yuki", "Mochi"] as const;

/**
 * What GameTable needs from a game session. The local game resolves events
 * synchronously; the online game returns a promise from the server mutation.
 * State is always presented with the viewer as player 0.
 */
export interface TableGame {
  getState(): EngineState;
  subscribe(listener: () => void): () => void;
  dispatch(event: GameEvent): string | null | Promise<string | null>;
  /** Starts background work (bot timers). Call on mount. */
  resume(): void;
  /** Stops background work. Call on unmount. */
  pause(): void;
}

export interface LocalGameOptions {
  playerName: string;
  botCount: 1 | 2 | 3;
  targetScore?: number;
}

const BOT_PEEK_DELAY = 350;
const BOT_MOVE_DELAY = 1000;

export class LocalGame implements TableGame {
  readonly humanIndex = 0;
  private state: EngineState;
  private listeners = new Set<() => void>();
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(options: LocalGameOptions) {
    const players = [
      { id: "you", name: options.playerName },
      ...Array.from({ length: options.botCount }, (_, i) => ({
        id: `bot-${i}`,
        name: BOT_NAMES[i],
      })),
    ];
    this.state = createGame(players, Date.now() >>> 0, {
      targetScore: options.targetScore ?? 100,
    });
  }

  getState = (): EngineState => this.state;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  /** Applies a human event. Returns an error message instead of throwing. */
  dispatch(event: GameEvent): string | null {
    try {
      this.state = applyEvent(this.state, event, this.humanIndex);
    } catch (error) {
      return error instanceof EngineError ? error.message : String(error);
    }
    this.emit();
    this.scheduleBots();
    return null;
  }

  /** Starts (or restarts) the bot scheduler. Call on mount. */
  resume(): void {
    this.scheduleBots();
  }

  /** Stops pending bot timers. Call on unmount. */
  pause(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  private emit(): void {
    this.listeners.forEach((l) => l());
  }

  private scheduleBots(): void {
    this.pause();
    const move = this.nextBotMove();
    if (!move) return;
    this.timer = setTimeout(() => {
      try {
        this.state = applyEvent(this.state, move.event, move.actor);
      } catch (error) {
        // A bot must never wedge the game; log and stop.
        console.error("[bot] illegal event", move, error);
        return;
      }
      this.emit();
      this.scheduleBots();
    }, move.delay);
  }

  private nextBotMove(): {
    actor: number;
    event: GameEvent;
    delay: number;
  } | null {
    const s = this.state;
    if (s.phase === "peeking") {
      for (let i = 0; i < s.players.length; i++) {
        if (i === this.humanIndex) continue;
        const peeked = s.players[i].peekedSlots.length;
        if (peeked < 2) {
          return {
            actor: i,
            event: { type: "peek", player: i, slot: peeked },
            delay: BOT_PEEK_DELAY,
          };
        }
      }
      return null;
    }
    if (s.phase === "roundEnd" || s.phase === "gameOver") return null;
    if (s.currentPlayer === this.humanIndex) return null;
    const event = chooseBotEvent(s, s.currentPlayer);
    return event
      ? { actor: s.currentPlayer, event, delay: BOT_MOVE_DELAY }
      : null;
  }
}

// Implementations must expose subscribe/getState as stable bound functions
// (arrow properties) so the store does not resubscribe on every render.
export const useGameState = (game: TableGame): EngineState =>
  useSyncExternalStore(game.subscribe, game.getState, game.getState);

/**
 * Table-local sound + haptics. Independent of the classic app's store so the
 * rebuilt table works standalone. Sounds default ON with a persisted mute.
 */

import { useSyncExternalStore } from "react";
import { Howl } from "howler";
import { safeLocalStorage } from "@/lib/storage";

export type TableSound =
  | "flip"
  | "draw"
  | "click"
  | "shuffle"
  | "pobudka"
  | "win"
  | "lose";

const FILES: Record<TableSound, string> = {
  flip: "/sounds/flip.mp3",
  draw: "/sounds/draw.mp3",
  click: "/sounds/click.mp3",
  shuffle: "/sounds/shuffle.mp3",
  pobudka: "/sounds/pobudka.mp3",
  win: "/sounds/win.mp3",
  lose: "/sounds/lose.mp3",
};

const SETTINGS: Partial<Record<TableSound, { volume: number; rate?: number }>> = {
  flip: { volume: 0.22, rate: 1.3 },
  draw: { volume: 0.22, rate: 1.2 },
  shuffle: { volume: 0.2, rate: 1.15 },
  click: { volume: 0.3 },
  pobudka: { volume: 0.5 },
  win: { volume: 0.45 },
  lose: { volume: 0.4 },
};

const MUTE_KEY = "table.muted";
const howls: Partial<Record<TableSound, Howl>> = {};
let muted = safeLocalStorage.getItem(MUTE_KEY) === "true";
const listeners = new Set<() => void>();

export const isMuted = (): boolean => muted;

export const setMuted = (value: boolean): void => {
  muted = value;
  safeLocalStorage.setItem(MUTE_KEY, String(value));
  listeners.forEach((l) => l());
};

export const useMuted = (): boolean =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    isMuted,
    isMuted,
  );

export const play = (sound: TableSound): void => {
  if (muted) return;
  try {
    const s = SETTINGS[sound];
    let howl = howls[sound];
    if (!howl) {
      howl = new Howl({
        src: [FILES[sound]],
        volume: s?.volume ?? 0.4,
        rate: s?.rate ?? 1,
        preload: true,
      });
      howls[sound] = howl;
    }
    howl.play();
  } catch {
    // Audio is best-effort; never break the game over it.
  }
};

export const buzz = (pattern: number | number[] = 12): void => {
  if (typeof navigator === "undefined" || !("vibrate" in navigator)) return;
  try {
    navigator.vibrate(pattern);
  } catch {
    // Ignore vibration failures (e.g. iOS Safari).
  }
};

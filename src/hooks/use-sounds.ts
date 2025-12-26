import { useCallback, useEffect, useRef } from "react";
import { Howl } from "howler";
import { safeLocalStorage } from "@/lib/storage";
import { useAppStore } from "@/state/store";

export type SoundType =
  | "flip"
  | "draw"
  | "click"
  | "win"
  | "lose"
  | "chat"
  | "pobudka"
  | "shuffle";

// map sound types to file paths
const SOUND_FILES: Record<SoundType, string> = {
  flip: "/sounds/flip.mp3",
  draw: "/sounds/draw.mp3",
  click: "/sounds/click.mp3",
  win: "/sounds/win.mp3",
  lose: "/sounds/lose.mp3",
  chat: "/sounds/chat.mp3",
  pobudka: "/sounds/pobudka.mp3",
  shuffle: "/sounds/shuffle.mp3",
};

const SOUND_SETTINGS: Partial<
  Record<SoundType, { volume: number; rate?: number }>
> = {
  // card sounds: subtle rate adjustments only, no detune hacks
  // extreme rates (>1.6) cause harsh/warped sounds across browsers
  flip: { volume: 0.22, rate: 1.3 },
  draw: { volume: 0.22, rate: 1.2 },
  shuffle: { volume: 0.2, rate: 1.15 },
  click: { volume: 0.3 },
  chat: { volume: 0.35 },
  pobudka: { volume: 0.5 },
  win: { volume: 0.45 },
  lose: { volume: 0.4 },
};

export const useSounds = () => {
  // use a ref to store Howl instances
  const soundsRef = useRef<Record<string, Howl>>({});

  const playSound = useCallback((sound: SoundType) => {
    // check if sounds are enabled (default false)
    const soundEnabled =
      useAppStore.getState().soundEnabled ||
      safeLocalStorage.getItem("soundEnabled") === "true";
    if (!soundEnabled) return;

    try {
      const settings = SOUND_SETTINGS[sound];
      if (!soundsRef.current[sound]) {
        // lazy load on first play
        soundsRef.current[sound] = new Howl({
          src: [SOUND_FILES[sound]],
          volume: settings?.volume ?? 0.5,
          html5: false,
        });
      }
      const howl = soundsRef.current[sound];
      if (settings?.volume !== undefined) howl.volume(settings.volume);
      if (settings?.rate !== undefined) howl.rate(settings.rate);

      howl.play();
    } catch (error) {
      console.warn("Failed to play sound:", sound, error);
    }
  }, []);

  useEffect(() => {
    return () => {
      Object.values(soundsRef.current).forEach((howl) => {
        try {
          howl.unload();
        } catch (error) {
          console.warn("Failed to unload sound", error);
        }
      });
      soundsRef.current = {};
    };
  }, []);

  return { playSound };
};

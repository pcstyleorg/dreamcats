import { useCallback, useRef, useEffect } from "react";
import { Howl } from "howler";

export type SoundType =
  | "flip"
  | "draw"
  | "click"
  | "win"
  | "lose"
  | "chat"
  | "pobudka"
  | "shuffle";

// Map sound types to file paths
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

export const useSounds = () => {
  // Use a ref to store Howl instances to prevent recreation
  const soundsRef = useRef<Record<string, Howl>>({});

  useEffect(() => {
    // Preload sounds
    Object.entries(SOUND_FILES).forEach(([key, src]) => {
      if (!soundsRef.current[key]) {
        soundsRef.current[key] = new Howl({
          src: [src],
          volume: 0.5,
          preload: true,
        });
      }
    });

    return () => {
      // Cleanup sounds on unmount
      Object.values(soundsRef.current).forEach((sound) => sound.unload());
    };
  }, []);

  const playSound = useCallback((sound: SoundType) => {
    try {
      if (!soundsRef.current[sound]) {
          // Lazy load if not preloaded (fallback)
           soundsRef.current[sound] = new Howl({
            src: [SOUND_FILES[sound]],
            volume: 0.5,
          });
      }
      soundsRef.current[sound].play();
    } catch (error) {
      console.warn("Failed to play sound:", sound, error);
    }
  }, []);

  return { playSound };
};

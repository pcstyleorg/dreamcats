import { useCallback, useRef } from "react";
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
  // Use a ref to store Howl instances
  const soundsRef = useRef<Record<string, Howl>>({});

  const playSound = useCallback((sound: SoundType) => {
    try {
      if (!soundsRef.current[sound]) {
        // Lazy load on first play
        soundsRef.current[sound] = new Howl({
          src: [SOUND_FILES[sound]],
          volume: 0.5,
          html5: false,
        });
      }
      soundsRef.current[sound].play();
    } catch (error) {
      console.warn("Failed to play sound:", sound, error);
    }
  }, []);

  return { playSound };
};

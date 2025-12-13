import { useCallback, useEffect, useRef } from "react";
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
  Record<SoundType, { volume: number; rate?: number; detune?: number }>
> = {
  // card sound: faster, slightly lower pitch, quieter
  flip: { volume: 0.16, rate: 2.6, detune: -350 },
  draw: { volume: 0.16, rate: 2.3, detune: -250 },
  shuffle: { volume: 0.16, rate: 2.0, detune: -250 },
};

export const useSounds = () => {
  // use a ref to store Howl instances
  const soundsRef = useRef<Record<string, Howl>>({});

  const playSound = useCallback((sound: SoundType) => {
    // check if sounds are enabled (default true)
    const soundEnabled = localStorage.getItem("soundEnabled") !== "false";
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

      if (settings?.detune !== undefined) {
        const detune = settings.detune;
        howl.once("play", (id) => {
          try {
            type DetuneParam = {
              setValueAtTime?: (value: number, time: number) => void;
              value?: number;
            };
            type AudioNodeWithDetune = { detune?: DetuneParam };
            type HowlInternalSound = { _id?: number; _node?: AudioNodeWithDetune };
            type HowlWithInternals = Howl & {
              _soundById?: (soundId: number) => HowlInternalSound | null;
              _sounds?: HowlInternalSound[];
              ctx?: { currentTime: number };
            };

            const howlin = howl as unknown as HowlWithInternals;
            const soundObj =
              typeof howlin._soundById === "function"
                ? howlin._soundById(id) ?? undefined
                : howlin._sounds?.find((s) => s?._id === id);

            const node = soundObj?._node;
            const ctxTime = howlin.ctx?.currentTime ?? 0;

            if (node?.detune?.setValueAtTime) {
              node.detune.setValueAtTime(detune, ctxTime);
            } else if (node?.detune && typeof node.detune.value === "number") {
              node.detune.value = detune;
            }
          } catch {
            // Best-effort; detune isn't supported in all cases.
          }
        });
      }

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

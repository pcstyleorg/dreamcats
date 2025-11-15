import { Howl } from 'howler';
import { useCallback } from 'react';

// Sound assets from Mixkit
const soundFiles = {
  flip: 'https://assets.mixkit.co/sfx/preview/mixkit-playing-card-flip-821.mp3',
  draw: 'https://assets.mixkit.co/sfx/preview/mixkit-fast-sweep-transition-2399.mp3',
  click: 'https://assets.mixkit.co/sfx/preview/mixkit-interface-device-click-2577.mp3',
  win: 'https://assets.mixkit.co/sfx/preview/mixkit-video-game-win-2016.mp3',
  lose: 'https://assets.mixkit.co/sfx/preview/mixkit-player-losing-or-failing-2042.mp3',
  chat: 'https://assets.mixkit.co/sfx/preview/mixkit-software-interface-start-2574.mp3',
  pobudka: 'https://assets.mixkit.co/sfx/preview/mixkit-game-show-wrong-answer-buzz-950.mp3',
};

export type SoundType = keyof typeof soundFiles;

// Preload sounds
const sounds: { [key in SoundType]?: Howl } = Object.entries(soundFiles).reduce((acc, [key, src]) => {
  acc[key as SoundType] = new Howl({ src: [src], volume: 0.4 });
  return acc;
}, {} as { [key in SoundType]?: Howl });

export const useSounds = () => {
  const playSound = useCallback((sound: SoundType) => {
    const s = sounds[sound];
    if (s) {
      s.play();
    }
  }, []);

  return { playSound };
};

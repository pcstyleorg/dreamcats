import { Howl } from 'howler';
import { useCallback } from 'react';

// Disable sounds for now since CDN is blocking requests
// We'll use silent placeholders to prevent errors
const soundFiles = {
  flip: '',
  draw: '',
  click: '',
  win: '',
  lose: '',
  chat: '',
  pobudka: '',
};

export type SoundType = keyof typeof soundFiles;

// Preload sounds (disabled - CDN blocking requests)
const sounds: { [key in SoundType]?: Howl } = {};

export const useSounds = () => {
  const playSound = useCallback((sound: SoundType) => {
    // Sounds disabled - CDN blocking requests
    // TODO: Add local sound files to /public/sounds/ directory
    return;
  }, []);

  return { playSound };
};

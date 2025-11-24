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

// Sounds disabled for now - CDN blocking requests
// TODO: Add local sound files to /public/sounds/ directory

export const useSounds = () => {
  const playSound = useCallback((_sound: SoundType) => {
    // Sounds disabled - CDN blocking requests
    return;
  }, []);

  return { playSound };
};

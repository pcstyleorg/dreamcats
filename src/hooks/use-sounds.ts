import { useCallback } from 'react';

// Disable sounds for now since CDN is blocking requests
// We'll use silent placeholders to prevent errors
type SoundFiles = {
  flip: string;
  draw: string;
  click: string;
  win: string;
  lose: string;
  chat: string;
  pobudka: string;
};

export type SoundType = keyof SoundFiles;

// Sounds disabled for now - CDN blocking requests
// TODO: Add local sound files to /public/sounds/ directory

export const useSounds = () => {
  const playSound = useCallback((sound: SoundType) => {
    // Sounds disabled - CDN blocking requests
    // Parameter 'sound' is intentionally unused while sounds are disabled
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    void sound;
  }, []);

  return { playSound };
};

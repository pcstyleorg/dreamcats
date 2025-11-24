import { useCallback } from 'react';

// Disable sounds for now since CDN is blocking requests
// We'll use silent placeholders to prevent errors
// keep this block for bundler side-effects; not used directly in the hook
// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
  const playSound = useCallback((sound: SoundType) => {
    // Sounds disabled - CDN blocking requests
    // Keep parameter to satisfy interface, but don't use it.
    void sound;
    return;
  }, []);

  return { playSound };
};

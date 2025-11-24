import { useCallback } from 'react';

export type SoundType =
  | 'flip'
  | 'draw'
  | 'click'
  | 'win'
  | 'lose'
  | 'chat'
  | 'pobudka';

// Sounds disabled for now - CDN blocking requests
// TODO: Add local sound files to /public/sounds/ directory

export const useSounds = () => {
  const playSound = useCallback((sound: SoundType) => {
    // Sounds disabled - CDN blocking requests
    void sound;
    return;
  }, []);

  return { playSound };
};

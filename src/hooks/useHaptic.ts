import { useCallback } from "react";

export const useHaptic = () => {
  const vibrate = useCallback((pattern: number | number[] = 10) => {
    if (typeof navigator === "undefined") return;
    if (!("vibrate" in navigator)) return;
    navigator.vibrate(pattern);
  }, []);

  return { vibrate };
};

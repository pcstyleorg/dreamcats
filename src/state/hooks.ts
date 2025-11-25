import { useMemo } from "react";
import { useGame } from "@/context/GameContext";
import { useAppStore } from "./store";
import { isNewStateEnabled } from "./featureFlag";

export const usePlayersView = () => {
  const enabled = isNewStateEnabled();
  const storePlayers = useAppStore((s) => s.players);
  const { state } = useGame();

  return useMemo(() => (enabled ? storePlayers : state.players), [enabled, storePlayers, state.players]);
};

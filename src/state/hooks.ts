import { useMemo } from "react";
import { useAppStore } from "./store";
import { getVisibleStateForViewer } from "./gameReducer";

export const usePlayersView = () => {
  const game = useAppStore((s) => s.game);
  const playerId = useAppStore((s) => s.playerId);
  return useMemo(
    () => getVisibleStateForViewer(game, playerId ?? null).players,
    [game, playerId],
  );
};

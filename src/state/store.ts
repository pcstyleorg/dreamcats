import { create } from "zustand";
import { devtools, persist, subscribeWithSelector } from "zustand/middleware";
import { createSessionSlice } from "./sessionSlice";
import { createGameSlice } from "./gameSlice";
import { createUiSlice } from "./uiSlice";
import { createNetSlice } from "./netSlice";
import { AppState } from "./types";

const persistKeys = (state: AppState) => ({
  playerId: state.playerId,
  playerName: state.playerName,
  roomId: state.roomId,
  locale: state.locale,
  theme: state.theme,
  reducedMotion: state.reducedMotion,
});

export const useAppStore = create<AppState>()(
  devtools(
    subscribeWithSelector(
      persist(
        (set, get, api) => ({
          ...createSessionSlice(set, get, api),
          ...createGameSlice(set, get, api),
          ...createUiSlice(set, get, api),
          ...createNetSlice(set, get, api),
        }),
        {
          name: "sen-app-store",
          partialize: persistKeys,
          version: 1,
        },
      ),
    ),
    { name: "sen-app" },
  ),
);

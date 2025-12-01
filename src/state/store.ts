import { createWithEqualityFn } from "zustand/traditional";
import { shallow } from "zustand/shallow";
import { devtools, persist, subscribeWithSelector } from "zustand/middleware";
import { StoreApi, UseBoundStore } from "zustand";
import { createSessionSlice } from "./sessionSlice";
import { createGameSlice } from "./gameSlice";
import { createUiSlice } from "./uiSlice";
import { createNetSlice } from "./netSlice";
import { AppState } from "./types";

/**
 * Zustand v5: Auto-generated selectors helper
 * Creates a .use property on the store with selector hooks for each state key.
 * Usage: useAppStore.use.playerId() instead of useAppStore((s) => s.playerId)
 */
type WithSelectors<S> = S extends { getState: () => infer T }
  ? S & { use: { [K in keyof T]: () => T[K] } }
  : never;

const createSelectors = <S extends UseBoundStore<StoreApi<object>>>(
  _store: S,
): WithSelectors<S> => {
  const store = _store as WithSelectors<typeof _store>;
  store.use = {} as typeof store.use;
  for (const k of Object.keys(store.getState())) {
    (store.use as Record<string, () => unknown>)[k] = () =>
      store((s) => s[k as keyof typeof s]);
  }
  return store;
};

const persistKeys = (state: AppState): Partial<AppState> => ({
  playerId: state.playerId,
  playerName: state.playerName,
  roomId: state.roomId,
  locale: state.locale,
  theme: state.theme,
  reducedMotion: state.reducedMotion,
});

/**
 * Zustand v5 store using createWithEqualityFn with shallow comparison
 * This skips re-renders when selectors return structurally identical values.
 */
const useAppStoreBase = createWithEqualityFn<AppState>()(
  devtools(
    subscribeWithSelector(
      persist<AppState>(
        (set, get, api) => ({
          ...createSessionSlice(set, get, api),
          ...createGameSlice(set, get, api),
          ...createUiSlice(set, get, api),
          ...createNetSlice(set, get, api),
        }),
        {
          name: "sen-app-store",
          partialize: (state) => persistKeys(state) as unknown as AppState,
          version: 1,
          /**
           * Migration function for handling schema changes between versions.
           * Add migration logic here when bumping the version number.
           */
          migrate: (persistedState, version) => {
            const state = persistedState as Partial<AppState>;
            
            if (version === 0) {
              // Example: migrate from version 0 to 1
              // Add any field renames or transformations here
            }
            
            return state as AppState;
          },
          /**
           * Hydration lifecycle callbacks for v5.
           * Useful for loading states and post-hydration initialization.
           */
          onRehydrateStorage: () => {
            console.log("[store] Hydration starting...");
            return (_state, error) => {
              if (error) {
                console.error("[store] Hydration failed:", error);
              } else {
                console.log("[store] Hydration finished");
              }
            };
          },
        },
      ),
    ),
    { name: "sen-app" },
  ),
  shallow, // Default equality function for all selectors
);

/**
 * Main app store with auto-generated selectors.
 * 
 * Usage examples:
 * - Auto selector: useAppStore.use.playerId()
 * - Custom selector: useAppStore((s) => s.game.players)
 * - Shallow selector: useAppStore(useShallow((s) => ({ a: s.a, b: s.b })))
 */
export const useAppStore = createSelectors(useAppStoreBase);

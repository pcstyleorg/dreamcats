import { createWithEqualityFn } from 'zustand/traditional';
import { shallow } from 'zustand/shallow';
import { StoreApi, UseBoundStore } from 'zustand';
import { safeLocalStorage } from '@/lib/storage';

export type TutorialStep =
  | 'inactive'
  | 'welcome'
  | 'goal'
  | 'hand'
  | 'peeking'
  | 'deck'
  | 'discard'
  | 'drawing'
  | 'special_cards'
  | 'pobudka'
  | 'scoring'
  | 'end';

export interface TutorialStore {
  step: TutorialStep;
  startTutorial: () => void;
  nextStep: () => void;
  prevStep: () => void;
  endTutorial: () => void;
  setStep: (step: TutorialStep) => void;
  skipToGameplay: () => void;
}

const TUTORIAL_FLAG = 'dreamcats_tutorial_completed';

const stepOrder: TutorialStep[] = [
  'inactive',
  'welcome',
  'goal',
  'hand',
  'peeking',
  'deck',
  'discard',
  'drawing',
  'special_cards',
  'pobudka',
  'scoring',
  'end',
];

/**
 * Zustand v5: Auto-generated selectors helper for tutorial store
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

const useTutorialStoreBase = createWithEqualityFn<TutorialStore>()(
  (set, get) => ({
    step: 'inactive',
    startTutorial: () => set({ step: 'goal' }),
    nextStep: () => {
      const prev = get().step;
      const currentIndex = stepOrder.indexOf(prev);
      if (currentIndex < stepOrder.length - 1) {
        set({ step: stepOrder[currentIndex + 1] });
      } else {
        set({ step: 'inactive' });
      }
    },
    prevStep: () => {
      const prev = get().step;
      const currentIndex = stepOrder.indexOf(prev);
      // Don't go back past 'goal' (index 2)
      if (currentIndex > 2) {
        set({ step: stepOrder[currentIndex - 1] });
      }
    },
    skipToGameplay: () => {
      set({ step: 'peeking' });
    },
    endTutorial: () => {
      safeLocalStorage.setItem(TUTORIAL_FLAG, 'true');
      set({ step: 'inactive' });
    },
    setStep: (step: TutorialStep) => set({ step }),
  }),
  shallow,
);

/**
 * Tutorial store with auto-generated selectors.
 * 
 * Usage: useTutorialStore.use.step() instead of useTutorialStore((s) => s.step)
 */
export const useTutorialStore = createSelectors(useTutorialStoreBase);

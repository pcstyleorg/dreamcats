import { create } from 'zustand';

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

const TUTORIAL_FLAG = 'sen_tutorial_completed';

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

export const useTutorialStore = create<TutorialStore>((set, get) => ({
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
    localStorage.setItem(TUTORIAL_FLAG, 'true');
    set({ step: 'inactive' });
  },
  setStep: (step: TutorialStep) => set({ step }),
}));

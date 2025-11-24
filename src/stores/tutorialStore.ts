import { create } from 'zustand';

export type TutorialStep =
  | 'inactive'
  | 'welcome'
  | 'goal'
  | 'hand'
  | 'peeking'
  | 'piles'
  | 'actions'
  | 'pobudka'
  | 'end';

export interface TutorialStore {
  step: TutorialStep;
  startTutorial: () => void;
  nextStep: () => void;
  endTutorial: () => void;
  setStep: (step: TutorialStep) => void;
}

const TUTORIAL_FLAG = 'sen_tutorial_completed';

export const useTutorialStore = create<TutorialStore>((set, get) => ({
  step: 'inactive',
  startTutorial: () => set({ step: 'goal' }),
  nextStep: () => {
    const prev = get().step;
    switch (prev) {
      case 'goal':
        set({ step: 'hand' });
        break;
      case 'hand':
        set({ step: 'peeking' });
        break;
      case 'peeking':
        set({ step: 'piles' });
        break;
      case 'piles':
        set({ step: 'actions' });
        break;
      case 'actions':
        set({ step: 'pobudka' });
        break;
      case 'pobudka':
        set({ step: 'end' });
        break;
      default:
        set({ step: 'inactive' });
    }
  },
  endTutorial: () => {
    localStorage.setItem(TUTORIAL_FLAG, 'true');
    set({ step: 'inactive' });
  },
  setStep: (step: TutorialStep) => set({ step }),
}));

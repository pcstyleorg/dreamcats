let create: any;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  create = require('zustand').default;
} catch {
  // fallback to our shim to allow local builds without installing Zustand
  // using require to avoid TypeScript's module resolution failure in the environment
  create = require('./zustand-shim').create;
}




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

const typedCreate: <T>(fn: (set: any, get: any) => T) => any = create;
export const useTutorialStore = typedCreate<TutorialStore>((set: (value: Partial<TutorialStore>) => void, get: () => TutorialStore) => ({

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

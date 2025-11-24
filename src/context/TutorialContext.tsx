import { createContext, useContext, ReactNode, useEffect } from "react";
import { useTutorialStore, TutorialStep } from "@/stores/tutorialStore";

// Small local interface to avoid importing store types all over the app
interface LocalTutorialContextType {
  step: TutorialStep;
  startTutorial: () => void;
  nextStep: () => void;
  endTutorial: () => void;
  setStep: (step: TutorialStep) => void;
}

const TutorialContext = createContext<LocalTutorialContextType | undefined>(undefined);

// Re-export hook for consumers to continue using the same API
export { useTutorialStore } from '@/stores/tutorialStore';
export type { TutorialStep } from '@/stores/tutorialStore';

// Provide a legacy useTutorial hook for backward compatibility, delegating to the store
export const useTutorialLegacy = useTutorialStore as unknown as (selector?: (s: any) => any) => any;

export const TutorialProvider = ({ children }: { children: ReactNode }) => {
  const step = useTutorialStore((s: import('@/stores/tutorialStore').TutorialStore) => s.step);
  const startTutorial = useTutorialStore((s: import('@/stores/tutorialStore').TutorialStore) => s.startTutorial);
  const nextStep = useTutorialStore((s: import('@/stores/tutorialStore').TutorialStore) => s.nextStep);
  const endTutorial = useTutorialStore((s: import('@/stores/tutorialStore').TutorialStore) => s.endTutorial);
  const setStep = useTutorialStore((s: import('@/stores/tutorialStore').TutorialStore) => s.setStep);

  useEffect(() => {
    const tutorialCompleted = localStorage.getItem("sen_tutorial_completed");
    if (!tutorialCompleted) {
      setStep("welcome");
    }
  }, [setStep]);

  return (
    <TutorialContext.Provider value={{ step, startTutorial, nextStep, endTutorial, setStep }}>
      {children}
    </TutorialContext.Provider>
  );
};

export const useTutorial = () => {
  const context = useContext(TutorialContext);
  if (context === undefined) {
    throw new Error("useTutorial must be used within a TutorialProvider");
  }
  return context;
};

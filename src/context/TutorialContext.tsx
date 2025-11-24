import { createContext, useContext, ReactNode, useEffect } from "react";
import { useTutorialStore, TutorialStep, TutorialStore } from "@/stores/tutorialStore";

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

// Provide a legacy hook that mirrors the previous signature while staying typed
export const useTutorialLegacy = <T = TutorialStore>(
  selector?: (state: TutorialStore) => T,
) => useTutorialStore(selector ?? ((s) => s as unknown as T));

export const TutorialProvider = ({ children }: { children: ReactNode }) => {
  const step = useTutorialStore((s: TutorialStore) => s.step);
  const startTutorial = useTutorialStore((s: TutorialStore) => s.startTutorial);
  const nextStep = useTutorialStore((s: TutorialStore) => s.nextStep);
  const endTutorial = useTutorialStore((s: TutorialStore) => s.endTutorial);
  const setStep = useTutorialStore((s: TutorialStore) => s.setStep);

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

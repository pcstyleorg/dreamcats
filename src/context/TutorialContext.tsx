/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, ReactNode, useEffect } from "react";
import { useTutorialStore, TutorialStore, TutorialStep } from "@/stores/tutorialStore";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { shouldShowTutorialWelcome } from "@/lib/tutorial-visibility";

// Small local interface to avoid importing store types all over the app
interface LocalTutorialContextType {
  step: TutorialStep;
  startTutorial: () => void;
  nextStep: () => void;
  prevStep: () => void;
  endTutorial: () => void;
  setStep: (step: TutorialStep) => void;
  skipToGameplay: () => void;
}

const TutorialContext = createContext<LocalTutorialContextType | undefined>(undefined);

// Re-export moved to tutorialExports to keep this file component-only for fast refresh

export const TutorialProvider = ({ children }: { children: ReactNode }) => {
  const isAuthenticated = false;
  const { isLoading: prefsLoading, tutorialCompleted, setTutorialCompleted } =
    useUserPreferences();
  const step = useTutorialStore((s: TutorialStore) => s.step);
  const startTutorial = useTutorialStore((s: TutorialStore) => s.startTutorial);
  const nextStep = useTutorialStore((s: TutorialStore) => s.nextStep);
  const prevStep = useTutorialStore((s: TutorialStore) => s.prevStep);
  const endTutorialStore = useTutorialStore((s: TutorialStore) => s.endTutorial);
  const setStep = useTutorialStore((s: TutorialStore) => s.setStep);
  const skipToGameplay = useTutorialStore((s: TutorialStore) => s.skipToGameplay);

  useEffect(() => {
    if (
      shouldShowTutorialWelcome({
        isAuthenticated,
        prefsLoading,
        tutorialCompleted,
        step,
      })
    ) {
      setStep("welcome");
    }
  }, [isAuthenticated, prefsLoading, setStep, step, tutorialCompleted]);

  const endTutorial = () => {
    endTutorialStore();
    setTutorialCompleted(true);
  };

  return (
    <TutorialContext.Provider value={{ step, startTutorial, nextStep, prevStep, endTutorial, setStep, skipToGameplay }}>
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

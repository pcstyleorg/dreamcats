import {
  createContext,
  useState,
  useContext,
  ReactNode,
  useEffect,
} from "react";

type TutorialStep =
  | "inactive"
  | "welcome"
  | "goal"
  | "hand"
  | "peeking"
  | "piles"
  | "actions"
  | "pobudka"
  | "end";

interface TutorialContextType {
  step: TutorialStep;
  startTutorial: () => void;
  nextStep: () => void;
  endTutorial: () => void;
  setStep: (step: TutorialStep) => void;
}

const TutorialContext = createContext<TutorialContextType | undefined>(
  undefined,
);

export const TutorialProvider = ({ children }: { children: ReactNode }) => {
  const [step, setStep] = useState<TutorialStep>("inactive");

  useEffect(() => {
    const tutorialCompleted = localStorage.getItem("sen_tutorial_completed");
    if (!tutorialCompleted) {
      setStep("welcome");
    }
  }, []);

  const startTutorial = () => {
    setStep("goal");
  };

  const nextStep = () => {
    setStep((prev) => {
      switch (prev) {
        case "goal":
          return "hand";
        case "hand":
          return "peeking";
        case "peeking":
          return "piles";
        case "piles":
          return "actions";
        case "actions":
          return "pobudka";
        case "pobudka":
          return "end";
        default:
          return "inactive";
      }
    });
  };

  const endTutorial = () => {
    localStorage.setItem("sen_tutorial_completed", "true");
    setStep("inactive");
  };

  return (
    <TutorialContext.Provider
      value={{ step, startTutorial, nextStep, endTutorial, setStep }}
    >
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

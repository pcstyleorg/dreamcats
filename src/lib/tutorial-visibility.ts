import type { TutorialStep } from "@/stores/tutorialStore";

export const shouldShowTutorialWelcome = ({
  isAuthenticated,
  prefsLoading,
  tutorialCompleted,
  step,
}: {
  isAuthenticated: boolean;
  prefsLoading: boolean;
  tutorialCompleted: boolean;
  step: TutorialStep;
}): boolean => {
  // If auth-backed preferences are still loading, don't show the dialog yet.
  // (Unauthed users rely on local storage and can proceed immediately.)
  if (isAuthenticated && prefsLoading) return false;

  // Only show the welcome dialog when the tutorial isn't already in progress.
  return !tutorialCompleted && step === "inactive";
};


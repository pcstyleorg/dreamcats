import { useTutorialStore, type TutorialStore, type TutorialStep } from "@/stores/tutorialStore";

export { useTutorialStore };
export type { TutorialStep, TutorialStore };

// Legacy hook kept for compatibility, separated to avoid fast-refresh warnings
export const useTutorialLegacy = <T = TutorialStore>(
  selector?: (state: TutorialStore) => T,
) => useTutorialStore(selector ?? ((s) => s as unknown as T));

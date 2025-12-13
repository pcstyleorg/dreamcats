import { describe, it, expect } from "vitest";
import { shouldShowTutorialWelcome } from "@/lib/tutorial-visibility";

describe("shouldShowTutorialWelcome", () => {
  it("shows welcome when tutorial is not completed and step is inactive", () => {
    expect(
      shouldShowTutorialWelcome({
        isAuthenticated: false,
        prefsLoading: false,
        tutorialCompleted: false,
        step: "inactive",
      }),
    ).toBe(true);
  });

  it("does not show welcome when tutorial is already in progress", () => {
    expect(
      shouldShowTutorialWelcome({
        isAuthenticated: false,
        prefsLoading: false,
        tutorialCompleted: false,
        step: "goal",
      }),
    ).toBe(false);
  });

  it("does not show welcome when tutorial is completed", () => {
    expect(
      shouldShowTutorialWelcome({
        isAuthenticated: false,
        prefsLoading: false,
        tutorialCompleted: true,
        step: "inactive",
      }),
    ).toBe(false);
  });

  it("does not show welcome while authed preferences are loading", () => {
    expect(
      shouldShowTutorialWelcome({
        isAuthenticated: true,
        prefsLoading: true,
        tutorialCompleted: false,
        step: "inactive",
      }),
    ).toBe(false);
  });
});


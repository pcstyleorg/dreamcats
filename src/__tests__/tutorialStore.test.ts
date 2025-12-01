import { describe, it, expect, beforeEach } from 'vitest';
import { useTutorialStore, TutorialStep } from '@/stores/tutorialStore';

describe('tutorialStore', () => {
  beforeEach(() => {
    // Reset store to initial state
    useTutorialStore.setState({ step: 'inactive' });
    // Clear localStorage
    localStorage.clear();
  });

  describe('initial state', () => {
    it('starts with inactive step', () => {
      expect(useTutorialStore.getState().step).toBe('inactive');
    });
  });

  describe('startTutorial', () => {
    it('sets step to goal when starting tutorial', () => {
      useTutorialStore.getState().startTutorial();
      expect(useTutorialStore.getState().step).toBe('goal');
    });
  });

  describe('nextStep', () => {
    it('advances to next step in order', () => {
      useTutorialStore.setState({ step: 'goal' });
      useTutorialStore.getState().nextStep();
      expect(useTutorialStore.getState().step).toBe('hand');
    });

    it('progresses through the tutorial flow', () => {
      const expectedOrder: TutorialStep[] = [
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

      useTutorialStore.setState({ step: 'goal' });

      for (let i = 1; i < expectedOrder.length; i++) {
        useTutorialStore.getState().nextStep();
        expect(useTutorialStore.getState().step).toBe(expectedOrder[i]);
      }
    });

    it('goes to inactive after end step', () => {
      useTutorialStore.setState({ step: 'end' });
      useTutorialStore.getState().nextStep();
      expect(useTutorialStore.getState().step).toBe('inactive');
    });

    it('handles being at inactive step', () => {
      useTutorialStore.setState({ step: 'inactive' });
      useTutorialStore.getState().nextStep();
      expect(useTutorialStore.getState().step).toBe('welcome');
    });
  });

  describe('prevStep', () => {
    it('goes back to previous step', () => {
      useTutorialStore.setState({ step: 'peeking' });
      useTutorialStore.getState().prevStep();
      expect(useTutorialStore.getState().step).toBe('hand');
    });

    it('does not go back past goal step', () => {
      useTutorialStore.setState({ step: 'goal' });
      useTutorialStore.getState().prevStep();
      expect(useTutorialStore.getState().step).toBe('goal');
    });

    it('does not go back from hand (stops at goal)', () => {
      useTutorialStore.setState({ step: 'hand' });
      useTutorialStore.getState().prevStep();
      // hand is index 3, goal is index 2, so it goes back to goal
      expect(useTutorialStore.getState().step).toBe('goal');
    });
  });

  describe('skipToGameplay', () => {
    it('skips to peeking step', () => {
      useTutorialStore.setState({ step: 'welcome' });
      useTutorialStore.getState().skipToGameplay();
      expect(useTutorialStore.getState().step).toBe('peeking');
    });
  });

  describe('endTutorial', () => {
    it('sets step to inactive', () => {
      useTutorialStore.setState({ step: 'scoring' });
      useTutorialStore.getState().endTutorial();
      expect(useTutorialStore.getState().step).toBe('inactive');
    });

    it('saves completion flag to localStorage', () => {
      useTutorialStore.getState().endTutorial();
      expect(localStorage.getItem('sen_tutorial_completed')).toBe('true');
    });
  });

  describe('setStep', () => {
    it('sets step to any valid value', () => {
      useTutorialStore.getState().setStep('special_cards');
      expect(useTutorialStore.getState().step).toBe('special_cards');
    });

    it('can set step to any tutorial step', () => {
      const steps: TutorialStep[] = [
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

      for (const step of steps) {
        useTutorialStore.getState().setStep(step);
        expect(useTutorialStore.getState().step).toBe(step);
      }
    });
  });

  describe('auto-generated selectors', () => {
    it('provides use.step selector', () => {
      expect(useTutorialStore.use).toBeDefined();
      expect(typeof useTutorialStore.use.step).toBe('function');
    });

    it('provides use.startTutorial selector', () => {
      expect(typeof useTutorialStore.use.startTutorial).toBe('function');
    });

    it('provides use.nextStep selector', () => {
      expect(typeof useTutorialStore.use.nextStep).toBe('function');
    });

    it('provides use.prevStep selector', () => {
      expect(typeof useTutorialStore.use.prevStep).toBe('function');
    });

    it('provides use.endTutorial selector', () => {
      expect(typeof useTutorialStore.use.endTutorial).toBe('function');
    });

    it('provides use.setStep selector', () => {
      expect(typeof useTutorialStore.use.setStep).toBe('function');
    });

    it('provides use.skipToGameplay selector', () => {
      expect(typeof useTutorialStore.use.skipToGameplay).toBe('function');
    });
  });
});

describe('tutorial step order', () => {
  beforeEach(() => {
    useTutorialStore.setState({ step: 'inactive' });
  });

  it('complete tutorial flow from start to end', () => {
    // Start the tutorial
    useTutorialStore.getState().startTutorial();
    expect(useTutorialStore.getState().step).toBe('goal');

    // Go through all steps
    useTutorialStore.getState().nextStep(); // goal -> hand
    expect(useTutorialStore.getState().step).toBe('hand');

    useTutorialStore.getState().nextStep(); // hand -> peeking
    expect(useTutorialStore.getState().step).toBe('peeking');

    useTutorialStore.getState().nextStep(); // peeking -> deck
    expect(useTutorialStore.getState().step).toBe('deck');

    useTutorialStore.getState().nextStep(); // deck -> discard
    expect(useTutorialStore.getState().step).toBe('discard');

    useTutorialStore.getState().nextStep(); // discard -> drawing
    expect(useTutorialStore.getState().step).toBe('drawing');

    useTutorialStore.getState().nextStep(); // drawing -> special_cards
    expect(useTutorialStore.getState().step).toBe('special_cards');

    useTutorialStore.getState().nextStep(); // special_cards -> pobudka
    expect(useTutorialStore.getState().step).toBe('pobudka');

    useTutorialStore.getState().nextStep(); // pobudka -> scoring
    expect(useTutorialStore.getState().step).toBe('scoring');

    useTutorialStore.getState().nextStep(); // scoring -> end
    expect(useTutorialStore.getState().step).toBe('end');

    useTutorialStore.getState().nextStep(); // end -> inactive
    expect(useTutorialStore.getState().step).toBe('inactive');
  });

  it('can go back during tutorial', () => {
    useTutorialStore.setState({ step: 'special_cards' });
    
    useTutorialStore.getState().prevStep();
    expect(useTutorialStore.getState().step).toBe('drawing');
    
    useTutorialStore.getState().prevStep();
    expect(useTutorialStore.getState().step).toBe('discard');
    
    useTutorialStore.getState().prevStep();
    expect(useTutorialStore.getState().step).toBe('deck');
    
    useTutorialStore.getState().prevStep();
    expect(useTutorialStore.getState().step).toBe('peeking');
    
    useTutorialStore.getState().prevStep();
    expect(useTutorialStore.getState().step).toBe('hand');
    
    // hand is index 3, goal is index 2, so prevStep goes to goal
    useTutorialStore.getState().prevStep();
    expect(useTutorialStore.getState().step).toBe('goal');
    
    // Can't go back past goal (stays at goal)
    useTutorialStore.getState().prevStep();
    expect(useTutorialStore.getState().step).toBe('goal');
  });
});

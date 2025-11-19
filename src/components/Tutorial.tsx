import React, { useEffect, useState } from 'react';
import { useTutorial } from '@/context/TutorialContext';
import { useGame } from '@/context/GameContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Popover, PopoverContent, PopoverAnchor } from './ui/popover';
import { Button } from './ui/button';

const TutorialPopover: React.FC<{
  targetId: string;
  step: string;
  title: string;
  description: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
  onNext: () => void;
}> = ({ targetId, step, title, description, side = 'bottom', onNext }) => {
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const element = document.querySelector(`[data-tutorial-id="${targetId}"]`) as HTMLElement;
    setTargetElement(element);
  }, [targetId]);

  const { step: currentStep } = useTutorial();
  const isOpen = currentStep === step && !!targetElement;

  return (
    <Popover open={isOpen}>
      <PopoverAnchor asChild>
        <div style={{
          position: 'absolute',
          top: targetElement?.offsetTop,
          left: targetElement?.offsetLeft,
          width: targetElement?.offsetWidth,
          height: targetElement?.offsetHeight,
          pointerEvents: 'none'
        }} />
      </PopoverAnchor>
      <PopoverContent side={side} className="z-[200] max-w-xs">
        <div className="space-y-2">
          <h4 className="font-bold font-heading">{title}</h4>
          <p className="text-sm">{description}</p>
          <Button onClick={onNext} className="w-full">Next</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export const Tutorial: React.FC = () => {
  const { step, startTutorial, nextStep, endTutorial, setStep } = useTutorial();
  const { state } = useGame();

  useEffect(() => {
    if (step === 'peeking' && state.gamePhase !== 'peeking') {
      nextStep();
    }
    if (step === 'pobudka' && state.gamePhase !== 'playing') {
      setStep('end');
    }
  }, [state.gamePhase, step, nextStep, setStep]);

  return (
    <>
      {/* Welcome Dialog */}
      <Dialog open={step === 'welcome'}>
        <DialogContent className="bg-card/80 backdrop-blur-lg border-white/20">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl">Welcome to Sen!</DialogTitle>
            <DialogDescription>It looks like this is your first time. Would you like a quick tutorial?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={endTutorial}>No, thanks</Button>
            <Button onClick={startTutorial}>Yes, please!</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tutorial Steps */}
      {state.gamePhase !== 'lobby' && (
        <>
          <TutorialPopover
            targetId="scoreboard"
            step="goal"
            title="The Goal"
            description="Have the lowest total ravens (points) in your four-card Dream when the round ends."
            onNext={nextStep}
            side="left"
          />
          <TutorialPopover
            targetId="player-hand"
            step="hand"
            title="Your Dream"
            description="You have 4 face-down cards. You can't freely look at them—memory matters."
            onNext={nextStep}
            side="top"
          />
          {state.gamePhase === 'peeking' && (
            <TutorialPopover
              targetId="player-hand"
              step="peeking"
              title="Mandatory Initial Peek"
              description="Before the first turn of the round, you must peek at any two of your four face-down cards, then put them back without changing positions."
              onNext={nextStep}
              side="top"
            />
          )}
          <TutorialPopover
            targetId="piles"
            step="piles"
            title="The Piles"
            description="On your turn, choose: take the top card from the face-up Discard Pile (known), or draw from the face-down Deck (unknown)."
            onNext={nextStep}
            side="top"
          />
          <TutorialPopover
            targetId="game-actions"
            step="actions"
            title="Turn Options"
            description="If you take from Discard: you must swap it with one of your face-down cards. If you draw from Deck: choose to swap, discard, or—only if it's a 5/6/7—use its special action."
            onNext={nextStep}
            side="top"
          />
          {state.gamePhase === 'playing' && (
            <TutorialPopover
              targetId="pobudka-button"
              step="pobudka"
              title="Call “POBUDKA!” (Wake Up)"
              description="At the start of your turn, if you think you have the lowest score, call “POBUDKA!” instead of drawing. Everyone reveals and scores. If you're wrong, add a 5-raven penalty."
              onNext={nextStep}
              side="top"
            />
          )}
        </>
      )}

      {/* End Dialog */}
      <Dialog open={step === 'end'}>
        <DialogContent className="bg-card/80 backdrop-blur-lg border-white/20">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl">You're Ready!</DialogTitle>
            <DialogDescription>Have fun—and may your dreams be free of ravens.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={endTutorial}>Let's Play!</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

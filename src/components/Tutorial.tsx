import React, { useEffect, useState } from 'react';
import { useTutorial } from '@/context/TutorialContext';
import { useGame } from '@/context/GameContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Popover, PopoverContent, PopoverAnchor } from './ui/popover';
import { Button } from './ui/button';
import { useLanguage } from '@/context/LanguageContext';

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
  const { t } = useLanguage();
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
            <DialogTitle className="font-heading text-2xl">{t("tutorial.welcome")}</DialogTitle>
            <DialogDescription>{t("tutorial.firstTime")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={endTutorial}>{t("tutorial.noThanks")}</Button>
            <Button onClick={startTutorial}>{t("tutorial.yesPlease")}</Button>
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
            description="Your objective is simple: have the lowest score (the fewest crows) at the end of each round."
            onNext={nextStep}
            side="left"
          />
          <TutorialPopover
            targetId="player-hand"
            step="hand"
            title="Your Hand"
            description="These are your four secret cards. You can't look at them freely, so memory is key!"
            onNext={nextStep}
            side="top"
          />
          {state.gamePhase === 'peeking' && (
            <TutorialPopover
              targetId="player-hand"
              step="peeking"
              title="First Peek"
              description="At the start of a round, you get to peek at any two of your cards. Click two to reveal them, then press 'Finish Peeking'."
              onNext={nextStep}
              side="top"
            />
          )}
          <TutorialPopover
            targetId="piles"
            step="piles"
            title="The Piles"
            description="On your turn, draw a card from the face-down Draw Pile or the face-up Discard Pile."
            onNext={nextStep}
            side="top"
          />
          <TutorialPopover
            targetId="game-actions"
            step="actions"
            title="Taking Action"
            description="After drawing, you can swap the card with one in your hand, discard it, or use its special action if it has one."
            onNext={nextStep}
            side="top"
          />
          {state.gamePhase === 'playing' && (
            <TutorialPopover
              targetId="pobudka-button"
              step="pobudka"
              title="Call 'POBUDKA!'"
              description="When you think your score is the lowest, press this on your turn instead of drawing a card to end the round. Be careful—if you're wrong, you get a penalty!"
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
            <DialogDescription>That's all you need to know. Have fun, and may your dreams be free of crows!</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={endTutorial}>Let's Play!</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

import React, { useEffect, useState } from 'react';
import { useTutorial } from '@/context/TutorialContext';
import { useGame } from '@/context/GameContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Popover, PopoverContent, PopoverAnchor } from './ui/popover';
import { Button } from './ui/button';
import { useTranslation } from 'react-i18next';

const TutorialPopover: React.FC<{
  targetId: string;
  step: string;
  title: string;
  description: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
  onNext: () => void;
}> = ({ targetId, step, title, description, side = 'bottom', onNext }) => {
  const { t } = useTranslation();
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
          <Button onClick={onNext} className="w-full">{t('tutorial.next')}</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export const Tutorial: React.FC = () => {
  const { t } = useTranslation();
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
            <DialogTitle className="font-heading text-2xl">{t('tutorial.welcomeTitle')}</DialogTitle>
            <DialogDescription>{t('tutorial.welcomeDescription')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={endTutorial}>{t('tutorial.noThanks')}</Button>
            <Button onClick={startTutorial}>{t('tutorial.yesPlease')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tutorial Steps */}
      {state.gamePhase !== 'lobby' && (
        <>
          <TutorialPopover
            targetId="scoreboard"
            step="goal"
            title={t('tutorial.goalTitle')}
            description={t('tutorial.goalDescription')}
            onNext={nextStep}
            side="left"
          />
          <TutorialPopover
            targetId="player-hand"
            step="hand"
            title={t('tutorial.handTitle')}
            description={t('tutorial.handDescription')}
            onNext={nextStep}
            side="top"
          />
          {state.gamePhase === 'peeking' && (
            <TutorialPopover
              targetId="player-hand"
              step="peeking"
              title={t('tutorial.firstPeekTitle')}
              description={t('tutorial.firstPeekDescription')}
              onNext={nextStep}
              side="top"
            />
          )}
          <TutorialPopover
            targetId="piles"
            step="piles"
            title={t('tutorial.pilesTitle')}
            description={t('tutorial.pilesDescription')}
            onNext={nextStep}
            side="top"
          />
          <TutorialPopover
            targetId="game-actions"
            step="actions"
            title={t('tutorial.actionsTitle')}
            description={t('tutorial.actionsDescription')}
            onNext={nextStep}
            side="top"
          />
          {state.gamePhase === 'playing' && (
            <TutorialPopover
              targetId="pobudka-button"
              step="pobudka"
              title={t('tutorial.pobudkaTitle')}
              description={t('tutorial.pobudkaDescription')}
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
            <DialogTitle className="font-heading text-2xl">{t('tutorial.readyTitle')}</DialogTitle>
            <DialogDescription>{t('tutorial.readyDescription')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={endTutorial}>{t('tutorial.letsPlay')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

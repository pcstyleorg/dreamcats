import React, { useEffect, useState, useCallback } from 'react';
import { useTutorial } from '@/context/TutorialContext';
import { useGame } from '@/state/useGame';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, X, Sparkles, Eye, RefreshCw, Zap, AlertTriangle, Trophy, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TutorialStepContent {
  icon: React.ReactNode;
  title: string;
  description: string;
  tip?: string;
  highlightSelector?: string;
}

export const Tutorial: React.FC = () => {
  const { t } = useTranslation();
  const { step, startTutorial, nextStep, prevStep, endTutorial, setStep } = useTutorial();
  const { state } = useGame();
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);

  // Get step content configuration
  const getStepContent = useCallback((): TutorialStepContent | null => {
    switch (step) {
      case 'goal':
        return {
          icon: <Trophy className="h-8 w-8 text-amber-400" />,
          title: t('tutorial.goalTitle'),
          description: t('tutorial.goalDescription'),
          tip: t('tutorial.goalTip'),
          highlightSelector: '[data-tutorial-id="scoreboard"]',
        };
      case 'hand':
        return {
          icon: <Eye className="h-8 w-8 text-purple-400" />,
          title: t('tutorial.handTitle'),
          description: t('tutorial.handDescription'),
          tip: t('tutorial.handTip'),
          highlightSelector: '[data-tutorial-id="player-hand"]',
        };
      case 'peeking':
        return {
          icon: <Eye className="h-8 w-8 text-cyan-400" />,
          title: t('tutorial.firstPeekTitle'),
          description: t('tutorial.firstPeekDescription'),
          tip: t('tutorial.firstPeekTip'),
          highlightSelector: '[data-tutorial-id="player-hand"]',
        };
      case 'deck':
        return {
          icon: <Sparkles className="h-8 w-8 text-indigo-400" />,
          title: t('tutorial.deckTitle'),
          description: t('tutorial.deckDescription'),
          tip: t('tutorial.deckTip'),
          highlightSelector: '[data-tutorial-id="draw-pile"]',
        };
      case 'discard':
        return {
          icon: <RefreshCw className="h-8 w-8 text-emerald-400" />,
          title: t('tutorial.discardTitle'),
          description: t('tutorial.discardDescription'),
          tip: t('tutorial.discardTip'),
          highlightSelector: '[data-tutorial-id="discard-pile"]',
        };
      case 'drawing':
        return {
          icon: <ArrowRight className="h-8 w-8 text-blue-400" />,
          title: t('tutorial.drawingTitle'),
          description: t('tutorial.drawingDescription'),
          tip: t('tutorial.drawingTip'),
          highlightSelector: '[data-tutorial-id="piles"]',
        };
      case 'special_cards':
        return {
          icon: <Zap className="h-8 w-8 text-pink-400" />,
          title: t('tutorial.specialCardsTitle'),
          description: t('tutorial.specialCardsDescription'),
          tip: t('tutorial.specialCardsTip'),
        };
      case 'pobudka':
        return {
          icon: <AlertTriangle className="h-8 w-8 text-red-400" />,
          title: t('tutorial.pobudkaTitle'),
          description: t('tutorial.pobudkaDescription'),
          tip: t('tutorial.pobudkaTip'),
          highlightSelector: '[data-tutorial-id="pobudka-button"]',
        };
      case 'scoring':
        return {
          icon: <Trophy className="h-8 w-8 text-amber-400" />,
          title: t('tutorial.scoringTitle'),
          description: t('tutorial.scoringDescription'),
          tip: t('tutorial.scoringTip'),
        };
      default:
        return null;
    }
  }, [step, t]);

  const stepContent = getStepContent();

  // Calculate total steps and current step number for progress indicator
  const tutorialSteps = ['goal', 'hand', 'peeking', 'deck', 'discard', 'drawing', 'special_cards', 'pobudka', 'scoring'];
  const currentStepIndex = tutorialSteps.indexOf(step);
  const totalSteps = tutorialSteps.length;
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === totalSteps - 1;

  // Update highlight position when step changes
  useEffect(() => {
    if (stepContent?.highlightSelector && state.gamePhase !== 'lobby') {
      const updateHighlight = () => {
        const element = document.querySelector(stepContent.highlightSelector!);
        if (element) {
          setHighlightRect(element.getBoundingClientRect());
        } else {
          setHighlightRect(null);
        }
      };
      
      // Initial update
      updateHighlight();
      
      // Update on resize/scroll
      window.addEventListener('resize', updateHighlight);
      window.addEventListener('scroll', updateHighlight, true);
      
      // Poll for element appearance (in case of delayed rendering)
      const pollInterval = setInterval(updateHighlight, 500);
      
      return () => {
        window.removeEventListener('resize', updateHighlight);
        window.removeEventListener('scroll', updateHighlight, true);
        clearInterval(pollInterval);
      };
    } else {
      setHighlightRect(null);
    }
  }, [stepContent?.highlightSelector, state.gamePhase, step]);

  // Auto-advance from peeking step when peeking phase ends
  useEffect(() => {
    if (step === 'peeking' && state.gamePhase !== 'peeking') {
      nextStep();
    }
  }, [state.gamePhase, step, nextStep]);

  // Skip ahead if player tries to interact during tutorial
  useEffect(() => {
    if (
      step === "pobudka" &&
      (state.gamePhase === "round_end" || state.gamePhase === "game_over")
    ) {
      setStep("end");
    }
  }, [state.gamePhase, step, setStep]);

  const handleNext = () => {
    if (isLastStep) {
      setStep('end');
    } else {
      nextStep();
    }
  };

  const isShowingSteps = stepContent !== null && state.gamePhase !== 'lobby';

  return (
    <>
      {/* Welcome Dialog */}
      <Dialog open={step === 'welcome'}>
        <DialogContent className="bg-card/95 backdrop-blur-xl border-primary/20 shadow-2xl max-w-md">
          <DialogHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-linear-to-br from-primary to-accent flex items-center justify-center">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
            <DialogTitle className="font-heading text-3xl bg-linear-to-r from-primary to-accent bg-clip-text text-transparent">
              {t('tutorial.welcomeTitle')}
            </DialogTitle>
            <DialogDescription className="text-base text-foreground/80 leading-relaxed">
              {t('tutorial.welcomeDescription')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-3 mt-6">
            <Button 
              variant="outline" 
              onClick={endTutorial}
              className="w-full sm:w-auto border-border/60 hover:bg-muted/50"
            >
              {t('tutorial.noThanks')}
            </Button>
            <Button 
              onClick={startTutorial}
              className="w-full sm:w-auto bg-linear-to-r from-primary to-accent hover:opacity-90"
            >
              {t('tutorial.yesPlease')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Highlight Overlay */}
      <AnimatePresence>
        {isShowingSteps && highlightRect && (
          <>
            {/* Dark overlay with cutout */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-100 pointer-events-none"
              style={{
                background: `radial-gradient(circle at ${highlightRect.left + highlightRect.width / 2}px ${highlightRect.top + highlightRect.height / 2}px, transparent ${Math.max(highlightRect.width, highlightRect.height) / 2 + 20}px, rgba(0, 0, 0, 0.7) ${Math.max(highlightRect.width, highlightRect.height) / 2 + 60}px)`,
              }}
            />
            {/* Highlight ring */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed z-101 pointer-events-none rounded-xl ring-2 ring-primary ring-offset-2 ring-offset-transparent"
              style={{
                top: highlightRect.top - 8,
                left: highlightRect.left - 8,
                width: highlightRect.width + 16,
                height: highlightRect.height + 16,
                boxShadow: '0 0 30px rgba(139, 92, 246, 0.4)',
              }}
            />
          </>
        )}
      </AnimatePresence>

      {/* Tutorial Step Panel */}
      <AnimatePresence>
        {isShowingSteps && stepContent && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={cn(
              "fixed z-102 w-[95vw] max-w-md",
              "bottom-4 left-1/2 -translate-x-1/2",
              "sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2",
              highlightRect 
                ? highlightRect.left > window.innerWidth / 2 
                  ? "sm:left-8 sm:translate-x-0" 
                  : "sm:left-auto sm:right-8 sm:translate-x-0"
                : "sm:left-1/2 sm:-translate-x-1/2"
            )}
          >
            <div className="bg-card/95 backdrop-blur-xl border border-border/60 rounded-2xl shadow-2xl overflow-hidden">
              {/* Progress bar */}
              <div className="h-1 bg-muted">
                <div 
                  className="h-full bg-linear-to-r from-primary to-accent transition-all duration-300"
                  style={{ width: `${((currentStepIndex + 1) / totalSteps) * 100}%` }}
                />
              </div>
              
              <div className="p-5 sm:p-6">
                {/* Step indicator */}
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs text-muted-foreground font-medium">
                    {t('tutorial.stepProgress', { current: currentStepIndex + 1, total: totalSteps })}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={endTutorial}
                    className="h-8 w-8 rounded-full hover:bg-destructive/10 hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* Content */}
                <div className="flex items-start gap-4">
                  <div className="shrink-0 w-12 h-12 rounded-xl bg-linear-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                    {stepContent.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-heading text-lg font-bold text-foreground mb-2">
                      {stepContent.title}
                    </h3>
                    <p className="text-sm text-foreground/80 leading-relaxed">
                      {stepContent.description}
                    </p>
                    {stepContent.tip && (
                      <div className="mt-3 p-3 bg-primary/10 border border-primary/20 rounded-lg">
                        <p className="text-xs text-primary font-medium flex items-center gap-2">
                          <Sparkles className="h-3 w-3" />
                          {stepContent.tip}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Navigation */}
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-border/40">
                  <Button
                    variant="ghost"
                    onClick={prevStep}
                    disabled={isFirstStep}
                    className={cn(
                      "gap-1",
                      isFirstStep && "invisible"
                    )}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    {t('tutorial.back')}
                  </Button>
                  
                  <div className="flex gap-1.5">
                    {tutorialSteps.map((_, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          "w-2 h-2 rounded-full transition-colors",
                          idx === currentStepIndex 
                            ? "bg-primary" 
                            : idx < currentStepIndex 
                              ? "bg-primary/40" 
                              : "bg-muted"
                        )}
                      />
                    ))}
                  </div>

                  <Button
                    onClick={handleNext}
                    className="gap-1 bg-linear-to-r from-primary to-accent hover:opacity-90"
                  >
                    {isLastStep ? t('tutorial.finish') : t('tutorial.next')}
                    {!isLastStep && <ChevronRight className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* End Dialog */}
      <Dialog open={step === 'end'}>
        <DialogContent className="bg-card/95 backdrop-blur-xl border-primary/20 shadow-2xl max-w-md">
          <DialogHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-linear-to-br from-emerald-400 to-cyan-400 flex items-center justify-center">
              <Trophy className="h-8 w-8 text-white" />
            </div>
            <DialogTitle className="font-heading text-3xl bg-linear-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              {t('tutorial.readyTitle')}
            </DialogTitle>
            <DialogDescription className="text-base text-foreground/80 leading-relaxed">
              {t('tutorial.readyDescription')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-6">
            <Button 
              onClick={endTutorial}
              className="w-full bg-linear-to-r from-emerald-500 to-cyan-500 hover:opacity-90"
            >
              {t('tutorial.letsPlay')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

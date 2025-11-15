import React from 'react';
import { motion } from 'framer-motion';
import { Card as CardType } from '@/types';
import { cn } from '@/lib/utils';
import { Card as UICard } from '@/components/ui/card';
import { ArrowRightLeft, Layers, Sparkle } from 'lucide-react';
import { SoundType } from '@/hooks/use-sounds';
import { RavenIcon } from './icons';

interface CardProps {
  card: CardType | null;
  isFaceUp: boolean;
  onClick?: () => void;
  className?: string;
  hasBeenPeeked?: boolean;
  isGlowing?: boolean;
  playSound?: (sound: SoundType) => void;
}

const SpecialIcon = ({ action }: { action: CardType['specialAction'] }) => {
  switch (action) {
    case 'peek_1': return <Sparkle className="w-4 h-4" />;
    case 'swap_2': return <ArrowRightLeft className="w-4 h-4" />;
    case 'take_2': return <Layers className="w-4 h-4" />;
    default: return null;
  }
};

export const GameCard: React.FC<CardProps> = ({ card, isFaceUp, onClick, className, hasBeenPeeked, isGlowing, playSound }) => {
  const cardVariants = {
    faceUp: { rotateY: 180 },
    faceDown: { rotateY: 0 },
  };

  const handleClick = () => {
    if (onClick) {
        if (playSound) playSound('flip');
        onClick();
    }
  }

  return (
    <div className={cn("w-24 aspect-[2/3] md:w-28 perspective-1000", className)} onClick={handleClick}>
      <motion.div
        className="relative w-full h-full transform-style-3d"
        variants={cardVariants}
        animate={isFaceUp ? 'faceUp' : 'faceDown'}
        transition={{ duration: 0.5 }}
      >
        {/* Card Back */}
        <div className="absolute w-full h-full backface-hidden">
          <UICard className={cn(
            "w-full h-full flex items-center justify-center border bg-card transition-all duration-300 shadow-soft",
            hasBeenPeeked && "ring-2 ring-secondary",
            isGlowing && "shadow-[0_0_15px_hsl(var(--primary)/0.4)]"
            )}>
            <RavenIcon />
          </UICard>
        </div>

        {/* Card Front */}
        <div className="absolute w-full h-full backface-hidden transform-rotate-y-180">
          <UICard className={cn(
            "w-full h-full flex flex-col items-center justify-center p-1 md:p-2 border bg-card shadow-soft", 
            card?.isSpecial ? "border-primary/50" : "border-border",
            isGlowing && "shadow-[0_0_15px_hsl(var(--primary)/0.4)]"
            )}>
            {card ? (
              <>
                <div className="absolute top-2 left-2 text-base md:text-lg font-bold font-heading">{card.isSpecial ? <SpecialIcon action={card.specialAction} /> : card.value}</div>
                <div className="text-5xl md:text-6xl font-black font-heading text-foreground/80">{card.value}</div>
                <div className="absolute bottom-2 right-2 text-base md:text-lg font-bold font-heading transform -rotate-180">{card.isSpecial ? <SpecialIcon action={card.specialAction} /> : card.value}</div>
              </>
            ) : null}
          </UICard>
        </div>
      </motion.div>
    </div>
  );
};

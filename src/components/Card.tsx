import React from 'react';
import { motion } from 'framer-motion';
import { Card as CardType } from '@/types';
import { cn } from '@/lib/utils';
import { Card as UICard } from '@/components/ui/card';
import { Eye, GitCommitHorizontal, RefreshCw } from 'lucide-react';
import { SoundType } from '@/hooks/use-sounds';

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
    case 'peek_1': return <Eye className="w-4 h-4" />;
    case 'swap_2': return <RefreshCw className="w-4 h-4" />;
    case 'take_2': return <GitCommitHorizontal className="w-4 h-4" />;
    default: return null;
  }
};

const RavenIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10 md:w-12 md:h-12 text-foreground/20">
        <path d="M14.5 7.5c0 2-1.5 3.5-3.5 3.5-2.5 0-4-2-4-4 0-2.5 1.5-4 4-4 2.5 0 3.5 1.5 3.5 3.5z" />
        <path d="M12 11.5c-3.5 0-7 2.5-7 7h14c0-4.5-3.5-7-7-7z" />
        <path d="M16.5 13.5c1.5 0 3 1.5 3 3.5" />
    </svg>
);


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
    <div className={cn("w-20 h-28 md:w-28 md:h-40 perspective-1000", className)} onClick={handleClick}>
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

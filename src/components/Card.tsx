import React from 'react';
import { motion } from 'framer-motion';
import { Card as CardType } from '@/types';
import { cn } from '@/lib/utils';
import { Card as UICard } from '@/components/ui/card';
import { Eye, GitCommitHorizontal, RefreshCw, Sparkles } from 'lucide-react';
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
            "w-full h-full flex items-center justify-center border-2 bg-gradient-to-br from-purple-800 to-indigo-800 transition-all duration-300",
            hasBeenPeeked && "border-primary",
            isGlowing && "shadow-[0_0_25px_theme(colors.primary/60%)]"
            )}>
            <Sparkles className="w-10 h-10 md:w-12 md:h-12 text-purple-300/70" />
          </UICard>
        </div>

        {/* Card Front */}
        <div className="absolute w-full h-full backface-hidden transform-rotate-y-180">
          <UICard className={cn(
            "w-full h-full flex flex-col items-center justify-center p-1 md:p-2 border-2", 
            card?.isSpecial ? "bg-purple-950/80 border-primary" : "bg-card",
            isGlowing && "shadow-[0_0_25px_theme(colors.primary/60%)]"
            )}>
            {card ? (
              <>
                <div className="absolute top-2 left-2 text-base md:text-lg font-bold font-heading">{card.isSpecial ? <SpecialIcon action={card.specialAction} /> : card.value}</div>
                <div className="text-5xl md:text-6xl font-black font-heading">{card.value}</div>
                <div className="absolute bottom-2 right-2 text-base md:text-lg font-bold font-heading transform -rotate-180">{card.isSpecial ? <SpecialIcon action={card.specialAction} /> : card.value}</div>
              </>
            ) : null}
          </UICard>
        </div>
      </motion.div>
    </div>
  );
};

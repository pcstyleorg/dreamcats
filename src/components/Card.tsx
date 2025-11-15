import React from 'react';
import { motion } from 'framer-motion';
import { Card as CardType } from '@/types';
import { cn } from '@/lib/utils';
import { Card as UICard } from '@/components/ui/card';
import { Crown, Eye, GitCommitHorizontal, RefreshCw } from 'lucide-react';

interface CardProps {
  card: CardType | null;
  isFaceUp: boolean;
  onClick?: () => void;
  className?: string;
  hasBeenPeeked?: boolean;
}

const SpecialIcon = ({ action }: { action: CardType['specialAction'] }) => {
  switch (action) {
    case 'peek_1': return <Eye className="w-4 h-4" />;
    case 'swap_2': return <RefreshCw className="w-4 h-4" />;
    case 'take_2': return <GitCommitHorizontal className="w-4 h-4" />;
    default: return null;
  }
};

export const GameCard: React.FC<CardProps> = ({ card, isFaceUp, onClick, className, hasBeenPeeked }) => {
  const cardVariants = {
    faceUp: { rotateY: 180 },
    faceDown: { rotateY: 0 },
  };

  return (
    <div className={cn("w-24 h-36 md:w-28 md:h-40 perspective-1000", className)} onClick={onClick}>
      <motion.div
        className="relative w-full h-full transform-style-3d"
        variants={cardVariants}
        animate={isFaceUp ? 'faceUp' : 'faceDown'}
        transition={{ duration: 0.5 }}
      >
        {/* Card Back */}
        <div className="absolute w-full h-full backface-hidden">
          <UICard className={cn("w-full h-full flex items-center justify-center bg-secondary border-2", hasBeenPeeked && "border-primary")}>
            <Crown className="w-12 h-12 text-secondary-foreground/50" />
          </UICard>
        </div>

        {/* Card Front */}
        <div className="absolute w-full h-full backface-hidden transform-rotate-y-180">
          <UICard className={cn("w-full h-full flex flex-col items-center justify-center p-2", card?.isSpecial ? "bg-primary/20" : "bg-card")}>
            {card ? (
              <>
                <div className="absolute top-2 left-2 text-lg font-bold">{card.isSpecial ? <SpecialIcon action={card.specialAction} /> : card.value}</div>
                <div className="text-5xl font-bold">{card.isSpecial ? <SpecialIcon action={card.specialAction} /> : card.value}</div>
                <div className="absolute bottom-2 right-2 text-lg font-bold transform-rotate-180">{card.isSpecial ? <SpecialIcon action={card.specialAction} /> : card.value}</div>
              </>
            ) : null}
          </UICard>
        </div>
      </motion.div>
    </div>
  );
};

import { motion } from "framer-motion";
import { Card as CardType } from "@/types";
import { cn } from "@/lib/utils";
import { getCardAsset, getCardBackAsset } from "@/lib/cardAssets";
import { SoundType } from "@/hooks/use-sounds";
import { Eye, ArrowLeftRight, Sparkles } from "lucide-react";

interface CardProps {
  card: CardType | null;
  isFaceUp: boolean;
  onClick?: () => void;
  className?: string;
  hasBeenPeeked?: boolean;
  isGlowing?: boolean;
  playSound?: (sound: SoundType) => void;
}

const SpecialIcon = ({ action }: { action: CardType["specialAction"] }) => {
  const iconClass = "w-3.5 h-3.5 md:w-4 md:h-4";
  switch (action) {
    case "peek_1":
      return <Eye className={iconClass} />;
    case "swap_2":
      return <ArrowLeftRight className={iconClass} />;
    case "take_2":
      return <Sparkles className={iconClass} />;
    default:
      return null;
  }
};

export const GameCard: React.FC<CardProps> = ({
  card,
  isFaceUp,
  onClick,
  className,
  hasBeenPeeked,
  isGlowing,
  playSound,
}) => {
  const cardVariants = {
    faceUp: { rotateY: 180 },
    faceDown: { rotateY: 0 },
  };

  const handleClick = () => {
    if (onClick) {
      if (playSound) playSound("flip");
      onClick();
    }
  };

  const frontAsset = getCardAsset(card);
  const backAsset = getCardBackAsset();

  return (
    <div
      className={cn("w-24 aspect-[2/3] md:w-28 perspective-1000", className)}
      onClick={handleClick}
    >
      <motion.div
        className="relative w-full h-full transform-style-3d"
        variants={cardVariants}
        animate={isFaceUp ? "faceUp" : "faceDown"}
        transition={{ duration: 0.5, ease: "easeInOut" }}
      >
        {/* Card Back */}
        <div className="absolute w-full h-full backface-hidden">
          <div
            className={cn(
              "bg-transparent w-full h-full rounded-xl border-2 border-amber-900/20 shadow-soft-lg overflow-hidden relative",
              hasBeenPeeked &&
                "ring-2 ring-amber-400/50 ring-offset-2 ring-offset-background",
              isGlowing && "shadow-[0_0_20px_rgba(147,51,234,0.3)]",
            )}
          >
            <img
              src={backAsset}
              alt="Card Back"
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Card Front */}
        <div className="absolute w-full h-full backface-hidden transform-rotate-y-180">
          <div
            className={cn(
              "bg-transparent w-full h-full rounded-xl border-2 shadow-soft-lg overflow-hidden relative",
              card?.isSpecial ? "border-purple-400/30" : "border-amber-900/20",
              isGlowing && "shadow-[0_0_20px_rgba(147,51,234,0.3)]",
            )}
          >
            {card ? (
              <>
                {/* Card Image */}
                <img
                  src={frontAsset}
                  alt={`Card ${card.isSpecial ? card.specialAction : card.value}`}
                  className="w-full h-full object-cover"
                />

                {/* Single minimal overlay badge - top left */}
                <div className="absolute top-2 left-2 z-10">
                  <div
                    className={cn(
                      "flex items-center gap-2 px-2 py-1 rounded-lg backdrop-blur-sm shadow-md",
                      card.isSpecial
                        ? "bg-purple-600/70 text-white"
                        : "bg-white/0 text-amber-900/70",
                    )}
                  >
                    {card.isSpecial && (
                      <SpecialIcon action={card.specialAction} />
                    )}
                    <span className="text-sm md:text-base font-bold font-heading">
                      {card.value}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <img
                src={backAsset}
                alt="Card Back"
                className="w-full h-full object-cover"
              />
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

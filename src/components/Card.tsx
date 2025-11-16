import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Card as CardType } from "@/types";
import { cn } from "@/lib/utils";
import { getCardAsset, getCardBackAsset } from "@/lib/cardAssets";
import { SoundType } from "@/hooks/use-sounds";

interface CardProps {
  card: CardType | null;
  isFaceUp: boolean;
  onClick?: () => void;
  className?: string;
  hasBeenPeeked?: boolean; // show a tiny, persistent glow to indicate "I have seen this"
  isGlowing?: boolean; // external glow hint (e.g., legal to click)
  playSound?: (sound: SoundType) => void;
}

export const GameCard: React.FC<CardProps> = ({
  card,
  isFaceUp,
  onClick,
  className,
  hasBeenPeeked,
  isGlowing,
  playSound,
}) => {
  // Detect "reveal moment" to flash special glow only when a special card turns face-up
  const prevFaceUp = useRef<boolean>(isFaceUp);
  const [justRevealed, setJustRevealed] = useState(false);

  useEffect(() => {
    if (!prevFaceUp.current && isFaceUp) {
      // flipped from face-down to face-up
      setJustRevealed(true);
      const t = setTimeout(() => setJustRevealed(false), 900);
      return () => clearTimeout(t);
    }
    prevFaceUp.current = isFaceUp;
  }, [isFaceUp]);

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
  const actionLabel = card?.isSpecial
    ? card.specialAction === "peek_1"
      ? "Peek 1"
      : card.specialAction === "take_2"
        ? "Take 2"
        : "Swap 2"
    : null;

  // Compose subtle glow styles:
  // - hasBeenPeeked: tiny, persistent glow indicating "I've seen this card"
  // - justRevealed + special: brief stronger glow only at reveal moment
  // - isGlowing: optional external hint (e.g., legal action)
  const peekGlow = hasBeenPeeked
    ? "shadow-[0_0_10px_rgba(168,85,247,0.22)]"
    : "";
  const specialRevealGlow =
    isFaceUp && justRevealed && card?.isSpecial
      ? "shadow-[0_0_28px_rgba(168,85,247,0.55)]"
      : "";
  const externalGlow = isGlowing
    ? "shadow-[0_0_18px_rgba(147,51,234,0.32)]"
    : "";

  // No rings at all. Rounded, image edge-to-edge. Soft depth shadow only.
  const outerClasses = cn(
    "group w-[18vw] max-w-24 sm:w-[15vw] sm:max-w-28 md:w-[10vw] md:max-w-32 lg:w-[8vw] lg:max-w-36 aspect-[2/3] perspective-1000 rounded-xl overflow-hidden",
    (isGlowing || justRevealed) && isFaceUp ? "shadow-soft" : "",
    peekGlow,
    specialRevealGlow,
    externalGlow,
    className,
  );

  return (
    <motion.div className={outerClasses} onClick={handleClick}>
      <motion.div
        className="relative w-full h-full transform-style-3d"
        variants={cardVariants}
        animate={isFaceUp ? "faceUp" : "faceDown"}
        transition={{ type: "spring", stiffness: 380, damping: 30 }}
      >
        {/* Card Back */}
        <div className="absolute w-full h-full backface-hidden">
          <div className="bg-transparent w-full h-full rounded-xl overflow-hidden relative">
            <img
              src={backAsset}
              alt="Card Back"
              className="w-full h-full object-cover"
              draggable={false}
            />
          </div>
        </div>

        {/* Card Front */}
        <div className="absolute w-full h-full backface-hidden transform-rotate-y-180">
          <div className="bg-transparent w-full h-full rounded-xl overflow-hidden relative">
            {card ? (
              <>
                {/* Full image */}
                <img
                  src={frontAsset}
                  alt={`Card ${card.isSpecial ? card.specialAction : card.value}`}
                  className="w-full h-full object-cover"
                  draggable={false}
                />

                {/* Minimalistic number label (top-right), only when revealed */}
                {isFaceUp && (
                  <div className="absolute top-2 right-2 sm:top-3 sm:right-3 md:top-3 md:right-3 z-10">
                    <span
                      className={cn(
                        "inline-block text-xs sm:text-sm font-bold font-heading",
                        card?.isSpecial ? "text-purple-200" : "text-white",
                      )}
                    >
                      {card.value}
                    </span>
                  </div>
                )}

                {/* Full-size hover overlay for revealed cards (does not scale or animate the card) */}
                {isFaceUp && (
                  <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                    <div className="absolute inset-0 bg-black/15 backdrop-blur-[1px]" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-white text-base sm:text-lg md:text-xl font-heading font-bold text-center px-3 drop-shadow">
                        <div>{card.value}</div>
                        {actionLabel && (
                          <div className="mt-1 text-xs sm:text-sm font-medium opacity-90">
                            {actionLabel}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="absolute inset-0 ring-0 md:ring-1 ring-white/30 rounded-xl" />
                  </div>
                )}
              </>
            ) : (
              <img
                src={backAsset}
                alt="Card Back"
                className="w-full h-full object-cover"
                draggable={false}
              />
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

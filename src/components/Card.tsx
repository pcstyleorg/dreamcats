import React, { useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { Card as CardType } from "@/types";
import { cn } from "@/lib/utils";
import { getCardAsset, getCardBackAsset } from "@/lib/cardAssets";
import { SoundType } from "@/hooks/use-sounds";

interface CardProps {
  card: CardType | null;
  isFaceUp: boolean;
  onClick?: () => void;
  className?: string;
  hasBeenPeeked?: boolean;
  isGlowing?: boolean;
  playSound?: (sound: SoundType) => void;
  disableSpecialAnimation?: boolean;
  /** Render without 3D flip (useful for static piles / Safari glitches) */
  staticMode?: boolean;
}

export const GameCard: React.FC<CardProps> = ({
  card,
  isFaceUp,
  onClick,
  className,
  hasBeenPeeked,
  isGlowing,
  playSound,
  disableSpecialAnimation,
  staticMode,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardInnerRef = useRef<HTMLDivElement>(null);
  const [justRevealed, setJustRevealed] = useState(false);
  
  // Detect reveal for special flash
  useGSAP(() => {
    if (isFaceUp) {
      setJustRevealed(true);
      const t = setTimeout(() => setJustRevealed(false), 900);
      return () => clearTimeout(t);
    }
  }, [isFaceUp]);

  const { contextSafe } = useGSAP({ scope: containerRef });

  const handleClick = contextSafe(() => {
    if (onClick) {
      if (playSound) playSound("flip");
      onClick();
    }
  });

  // Handle Flip Animation
  useGSAP(() => {
    if (!cardInnerRef.current) return;
    
    gsap.to(cardInnerRef.current, {
      rotateY: isFaceUp ? 180 : 0,
      duration: 0.6,
      ease: "back.out(1.2)",
    });
  }, [isFaceUp]);

  // Handle Special Glow Animation
  useGSAP(() => {
    if (!containerRef.current) return;
    
    // Kill any existing animations on the container first
    gsap.killTweensOf(containerRef.current);
    
    const isSpecialFaceUp = Boolean(card?.isSpecial && isFaceUp && !disableSpecialAnimation);

    if (isSpecialFaceUp) {
      gsap.to(containerRef.current, {
        filter: "drop-shadow(0 0 12px rgba(168,85,247,0.28))",
        duration: 0.9,
        repeat: -1,
        yoyo: true,
        ease: "power1.inOut"
      });
    } else {
      gsap.set(containerRef.current, {
        filter: "drop-shadow(0 0 0 rgba(0,0,0,0))"
      });
    }
    
    // Cleanup on unmount or dependency change
    return () => {
      if (containerRef.current) {
        gsap.killTweensOf(containerRef.current);
      }
    };
  }, [card?.isSpecial, isFaceUp, disableSpecialAnimation]);

  const frontAsset = getCardAsset(card);
  const backAsset = getCardBackAsset();
  const actionLabel = card?.isSpecial
    ? card.specialAction === "peek_1"
      ? "Peek 1"
      : card.specialAction === "take_2"
        ? "Take 2"
        : "Swap 2"
    : null;

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

  const outerClasses = cn(
    "group w-[18vw] max-w-24 sm:w-[15vw] sm:max-w-28 md:w-[10vw] md:max-w-32 lg:w-[8vw] lg:max-w-36 perspective-1000 rounded-xl overflow-hidden",
    "shadow-[0_12px_28px_rgba(0,0,0,0.45)] border-2 border-white/20",
    isFaceUp ? "ring-1 ring-white/5" : "ring-1 ring-black/20",
    (isGlowing || justRevealed) && isFaceUp ? "shadow-soft" : "",
    peekGlow,
    specialRevealGlow,
    externalGlow,
    className,
  );

  // Fallback static rendering (no 3D / GSAP) to avoid GPU/backface glitches in production
  if (staticMode) {
    const staticSrc = isFaceUp && card ? frontAsset : backAsset;
    return (
      <div
        ref={containerRef}
        className={outerClasses}
        style={{ aspectRatio: "836/1214" }}
        onClick={onClick}
      >
        <div className="relative w-full h-full rounded-xl overflow-hidden bg-transparent">
          <img
            src={staticSrc}
            alt={card ? (card.isSpecial ? card.specialAction ?? "Card" : `Card ${card.value}`) : "Card Back"}
            className="w-full h-full object-cover"
            draggable={false}
          />
          {isFaceUp && (
            <div className="absolute top-2 right-2 sm:top-3 sm:right-3 z-10">
              <span
                className={cn(
                  "inline-block text-xs sm:text-sm font-bold font-heading",
                  card?.isSpecial ? "text-purple-200" : "text-white",
                )}
              >
                {card?.value}
              </span>
            </div>
          )}
          <div className="pointer-events-none absolute inset-0 rounded-xl bg-[radial-gradient(ellipse_at_center,transparent_0%,transparent_50%,rgba(0,0,0,0.25)_100%)]" />
          <div className="pointer-events-none absolute inset-0 rounded-xl mix-blend-soft-light bg-[radial-gradient(ellipse_at_50%_18%,rgba(255,255,255,0.08),transparent_42%),radial-gradient(ellipse_at_50%_62%,rgba(6,7,20,0.6),transparent_65%)]" />
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={outerClasses}
      style={{ aspectRatio: "836/1214" }}
      onClick={handleClick}
    >
      <div
        ref={cardInnerRef}
        className="relative w-full h-full transform-style-3d will-change-transform"
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
            {/* Vignette effect for depth */}
            <div className="pointer-events-none absolute inset-0 rounded-xl bg-[radial-gradient(ellipse_at_center,transparent_0%,transparent_50%,rgba(0,0,0,0.25)_100%)]" />
            <div className="pointer-events-none absolute inset-0 rounded-xl mix-blend-soft-light bg-[radial-gradient(ellipse_at_50%_18%,rgba(255,255,255,0.08),transparent_42%),radial-gradient(ellipse_at_50%_62%,rgba(6,7,20,0.6),transparent_65%)]" />
          </div>
        </div>

        {/* Card Front */}
        <div className="absolute w-full h-full backface-hidden transform-rotate-y-180">
          <div className="bg-transparent w-full h-full rounded-xl overflow-hidden relative">
            {card ? (
              <>
                <img
                  src={frontAsset}
                  alt={`Card ${card.isSpecial ? card.specialAction : card.value}`}
                  className="w-full h-full object-cover"
                  draggable={false}
                />

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
                {/* Vignette effect for depth */}
                <div className="pointer-events-none absolute inset-0 rounded-xl bg-[radial-gradient(ellipse_at_center,transparent_0%,transparent_50%,rgba(0,0,0,0.25)_100%)]" />
                <div className="pointer-events-none absolute inset-0 rounded-xl mix-blend-soft-light bg-[radial-gradient(ellipse_at_50%_18%,rgba(255,255,255,0.08),transparent_42%),radial-gradient(ellipse_at_50%_62%,rgba(6,7,20,0.6),transparent_65%)]" />
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
      </div>
    </div>
  );
};

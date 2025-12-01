import React, { useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { Card as CardType } from "@/types";
import { cn } from "@/lib/utils";
import { getCardAsset, getCardBackAsset } from "@/lib/cardAssets";
import { SoundType } from "@/hooks/use-sounds";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const cardInnerRef = useRef<HTMLDivElement>(null);
  const [justRevealed, setJustRevealed] = useState(false);

  // Feature detection for CSS 3D transforms to prevent rendering issues
  const [supports3D, setSupports3D] = useState(true);

  React.useEffect(() => {
    // Check if CSS 3D transforms are supported
    if (typeof window !== 'undefined' && 'CSS' in window && 'supports' in window.CSS) {
      const has3DSupport = CSS.supports('transform', 'rotateY(1deg)') &&
                           CSS.supports('transform-style', 'preserve-3d');
      setSupports3D(has3DSupport);
    }
  }, []);

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
      ? t("cardInfo.actionPeek1")
      : card.specialAction === "take_2"
        ? t("cardInfo.actionTake2")
        : t("cardInfo.actionSwap2")
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
    "group w-[clamp(56px,8vh,100px)] sm:w-[clamp(60px,9vh,110px)] md:w-[clamp(64px,10vh,120px)] lg:w-[clamp(70px,11vh,130px)] max-w-[140px] perspective-1000 rounded-xl overflow-hidden",
    "shadow-[0_6px_16px_rgba(0,0,0,0.12)] dark:shadow-[0_12px_28px_rgba(0,0,0,0.45)] border-2 border-black/10 dark:border-white/20",
    isFaceUp ? "ring-0 dark:ring-1 dark:ring-white/5" : "ring-0 dark:ring-1 dark:ring-black/20",
    (isGlowing || justRevealed) && isFaceUp ? "shadow-soft" : "",
    peekGlow,
    specialRevealGlow,
    externalGlow,
    className,
  );

  // Use static mode if explicitly requested OR if 3D transforms aren't supported
  const useStaticMode = staticMode || !supports3D;

  // Fallback static rendering (no 3D / GSAP) to avoid GPU/backface glitches in production
  if (useStaticMode) {
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
          {isFaceUp && card && (
            <div className="absolute top-0 left-0 z-10">
              <span
                className={cn(
                  "inline-flex items-center justify-center w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-4 md:h-4 rounded-full",
                  "bg-linear-to-br from-violet-500/50 via-purple-500/40 to-fuchsia-500/30",
                  "text-[10px] sm:text-xs md:text-xs font-bold font-heading text-white",
                  "shadow-[0_0_6px_rgba(139,92,246,0.4),0_0_10px_rgba(168,85,247,0.25)]",
                  card?.isSpecial && "from-fuchsia-500/55 via-purple-500/45 to-violet-500/35 shadow-[0_0_8px_rgba(236,72,153,0.5),0_0_14px_rgba(168,85,247,0.3)]",
                )}
              >
                {card?.value}
              </span>
            </div>
          )}
          {/* Light mode: bright vignette to counteract dark baked-in image vignette */}
          <div className="pointer-events-none absolute inset-0 rounded-xl bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.15)_0%,rgba(255,255,255,0.08)_40%,transparent_70%)] dark:bg-transparent" />
          {/* Dark mode: subtle vignette */}
          <div className="pointer-events-none absolute inset-0 rounded-xl bg-transparent dark:bg-[radial-gradient(ellipse_at_center,transparent_0%,transparent_50%,rgba(0,0,0,0.2)_100%)]" />
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
            {/* Light mode: bright vignette to counteract dark baked-in image vignette */}
            <div className="pointer-events-none absolute inset-0 rounded-xl bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.15)_0%,rgba(255,255,255,0.08)_40%,transparent_70%)] dark:bg-transparent" />
            {/* Dark mode: subtle vignette */}
            <div className="pointer-events-none absolute inset-0 rounded-xl bg-transparent dark:bg-[radial-gradient(ellipse_at_center,transparent_0%,transparent_50%,rgba(0,0,0,0.2)_100%)]" />
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
                  <div className="absolute top-0 left-0 z-10">
                    <span
                      className={cn(
                        "inline-flex items-center justify-center w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-4 md:h-4 rounded-full",
                        "bg-linear-to-br from-violet-500/50 via-purple-500/40 to-fuchsia-500/30",
                        "text-[10px] sm:text-xs md:text-xs font-bold font-heading text-white",
                        "shadow-[0_0_6px_rgba(139,92,246,0.4),0_0_10px_rgba(168,85,247,0.25)]",
                        card?.isSpecial && "from-fuchsia-500/55 via-purple-500/45 to-violet-500/35 shadow-[0_0_8px_rgba(236,72,153,0.5),0_0_14px_rgba(168,85,247,0.3)]",
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
                      <div className="text-white text-base sm:text-lg md:text-xl font-heading font-bold text-center px-3 drop-shadow-sm">
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

                {/* Light mode: bright vignette to counteract dark baked-in image vignette */}
                <div className="pointer-events-none absolute inset-0 rounded-xl bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.15)_0%,rgba(255,255,255,0.08)_40%,transparent_70%)] dark:bg-transparent" />
                {/* Dark mode: subtle vignette */}
                <div className="pointer-events-none absolute inset-0 rounded-xl bg-transparent dark:bg-[radial-gradient(ellipse_at_center,transparent_0%,transparent_50%,rgba(0,0,0,0.2)_100%)]" />
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

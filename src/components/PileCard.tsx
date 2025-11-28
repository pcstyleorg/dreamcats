import React from "react";
import { cn } from "@/lib/utils";
import { Card } from "@/types";
import { getCardAsset, getCardBackAsset } from "@/lib/cardAssets";

interface PileCardProps {
  card: Card | null;
  faceUp?: boolean;
  onClick?: () => void;
  className?: string;
  isGlowing?: boolean;
  /** Optional label rendered in the top-right corner */
  valueBadge?: React.ReactNode;
}

/**
 * A minimal, non-3D card for piles (draw / discard).
 * Avoids backface / perspective issues that can hide images on some browsers.
 */
export const PileCard: React.FC<PileCardProps> = ({
  card,
  faceUp = false,
  onClick,
  className,
  isGlowing,
  valueBadge,
}) => {
  const src = faceUp && card ? getCardAsset(card) : getCardBackAsset();

  return (
    <div
      className={cn(
        "relative rounded-xl overflow-hidden border-2 border-white/15 bg-black/30 shadow-[0_12px_28px_rgba(0,0,0,0.45)]",
        isGlowing && "ring-2 ring-primary/60 shadow-[0_0_30px_hsl(var(--primary)/0.35)]",
        className,
      )}
      style={{ aspectRatio: "836 / 1214" }}
      onClick={onClick}
    >
      <img
        src={src}
        alt={faceUp && card ? `Card ${card.value}` : "Card back"}
        className="w-full h-full object-cover select-none"
        draggable={false}
        loading="eager"
      />
      {valueBadge && (
        <div className="absolute top-2 right-2 z-10">{valueBadge}</div>
      )}
      <div className="pointer-events-none absolute inset-0 rounded-xl bg-[radial-gradient(ellipse_at_center,transparent_0%,transparent_50%,rgba(0,0,0,0.25)_100%)]" />
      <div className="pointer-events-none absolute inset-0 rounded-xl mix-blend-soft-light bg-[radial-gradient(ellipse_at_50%_18%,rgba(255,255,255,0.08),transparent_42%),radial-gradient(ellipse_at_50%_62%,rgba(6,7,20,0.6),transparent_65%)]" />
    </div>
  );
};

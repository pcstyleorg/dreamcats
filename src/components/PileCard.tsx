import React from "react";
import { cn } from "@/lib/utils";
import { Card } from "@/types";
import { getCardAsset, getCardBackAsset } from "@/lib/cardAssets";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();
  const src = faceUp && card ? getCardAsset(card) : getCardBackAsset();
  const actionLabel = card?.isSpecial
    ? card.specialAction === "peek_1"
      ? t("cardInfo.actionPeek1")
      : card.specialAction === "take_2"
        ? t("cardInfo.actionTake2")
        : t("cardInfo.actionSwap2")
    : null;

  return (
    <div
      className={cn(
        "group relative rounded-xl overflow-hidden border-2 border-white/15 bg-black/30 shadow-[0_12px_28px_rgba(0,0,0,0.45)]",
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
      {faceUp && card && (
        <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          <div className="absolute inset-0 bg-black/15 backdrop-blur-[1px]" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-white text-lg sm:text-xl font-heading font-bold text-center px-3 drop-shadow">
              <div>{card.value}</div>
              {actionLabel && (
                <div className="mt-1 text-sm font-medium opacity-90">
                  {actionLabel}
                </div>
              )}
            </div>
          </div>
          <div className="absolute inset-0 ring-0 md:ring-1 ring-white/30 rounded-xl" />
        </div>
      )}
      {!faceUp && valueBadge && (
        <div className="absolute top-2 right-2 z-10 opacity-90">
          {valueBadge}
        </div>
      )}
      <div className="pointer-events-none absolute inset-0 rounded-xl bg-[radial-gradient(ellipse_at_center,transparent_0%,transparent_50%,rgba(0,0,0,0.25)_100%)]" />
      <div className="pointer-events-none absolute inset-0 rounded-xl mix-blend-soft-light bg-[radial-gradient(ellipse_at_50%_18%,rgba(255,255,255,0.08),transparent_42%),radial-gradient(ellipse_at_50%_62%,rgba(6,7,20,0.6),transparent_65%)]" />
    </div>
  );
};

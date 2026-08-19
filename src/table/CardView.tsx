import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Card } from "../../convex/engine";
import { backAsset, hourglassAsset, numberAsset, specialAsset } from "./assets";

const SPECIAL_LABELS = {
  choose_1: "Choose 1",
  take_2: "Take 2",
  peek_1: "Peek 1",
  swap_2: "Swap 2",
} as const;

/** Corner value badge shared by every face. */
const ValueBadge: React.FC<{ children: React.ReactNode; corner: "tl" | "br" }> = ({
  children,
  corner,
}) => (
  <span
    className={cn(
      "absolute min-w-[1.6em] rounded-md bg-slate-950/70 px-[0.28em] py-[0.05em] text-center text-[0.85em] font-bold leading-snug text-amber-50 shadow-sm shadow-black/40 ring-1 ring-white/25",
      corner === "tl" ? "left-[6%] top-[3%]" : "bottom-[3%] right-[6%]",
    )}
  >
    {children}
  </span>
);

/** Small ribbon naming a special/hourglass card. */
const NameRibbon: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="absolute inset-x-[8%] bottom-[8%] rounded-full bg-slate-950/65 py-[0.18em] text-center text-[0.5em] font-semibold uppercase tracking-[0.18em] text-amber-50/95 ring-1 ring-white/20 backdrop-blur-[2px]">
    {children}
  </span>
);

const Face: React.FC<{ card: Card }> = ({ card }) => {
  if (card.kind === "number") {
    return (
      <>
        <img
          src={numberAsset(card.value)}
          alt={`${card.value} cats`}
          draggable={false}
          className="h-full w-full object-cover"
        />
        <ValueBadge corner="tl">{card.value}</ValueBadge>
        <ValueBadge corner="br">{card.value}</ValueBadge>
      </>
    );
  }
  if (card.kind === "hourglass") {
    return (
      <>
        <img
          src={hourglassAsset}
          alt="Hourglass — odd 9, even 0"
          draggable={false}
          className="h-full w-full object-cover"
        />
        <ValueBadge corner="tl">
          9<span className="text-amber-50/50">/0</span>
        </ValueBadge>
        <NameRibbon>Hourglass</NameRibbon>
      </>
    );
  }
  const special = card.special!;
  return (
    <>
      <img
        src={specialAsset(special)}
        alt={SPECIAL_LABELS[special]}
        draggable={false}
        className="h-full w-full object-cover"
      />
      <ValueBadge corner="tl">{card.value}</ValueBadge>
      <NameRibbon>{SPECIAL_LABELS[special]}</NameRibbon>
    </>
  );
};

export interface CardViewProps {
  card: Card;
  faceUp: boolean;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
  /** Enables hover/tap affordances and pointer cursor. */
  interactive?: boolean;
  /** Pulsing ring: a legal target right now. */
  highlight?: boolean;
  /** Solid ring: currently selected (e.g. first swap_2 pick). */
  selected?: boolean;
  /** Small dot: the human has seen this card. */
  seen?: boolean;
  /** Seconds to delay the face-up flip — used for the POBUDKA reveal wave. */
  flipDelay?: number;
  /** Accessible name; slots pass "your card 1" etc. */
  label?: string;
}

/**
 * One physical card. `layoutId` is keyed by the card's deck id, so the same
 * card animates between the deck, hands, piles, and overlays wherever it
 * renders next — the UNO-style "card flight".
 */
export const CardView: React.FC<CardViewProps> = ({
  card,
  faceUp,
  className,
  style,
  onClick,
  interactive = false,
  highlight = false,
  selected = false,
  seen = false,
  flipDelay = 0,
  label,
}) => (
  <motion.div
    layoutId={`card-${card.id}`}
    layout
    data-card-id={card.id}
    role={interactive ? "button" : undefined}
    aria-label={label}
    tabIndex={interactive ? 0 : undefined}
    style={style}
    onClick={interactive ? onClick : undefined}
    onKeyDown={
      interactive
        ? (e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onClick?.();
            }
          }
        : undefined
    }
    whileHover={interactive ? { y: -6 } : undefined}
    whileTap={interactive ? { scale: 0.94 } : undefined}
    transition={{ type: "spring", stiffness: 400, damping: 32 }}
    className={cn(
      "relative aspect-[5/7] select-none rounded-lg text-base [perspective:600px]",
      interactive &&
        "cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300",
      className,
    )}
  >
    <motion.div
      className="absolute inset-0 rounded-[inherit] shadow-lg shadow-indigo-950/60 [transform-style:preserve-3d]"
      animate={{ rotateY: faceUp ? 0 : 180 }}
      initial={false}
      transition={{ duration: 0.5, ease: [0.35, 0, 0.25, 1], delay: flipDelay }}
    >
      <div className="absolute inset-0 overflow-hidden rounded-[inherit] ring-1 ring-white/15 [backface-visibility:hidden]">
        <Face card={card} />
      </div>
      <div className="absolute inset-0 overflow-hidden rounded-[inherit] ring-1 ring-white/15 [backface-visibility:hidden] [transform:rotateY(180deg)]">
        <img
          src={backAsset}
          alt="card back"
          draggable={false}
          className="h-full w-full object-cover"
        />
      </div>
    </motion.div>
    {highlight && (
      <motion.div
        className="pointer-events-none absolute -inset-1 rounded-xl ring-2 ring-amber-300/90"
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 1.4, repeat: Infinity }}
      />
    )}
    {selected && (
      <div className="pointer-events-none absolute -inset-1 rounded-xl ring-2 ring-rose-300" />
    )}
    {seen && (
      <div className="pointer-events-none absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-amber-200/90 shadow shadow-amber-200/50" />
    )}
  </motion.div>
);

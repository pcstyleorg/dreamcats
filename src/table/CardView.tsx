import React from "react";
import { motion } from "framer-motion";
import { ArrowLeftRight, CopyPlus, Eye, Hourglass, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "../../convex/engine";
import { backAsset, numberAsset } from "./assets";

const SPECIAL_META = {
  choose_1: { label: "Choose 1", Icon: Layers, tint: "from-fuchsia-400/25" },
  take_2: { label: "Take 2", Icon: CopyPlus, tint: "from-emerald-400/25" },
  peek_1: { label: "Peek 1", Icon: Eye, tint: "from-sky-400/25" },
  swap_2: { label: "Swap 2", Icon: ArrowLeftRight, tint: "from-amber-400/25" },
} as const;

const DesignedFace: React.FC<{ card: Card }> = ({ card }) => {
  if (card.kind === "hourglass") {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-[6%] rounded-[inherit] border border-indigo-300/30 bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950">
        <span className="absolute left-[7%] top-[4%] text-[0.65em] font-bold text-indigo-200">
          9<span className="text-indigo-200/50">/0</span>
        </span>
        <Hourglass className="h-[34%] w-auto text-indigo-200" strokeWidth={1.5} />
        <span className="text-[0.55em] font-medium uppercase tracking-widest text-indigo-200/80">
          Hourglass
        </span>
        <span className="text-[0.45em] text-indigo-200/50">odd 9 · even 0</span>
      </div>
    );
  }
  const meta = card.special ? SPECIAL_META[card.special] : null;
  if (!meta) return null;
  const { label, Icon, tint } = meta;
  return (
    <div
      className={cn(
        "absolute inset-0 flex flex-col items-center justify-center gap-[8%] rounded-[inherit] border border-white/20 bg-gradient-to-br via-slate-900 to-slate-950",
        tint,
      )}
    >
      <span className="absolute left-[7%] top-[4%] text-[0.65em] font-bold text-white/90">
        {card.value}
      </span>
      <Icon className="h-[30%] w-auto text-white/90" strokeWidth={1.5} />
      <span className="text-[0.55em] font-medium uppercase tracking-widest text-white/80">
        {label}
      </span>
    </div>
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
}) => (
  <motion.div
    layoutId={`card-${card.id}`}
    layout
    data-card-id={card.id}
    style={style}
    onClick={interactive ? onClick : undefined}
    whileHover={interactive ? { y: -6 } : undefined}
    whileTap={interactive ? { scale: 0.94 } : undefined}
    transition={{ type: "spring", stiffness: 400, damping: 32 }}
    className={cn(
      "relative aspect-[5/7] select-none rounded-lg text-base [perspective:600px]",
      interactive && "cursor-pointer",
      className,
    )}
  >
    <motion.div
      className="absolute inset-0 rounded-[inherit] shadow-lg shadow-black/40 [transform-style:preserve-3d]"
      animate={{ rotateY: faceUp ? 0 : 180 }}
      initial={false}
      transition={{ duration: 0.5, ease: [0.35, 0, 0.25, 1], delay: flipDelay }}
    >
      <div className="absolute inset-0 overflow-hidden rounded-[inherit] [backface-visibility:hidden]">
        {card.kind === "number" ? (
          <>
            <img
              src={numberAsset(card.value)}
              alt={`${card.value} cats`}
              draggable={false}
              className="h-full w-full object-cover"
            />
            <span className="absolute left-[6%] top-[3%] min-w-[1.6em] rounded-md bg-slate-950/70 px-[0.28em] py-[0.05em] text-center text-[0.85em] font-bold leading-snug text-white shadow-sm shadow-black/40 ring-1 ring-white/25">
              {card.value}
            </span>
            <span className="absolute bottom-[3%] right-[6%] min-w-[1.6em] rounded-md bg-slate-950/70 px-[0.28em] py-[0.05em] text-center text-[0.85em] font-bold leading-snug text-white shadow-sm shadow-black/40 ring-1 ring-white/25">
              {card.value}
            </span>
          </>
        ) : (
          <DesignedFace card={card} />
        )}
      </div>
      <div className="absolute inset-0 overflow-hidden rounded-[inherit] [backface-visibility:hidden] [transform:rotateY(180deg)]">
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
      <div className="pointer-events-none absolute -inset-1 rounded-xl ring-2 ring-fuchsia-400" />
    )}
    {seen && (
      <div className="pointer-events-none absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-sky-300/90 shadow shadow-sky-300/50" />
    )}
  </motion.div>
);

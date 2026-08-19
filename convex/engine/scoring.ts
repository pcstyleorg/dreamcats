/**
 * Scoring for the new edition (see RULES.md §6-7).
 */

import { Card, DreamSlot, RoundResult } from "./types";

/**
 * Cats in a dream. Hourglasses score by parity: with an odd count each is
 * worth 9, with an even count each is worth 0. Everything else scores its
 * printed value (specials included).
 */
export const dreamScore = (dream: (DreamSlot | { card: Card })[]): number => {
  const cards = dream.map((s) => s.card);
  const hourglasses = cards.filter((c) => c.kind === "hourglass").length;
  const hourglassValue = hourglasses % 2 === 1 ? 9 : 0;
  return cards.reduce(
    (sum, c) => sum + (c.kind === "hourglass" ? hourglassValue : c.value),
    0,
  );
};

/**
 * Round scoring:
 * - everyone adds their raw score, including the lowest (round winner);
 * - a caller who is not among the lowest additionally adds the wrong-call
 *   penalty (no penalty on a tie for lowest, because then they ARE among
 *   the lowest).
 */
export const scoreRound = (
  raws: number[],
  callerIndex: number | null,
  wrongCallPenalty: number,
): RoundResult[] => {
  const min = Math.min(...raws);
  return raws.map((raw, i) => {
    const wasLowest = raw === min;
    const isWrongCaller = callerIndex === i && !wasLowest;
    const penalty = isWrongCaller ? wrongCallPenalty : 0;
    return {
      raw,
      added: raw + penalty,
      wasLowest,
      penalty,
    };
  });
};

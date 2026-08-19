/**
 * Deck construction and deterministic shuffling for the new edition (56 cards).
 */

import { Card, SpecialKind } from "./types";

/**
 * Builds the 56-card new-edition deck:
 * - values 0-7, 4 copies each (32)
 * - value 9, 6 copies
 * - hourglass, 5 copies (printed value 9; parity-scored)
 * - specials: choose_1 x4 (v6), take_2 x3 (v5), peek_1 x3 (v3), swap_2 x3 (v7)
 */
export const buildDeck = (): Card[] => {
  const cards: Card[] = [];
  let id = 0;

  for (let value = 0; value <= 7; value++) {
    for (let i = 0; i < 4; i++) cards.push({ id: id++, kind: "number", value });
  }
  for (let i = 0; i < 6; i++) cards.push({ id: id++, kind: "number", value: 9 });
  for (let i = 0; i < 5; i++) cards.push({ id: id++, kind: "hourglass", value: 9 });

  const specials: [SpecialKind, number, number][] = [
    ["choose_1", 6, 4],
    ["take_2", 5, 3],
    ["peek_1", 3, 3],
    ["swap_2", 7, 3],
  ];
  for (const [special, value, count] of specials) {
    for (let i = 0; i < count; i++) {
      cards.push({ id: id++, kind: "special", value, special });
    }
  }

  return cards;
};

/** Small fast deterministic PRNG (mulberry32). */
export const mulberry32 = (seed: number): (() => number) => {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** Fisher-Yates shuffle with a seeded RNG. Returns a new array. */
export const shuffle = <T>(items: T[], seed: number): T[] => {
  const rng = mulberry32(seed);
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

/** Derives the next seed so successive shuffles differ deterministically. */
export const nextSeed = (seed: number): number =>
  Math.floor(mulberry32(seed ^ 0x9e3779b9)() * 0xffffffff);

/**
 * Core game logic shared between server mutations and client reducer.
 *
 * This is the single source of truth for deck building, shuffling,
 * and other game mechanics. Changes here affect both online and hotseat modes.
 */

import { Card } from "./types";

/**
 * Creates a standard 54-card deck per RULES.md §2:
 * - Values 0-8: 4 copies each (36 cards)
 * - Value 9: 9 copies (9 cards)
 * - Special cards: 3 copies each of take_2, peek_1, swap_2 (9 cards)
 */
export const createDeck = (): Card[] => {
  const cards: Card[] = [];
  let id = 0;

  // Normal cards
  for (let i = 0; i <= 9; i++) {
    const count = i === 9 ? 9 : 4;
    for (let j = 0; j < count; j++) {
      cards.push({ id: id++, value: i, isSpecial: false });
    }
  }

  // Special cards (values 5, 6, 7 per RULES.md)
  const addSpecial = (value: number, specialAction: Card["specialAction"]) => {
    for (let i = 0; i < 3; i++) {
      cards.push({ id: id++, value, isSpecial: true, specialAction });
    }
  };
  addSpecial(5, "take_2");
  addSpecial(6, "peek_1");
  addSpecial(7, "swap_2");

  return cards;
};

/**
 * Fisher-Yates shuffle algorithm for randomizing a deck.
 * Returns a new array (does not mutate input).
 */
export const shuffleDeck = <T>(deck: T[]): T[] => {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

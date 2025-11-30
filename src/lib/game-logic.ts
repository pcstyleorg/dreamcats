import { Card } from "@/types";

export const createDeck = (): Card[] => {
  const cards: Card[] = [];
  let id = 0;

  // Normal cards:
  // - Values 0-8: 4 copies each
  // - Value 9: 9 copies
  for (let i = 0; i <= 9; i++) {
    const count = i === 9 ? 9 : 4;
    for (let j = 0; j < count; j++) {
      cards.push({ id: id++, value: i, isSpecial: false });
    }
  }

  // Special cards (3 copies each)
  // Per RULES.md §2: Special card values are typically 5, 6, 7
  // These values are shown in corner but are only used for scoring if the special card
  // is picked up from discard pile (in which case it's treated as a regular number card).

  // Take 2 (value 5)
  cards.push(
    ...Array(3)
      .fill(0)
      .map(() => ({
        id: id++,
        value: 5,
        isSpecial: true,
        specialAction: "take_2" as const,
      })),
  );
  // Peek 1 (value 6)
  cards.push(
    ...Array(3)
      .fill(0)
      .map(() => ({
        id: id++,
        value: 6,
        isSpecial: true,
        specialAction: "peek_1" as const,
      })),
  );
  // Swap 2 (value 7)
  cards.push(
    ...Array(3)
      .fill(0)
      .map(() => ({
        id: id++,
        value: 7,
        isSpecial: true,
        specialAction: "swap_2" as const,
      })),
  );

  return cards;
};

export const shuffleDeck = (deck: Card[]): Card[] => {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

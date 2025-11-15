import { Card } from "@/types";

export const createDeck = (): Card[] => {
  const cards: Card[] = [];
  let id = 0;

  // 6x '0', 4x '1'-'5', 4x '9'
  for (let i = 0; i <= 9; i++) {
    if ([6, 7, 8].includes(i)) continue; // Skip special card values
    const count = i === 0 ? 6 : 4;
    for (let j = 0; j < count; j++) {
      cards.push({ id: id++, value: i, isSpecial: false });
    }
  }

  // Special cards with correct values from rules
  cards.push(
    ...Array(4)
      .fill(0)
      .map(() => ({
        id: id++,
        value: 6,
        isSpecial: true,
        specialAction: "peek_1" as const,
      })),
  );
  cards.push(
    ...Array(4)
      .fill(0)
      .map(() => ({
        id: id++,
        value: 7,
        isSpecial: true,
        specialAction: "take_2" as const,
      })),
  );
  cards.push(
    ...Array(4)
      .fill(0)
      .map(() => ({
        id: id++,
        value: 8,
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

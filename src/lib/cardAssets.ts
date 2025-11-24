// Import new dreamy assets from assets/new
import card0 from "../../assets/new/0.png";
import card1 from "../../assets/new/1.png";
import card2 from "../../assets/new/2.png";
import card3 from "../../assets/new/3.png";
import card4 from "../../assets/new/4.png";
import card5 from "../../assets/new/5.png";
import card6 from "../../assets/new/6.png";
import card7 from "../../assets/new/7.png";
import card8 from "../../assets/new/8.png";
import card9 from "../../assets/new/9.png";
import cardBack from "../../assets/new/back.png";
import peekCard from "../../assets/new/podejrzyj1.png";
import swapCard from "../../assets/new/zamien2.png";
import takeCard from "../../assets/new/wez2.png";
import { Card } from "@/types";

const normalCardAssets: Record<number, string> = {
  0: card0,
  1: card1,
  2: card2,
  3: card3,
  4: card4,
  5: card5,
  6: card6,
  7: card7,
  8: card8,
  9: card9,
};

const specialCardAssets: Record<string, string> = {
  peek_1: peekCard,
  swap_2: swapCard,
  take_2: takeCard,
};

export const getCardAsset = (card: Card | null | undefined): string => {
  if (!card) return cardBack;

  if (card.isSpecial && card.specialAction) {
    return specialCardAssets[card.specialAction] || cardBack;
  }

  return normalCardAssets[card.value] || cardBack;
};

export const getCardBackAsset = (): string => cardBack;

export const getGameBackgroundAsset = (): string =>
  [
    "radial-gradient(circle at 18% 20%, rgba(255, 196, 213, 0.32), transparent 32%)",
    "radial-gradient(circle at 82% 12%, rgba(255, 236, 200, 0.24), transparent 30%)",
    "radial-gradient(circle at 70% 78%, rgba(98, 180, 255, 0.14), transparent 30%)",
    "linear-gradient(135deg, rgba(9, 14, 32, 0.96), rgba(26, 31, 54, 0.92))",
  ].join(",");

export const cardAssets = {
  normal: normalCardAssets,
  special: specialCardAssets,
  back: cardBack,
  background: getGameBackgroundAsset(),
};

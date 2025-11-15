// Import all card assets from root assets folder
import card0 from "../../assets/0.png";
import card1 from "../../assets/1.png";
import card2 from "../../assets/2.png";
import card3 from "../../assets/3.png";
import card4 from "../../assets/4.png";
import card5 from "../../assets/5.png";
import card6 from "../../assets/6.png";
import card7 from "../../assets/7.png";
import card8 from "../../assets/8.png";
import card9 from "../../assets/9.png";
import cardBack from "../../assets/back.png";
import gameBg from "../../assets/GAME_BG.png";
import peekCard from "../../assets/PEEK1.png";
import swapCard from "../../assets/SWAP2.png";
import takeCard from "../../assets/TAKE2.png";
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

export const getGameBackgroundAsset = (): string => gameBg;

export const cardAssets = {
  normal: normalCardAssets,
  special: specialCardAssets,
  back: cardBack,
  background: gameBg,
};

// Import new dreamy assets from assets root
import { Card } from "@/types";

const normalCardAssets: Record<number, string> = {
  0: "/assets/0.png",
  1: "/assets/1.png",
  2: "/assets/2.png",
  3: "/assets/3.png",
  4: "/assets/4.png",
  5: "/assets/5.png",
  6: "/assets/6.png",
  7: "/assets/7.png",
  8: "/assets/8.png",
  9: "/assets/9.png",
};

const specialCardAssets: Record<string, string> = {
  peek_1: "/assets/podjerzyj1.png",
  swap_2: "/assets/zamien2.png",
  take_2: "/assets/wez2.png",
};

export const getCardAsset = (card: Card | null | undefined): string => {
  if (!card) return "/assets/back.png";

  if (card.isSpecial && card.specialAction) {
    return specialCardAssets[card.specialAction] || "/assets/back.png";
  }

  return normalCardAssets[card.value] || "/assets/back.png";
};

export const getCardBackAsset = (): string => "/assets/back.png";

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
  back: "/assets/back.png",
  background: getGameBackgroundAsset(),
};

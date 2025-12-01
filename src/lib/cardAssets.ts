// Import new dreamy assets from assets root
import { Card } from "@/types";

// Cache busting version - increment this when assets change
const ASSET_VERSION = "v2";

const normalCardAssets: Record<number, string> = {
  0: `/assets/0.png?${ASSET_VERSION}`,
  1: `/assets/1.png?${ASSET_VERSION}`,
  2: `/assets/2.png?${ASSET_VERSION}`,
  3: `/assets/3.png?${ASSET_VERSION}`,
  4: `/assets/4.png?${ASSET_VERSION}`,
  5: `/assets/5.png?${ASSET_VERSION}`,
  6: `/assets/6.png?${ASSET_VERSION}`,
  7: `/assets/7.png?${ASSET_VERSION}`,
  8: `/assets/8.png?${ASSET_VERSION}`,
  9: `/assets/9.png?${ASSET_VERSION}`,
};

const specialCardAssets: Record<string, string> = {
  peek_1: `/assets/podjerzyj1.png?${ASSET_VERSION}`,
  swap_2: `/assets/zamien2.png?${ASSET_VERSION}`,
  take_2: `/assets/wez2.png?${ASSET_VERSION}`,
};

export const getCardAsset = (card: Card | null | undefined): string => {
  if (!card) return `/assets/back.png?${ASSET_VERSION}`;

  if (card.isSpecial && card.specialAction) {
    return specialCardAssets[card.specialAction] || `/assets/back.png?${ASSET_VERSION}`;
  }

  return normalCardAssets[card.value] || `/assets/back.png?${ASSET_VERSION}`;
};

export const getCardBackAsset = (): string => `/assets/back.png?${ASSET_VERSION}`;

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
  back: `/assets/back.png?${ASSET_VERSION}`,
  background: getGameBackgroundAsset(),
};

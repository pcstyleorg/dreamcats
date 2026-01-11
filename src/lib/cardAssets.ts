import { Card } from "@/types";

// cache busting version - increment when assets change
const ASSET_VERSION = "v3";

// webp is supported by 97%+ of browsers, use as primary format
// png fallback for older browsers
let supportsWebP: boolean | null = null;

function checkWebPSupport(): boolean {
  if (supportsWebP !== null) return supportsWebP;

  if (typeof document === "undefined") {
    supportsWebP = true;
    return true;
  }

  const canvas = document.createElement("canvas");
  supportsWebP = canvas.toDataURL("image/webp").startsWith("data:image/webp");
  return supportsWebP;
}

function getAssetPath(name: string): string {
  const ext = checkWebPSupport() ? "webp" : "png";
  return `/assets/${name}.${ext}?${ASSET_VERSION}`;
}

const normalCardValues = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as const;
const specialCardNames = {
  peek_1: "podjerzyj1",
  swap_2: "zamien2",
  take_2: "wez2",
} as const;

export const getCardAsset = (card: Card | null | undefined): string => {
  if (!card) return getAssetPath("back");

  if (card.isSpecial && card.specialAction) {
    const name = specialCardNames[card.specialAction as keyof typeof specialCardNames];
    return name ? getAssetPath(name) : getAssetPath("back");
  }

  if (normalCardValues.includes(card.value as typeof normalCardValues[number])) {
    return getAssetPath(String(card.value));
  }

  return getAssetPath("back");
};

export const getCardBackAsset = (): string => getAssetPath("back");

export const getGameBackgroundAsset = (): string =>
  [
    "radial-gradient(circle at 18% 20%, rgba(255, 196, 213, 0.32), transparent 32%)",
    "radial-gradient(circle at 82% 12%, rgba(255, 236, 200, 0.24), transparent 30%)",
    "radial-gradient(circle at 70% 78%, rgba(98, 180, 255, 0.14), transparent 30%)",
    "linear-gradient(135deg, rgba(9, 14, 32, 0.96), rgba(26, 31, 54, 0.92))",
  ].join(",");

// preload all card images for instant flips
export const preloadCardImages = (): void => {
  if (typeof document === "undefined") return;

  const images = [
    "back",
    ...normalCardValues.map(String),
    ...Object.values(specialCardNames),
  ];

  images.forEach((name) => {
    const img = new Image();
    img.src = getAssetPath(name);
  });
};

// get all card asset paths for preloading
export const getAllCardAssetPaths = (): string[] => {
  const images = [
    "back",
    ...normalCardValues.map(String),
    ...Object.values(specialCardNames),
  ];
  return images.map(getAssetPath);
};

export const cardAssets = {
  back: getAssetPath("back"),
  background: getGameBackgroundAsset(),
};

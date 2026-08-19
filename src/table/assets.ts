/**
 * Card face assets for the new-edition table.
 *
 * Every card face is painted art in /public/assets. The new edition reuses
 * the classic paintings for numbers and specials, plus two freshly painted
 * cards: the hourglass (klepsydra) and choose_1 (wybierz1).
 */

import { SpecialKind } from "../../convex/engine";

const VERSION = "v4";

export const numberAsset = (value: number): string =>
  `/assets/${value}.webp?${VERSION}`;

const SPECIAL_FILES: Record<SpecialKind, string> = {
  choose_1: "wybierz1",
  take_2: "wez2",
  peek_1: "podjerzyj1",
  swap_2: "zamien2",
};

export const specialAsset = (kind: SpecialKind): string =>
  `/assets/${SPECIAL_FILES[kind]}.webp?${VERSION}`;

export const hourglassAsset = `/assets/klepsydra.webp?${VERSION}`;

export const backAsset = `/assets/back.webp?${VERSION}`;

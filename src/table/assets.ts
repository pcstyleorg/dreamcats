/**
 * Card face assets for the new-edition table.
 *
 * Number cards (0-9) reuse the painted art in /public/assets. Specials and
 * hourglasses render designed CSS faces (see CardView) because the new
 * edition changed their corner values and adds cards with no art yet.
 */

const VERSION = "v3";

export const numberAsset = (value: number): string =>
  `/assets/${value}.webp?${VERSION}`;

export const backAsset = `/assets/back.webp?${VERSION}`;

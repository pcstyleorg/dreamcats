/**
 * Server-side visibility redaction for online play.
 *
 * The full EngineState knows every card face. Before a state snapshot leaves
 * the server it must be redacted for the receiving player: hidden faces are
 * replaced by a sentinel so the client literally cannot cheat. Card *ids*
 * stay visible — they are the physical card backs players can track with
 * their eyes in the real game (and they drive the flight animations).
 */

import type { Card, EngineState } from "./types";

/** Face shown for any card the viewer is not allowed to see. */
export const hiddenCard = (id: number): Card => ({
  id,
  kind: "number",
  value: 0,
});

const isRoundOver = (s: EngineState): boolean =>
  s.phase === "roundEnd" || s.phase === "gameOver";

/**
 * Is the dream slot (player, slot) currently face-up for `viewer`?
 * Mirrors the reveal moments the table UI renders:
 * - the viewer's own initial peeks (during peeking / just after round start)
 * - a peek_1 the viewer just performed
 * - everything once the round is over
 */
const dreamSlotVisible = (
  s: EngineState,
  viewer: number,
  player: number,
  slot: number,
): boolean => {
  if (isRoundOver(s)) return true;
  const ownInitialPeek =
    player === viewer &&
    (s.phase === "peeking" || s.lastAction?.type === "roundStarted") &&
    s.players[viewer].peekedSlots.includes(slot);
  if (ownInitialPeek) return true;
  const a = s.lastAction;
  return (
    a?.type === "peeked" &&
    a.player === viewer &&
    a.targetPlayer === player &&
    a.slot === slot
  );
};

/** Redacts a full engine state down to what `viewer` may see. */
export const redactState = (s: EngineState, viewer: number): EngineState => {
  const heldVisible =
    s.held !== null &&
    (s.currentPlayer === viewer ||
      s.heldSource === "discard" ||
      s.heldSource === "choose1");
  const take2Visible = s.currentPlayer === viewer;

  return {
    ...s,
    // The seed would let a client replay the shuffle and read the whole deck.
    seed: 0,
    drawPile: s.drawPile.map((c) => hiddenCard(c.id)),
    discardPile: s.discardPile, // face up by definition
    held: s.held ? (heldVisible ? s.held : hiddenCard(s.held.id)) : null,
    take2Cards: s.take2Cards
      ? take2Visible
        ? s.take2Cards
        : s.take2Cards.map((c) => hiddenCard(c.id))
      : null,
    players: s.players.map((p, pi) => ({
      ...p,
      dream: p.dream.map((slot, si) => ({
        ...slot,
        card: dreamSlotVisible(s, viewer, pi, si)
          ? slot.card
          : hiddenCard(slot.card.id),
      })),
    })),
  };
};

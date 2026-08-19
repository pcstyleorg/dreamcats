/**
 * Viewpoint rotation for online play.
 *
 * The table UI always renders the local human as player 0. Online, the viewer
 * can sit at any index, so the client rotates the (already redacted) state so
 * that `viewer` becomes index 0 — and rotates outgoing events back to server
 * indices. Pure functions, no secrets involved.
 */

import type { EngineState, GameEvent, LastAction } from "./types";

/** Server index → client index (viewer becomes 0). */
const toClient = (index: number, viewer: number, n: number): number =>
  (index - viewer + n) % n;

/** Client index → server index. */
const toServer = (index: number, viewer: number, n: number): number =>
  (index + viewer) % n;

const rotateAction = (
  a: LastAction | null,
  viewer: number,
  n: number,
): LastAction | null => {
  if (!a) return null;
  switch (a.type) {
    case "peeked":
      return {
        ...a,
        player: toClient(a.player, viewer, n),
        targetPlayer: toClient(a.targetPlayer, viewer, n),
      };
    case "drewDeck":
    case "drewDiscard":
    case "swapped":
    case "discarded":
    case "activated":
    case "choose1Picked":
    case "take2Kept":
    case "pobudka":
      return { ...a, player: toClient(a.player, viewer, n) };
    case "swap2Done":
      return {
        ...a,
        player: toClient(a.player, viewer, n),
        a: { ...a.a, player: toClient(a.a.player, viewer, n) },
        b: { ...a.b, player: toClient(a.b.player, viewer, n) },
      };
    default:
      return a;
  }
};

/** Rotates all player indices in `s` so that `viewer` becomes player 0. */
export const rotateStateForViewer = (
  s: EngineState,
  viewer: number,
): EngineState => {
  const n = s.players.length;
  if (viewer === 0) return s;
  return {
    ...s,
    players: Array.from({ length: n }, (_, i) => {
      const p = s.players[toServer(i, viewer, n)];
      return {
        ...p,
        dream: p.dream.map((slot) => ({
          ...slot,
          knownTo: slot.knownTo.map((k) => toClient(k, viewer, n)),
        })),
      };
    }),
    currentPlayer: toClient(s.currentPlayer, viewer, n),
    callerIndex:
      s.callerIndex === null ? null : toClient(s.callerIndex, viewer, n),
    roundEnder:
      s.roundEnder === null ? null : toClient(s.roundEnder, viewer, n),
    winners: s.winners ? s.winners.map((w) => toClient(w, viewer, n)) : null,
    swap2First: s.swap2First
      ? { ...s.swap2First, player: toClient(s.swap2First.player, viewer, n) }
      : null,
    lastAction: rotateAction(s.lastAction, viewer, n),
    roundResults: s.roundResults
      ? Array.from(
          { length: n },
          (_, i) => s.roundResults![toServer(i, viewer, n)],
        )
      : null,
  };
};

/** Rotates player indices in a client event back to server indices. */
export const rotateEventForServer = (
  event: GameEvent,
  viewer: number,
  n: number,
): GameEvent => {
  if (viewer === 0) return event;
  switch (event.type) {
    case "peek":
    case "peek1Target":
    case "swap2Select":
      return { ...event, player: toServer(event.player, viewer, n) };
    default:
      return event;
  }
};

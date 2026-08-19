/**
 * Redaction + viewpoint rotation for online play.
 */

import { describe, expect, it } from "vitest";
import {
  applyEvent,
  createGame,
  redactState,
  rotateEventForServer,
  rotateStateForViewer,
} from "../engine";
import type { EngineState } from "../engine";

const players = [
  { id: "a", name: "Ann" },
  { id: "b", name: "Ben" },
  { id: "c", name: "Cid" },
];

const freshGame = (): EngineState => createGame(players, 42);

/** Advances past the peeking phase (everyone peeks slots 0 and 1). */
const startRound = (s: EngineState): EngineState => {
  for (let p = 0; p < s.players.length; p++) {
    s = applyEvent(s, { type: "peek", player: p, slot: 0 }, p);
    s = applyEvent(s, { type: "peek", player: p, slot: 1 }, p);
  }
  return s;
};

const isHidden = (c: { kind: string; value: number }) =>
  c.kind === "number" && c.value === 0;

describe("redactState", () => {
  it("zeroes the seed and hides all draw pile faces", () => {
    const s = freshGame();
    const r = redactState(s, 0);
    expect(r.seed).toBe(0);
    expect(r.drawPile.every(isHidden)).toBe(true);
    // ids survive for animation
    expect(r.drawPile.map((c) => c.id)).toEqual(s.drawPile.map((c) => c.id));
  });

  it("keeps the discard pile face up", () => {
    const s = freshGame();
    const r = redactState(s, 1);
    expect(r.discardPile).toEqual(s.discardPile);
  });

  it("shows own initial peeks during peeking, hides everyone else's", () => {
    let s = freshGame();
    s = applyEvent(s, { type: "peek", player: 1, slot: 2 }, 1);
    const forPeeker = redactState(s, 1);
    expect(forPeeker.players[1].dream[2].card).toEqual(
      s.players[1].dream[2].card,
    );
    expect(forPeeker.players[1].dream[0].card.value).toBe(0);
    const forRival = redactState(s, 0);
    expect(isHidden(forRival.players[1].dream[2].card)).toBe(true);
  });

  it("hides a deck-drawn held card from everyone but the holder", () => {
    let s = startRound(freshGame());
    s = applyEvent(s, { type: "drawDeck" }, s.currentPlayer);
    const holder = s.currentPlayer;
    const other = (holder + 1) % 3;
    expect(redactState(s, holder).held).toEqual(s.held);
    expect(isHidden(redactState(s, other).held!)).toBe(true);
  });

  it("shows a discard-drawn held card to everyone", () => {
    let s = startRound(freshGame());
    s = applyEvent(s, { type: "drawDiscard" }, s.currentPlayer);
    const other = (s.currentPlayer + 1) % 3;
    expect(redactState(s, other).held).toEqual(s.held);
  });

  it("reveals everything when the round is over", () => {
    let s = startRound(freshGame());
    s = applyEvent(s, { type: "callPobudka" }, s.currentPlayer);
    // finish the last go-around
    while ((s.phase as string) !== "roundEnd" && (s.phase as string) !== "gameOver") {
      s = applyEvent(s, { type: "drawDeck" }, s.currentPlayer);
      s = applyEvent(s, { type: "discardHeld" }, s.currentPlayer);
    }
    const r = redactState(s, 2);
    for (let p = 0; p < 3; p++) {
      expect(r.players[p].dream.map((d) => d.card)).toEqual(
        s.players[p].dream.map((d) => d.card),
      );
    }
  });
});

describe("rotateStateForViewer", () => {
  it("is identity for viewer 0", () => {
    const s = freshGame();
    expect(rotateStateForViewer(s, 0)).toBe(s);
  });

  it("puts the viewer at index 0 and remaps every player index", () => {
    let s = startRound(freshGame());
    s = applyEvent(s, { type: "drawDeck" }, s.currentPlayer);
    const viewer = 2;
    const r = rotateStateForViewer(s, viewer);
    expect(r.players[0].id).toBe(s.players[viewer].id);
    expect(r.players[1].id).toBe(s.players[(viewer + 1) % 3].id);
    expect(r.currentPlayer).toBe((s.currentPlayer - viewer + 3) % 3);
    // knownTo indices remapped: player 2's own peeks are now "known to 0"
    expect(r.players[0].dream[0].knownTo).toContain(0);
    // lastAction player remapped
    if (s.lastAction?.type === "drewDeck" && r.lastAction?.type === "drewDeck") {
      expect(r.lastAction.player).toBe((s.lastAction.player - viewer + 3) % 3);
    }
  });

  it("rotates events back so a full round-trip is identity", () => {
    const event = { type: "peek1Target", player: 0, slot: 3 } as const;
    const server = rotateEventForServer(event, 2, 3);
    expect(server).toEqual({ type: "peek1Target", player: 2, slot: 3 });
    const identity = rotateEventForServer(
      rotateEventForServer(event, 0, 3),
      0,
      3,
    );
    expect(identity).toEqual(event);
  });
});

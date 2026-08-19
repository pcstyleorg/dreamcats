import { describe, expect, it } from "vitest";
import {
  applyEvent,
  buildDeck,
  createGame,
  dreamScore,
  scoreRound,
  EngineState,
  Card,
  EngineError,
} from "../engine";

const num = (id: number, value: number): Card => ({ id, kind: "number", value });
const hourglass = (id: number): Card => ({ id, kind: "hourglass", value: 9 });
const special = (id: number, kind: Card["special"], value: number): Card => ({
  id,
  kind: "special",
  value,
  special: kind,
});

const slots = (...cards: Card[]) => cards.map((card) => ({ card, knownTo: [] }));

/** Deals a fresh 2-player game and finishes the initial peeks. */
const readyGame = (seed = 42, playerCount = 2): EngineState => {
  let s = createGame(
    Array.from({ length: playerCount }, (_, i) => ({ id: `p${i}`, name: `P${i}` })),
    seed,
  );
  for (let p = 0; p < playerCount; p++) {
    s = applyEvent(s, { type: "peek", player: p, slot: 0 });
    s = applyEvent(s, { type: "peek", player: p, slot: 1 });
  }
  return s;
};

/** Forces a known card into the current player's held slot via deck draw. */
const drawRigged = (state: EngineState, card: Card): EngineState => {
  const s = structuredClone(state);
  s.drawPile = [...s.drawPile, card];
  return applyEvent(s, { type: "drawDeck" });
};

describe("deck composition (new edition, 56 cards)", () => {
  it("builds exactly the printed deck", () => {
    const deck = buildDeck();
    expect(deck).toHaveLength(56);

    const numbers = deck.filter((c) => c.kind === "number");
    for (let v = 0; v <= 7; v++) {
      expect(numbers.filter((c) => c.value === v)).toHaveLength(4);
    }
    expect(numbers.filter((c) => c.value === 9)).toHaveLength(6);
    expect(deck.filter((c) => c.kind === "hourglass")).toHaveLength(5);

    const specials = deck.filter((c) => c.kind === "special");
    expect(specials.filter((c) => c.special === "choose_1")).toHaveLength(4);
    expect(specials.filter((c) => c.special === "take_2")).toHaveLength(3);
    expect(specials.filter((c) => c.special === "peek_1")).toHaveLength(3);
    expect(specials.filter((c) => c.special === "swap_2")).toHaveLength(3);
    expect(specials.find((c) => c.special === "choose_1")?.value).toBe(6);
    expect(specials.find((c) => c.special === "take_2")?.value).toBe(5);
    expect(specials.find((c) => c.special === "peek_1")?.value).toBe(3);
    expect(specials.find((c) => c.special === "swap_2")?.value).toBe(7);

    expect(new Set(deck.map((c) => c.id)).size).toBe(56);
  });
});

describe("hourglass parity scoring", () => {
  it("odd hourglass count: each is worth 9", () => {
    expect(dreamScore(slots(hourglass(0), num(1, 3), num(2, 0), num(3, 2)))).toBe(14);
    expect(
      dreamScore(slots(hourglass(0), hourglass(1), hourglass(2), num(3, 1))),
    ).toBe(28);
  });

  it("even hourglass count: each is worth 0", () => {
    expect(dreamScore(slots(hourglass(0), hourglass(1), num(2, 5), num(3, 2)))).toBe(7);
    expect(
      dreamScore(slots(hourglass(0), hourglass(1), hourglass(2), hourglass(3))),
    ).toBe(0);
  });

  it("specials score their printed value", () => {
    expect(
      dreamScore(
        slots(
          special(0, "choose_1", 6),
          special(1, "take_2", 5),
          special(2, "peek_1", 3),
          special(3, "swap_2", 7),
        ),
      ),
    ).toBe(21);
  });
});

describe("round scoring", () => {
  it("lowest player adds 0; others add their raw score", () => {
    const results = scoreRound([4, 10, 7], null, 5);
    expect(results.map((r) => r.added)).toEqual([0, 10, 7]);
  });

  it("wrong caller adds raw + 5", () => {
    const results = scoreRound([8, 3], 0, 5);
    expect(results[0]).toMatchObject({ added: 13, penalty: 5, wasLowest: false });
    expect(results[1].added).toBe(0);
  });

  it("caller tied for lowest gets no penalty and scores 0", () => {
    const results = scoreRound([3, 3, 9], 0, 5);
    expect(results[0]).toMatchObject({ added: 0, penalty: 0, wasLowest: true });
    expect(results[1].added).toBe(0);
    expect(results[2].added).toBe(9);
  });

  it("supports the 15-point house penalty", () => {
    expect(scoreRound([9, 1], 0, 15)[0].added).toBe(24);
  });
});

describe("setup and initial peeks", () => {
  it("deals 4 cards each, one discard, rest in draw pile", () => {
    const s = createGame(
      [
        { id: "a", name: "A" },
        { id: "b", name: "B" },
        { id: "c", name: "C" },
      ],
      7,
    );
    expect(s.phase).toBe("peeking");
    s.players.forEach((p) => expect(p.dream).toHaveLength(4));
    expect(s.discardPile).toHaveLength(1);
    expect(s.drawPile).toHaveLength(56 - 12 - 1);
  });

  it("rejects 1 and 5 player games", () => {
    expect(() => createGame([{ id: "a", name: "A" }], 1)).toThrow(EngineError);
    expect(() =>
      createGame(
        Array.from({ length: 5 }, (_, i) => ({ id: `${i}`, name: `${i}` })),
        1,
      ),
    ).toThrow(EngineError);
  });

  it("allows exactly 2 peeks per player, then starts the game", () => {
    let s = createGame(
      [
        { id: "a", name: "A" },
        { id: "b", name: "B" },
      ],
      3,
    );
    s = applyEvent(s, { type: "peek", player: 0, slot: 0 });
    s = applyEvent(s, { type: "peek", player: 0, slot: 3 });
    expect(() => applyEvent(s, { type: "peek", player: 0, slot: 1 })).toThrow(
      /Already peeked/,
    );
    expect(s.phase).toBe("peeking");
    s = applyEvent(s, { type: "peek", player: 1, slot: 1 });
    s = applyEvent(s, { type: "peek", player: 1, slot: 2 });
    expect(s.phase).toBe("awaitTurn");
    expect(s.players[0].dream[0].knownTo).toEqual([0]);
    expect(s.players[0].dream[1].knownTo).toEqual([]);
  });
});

describe("turn flow", () => {
  it("discard draw forces a swap (no discardHeld)", () => {
    let s = readyGame();
    const top = s.discardPile[s.discardPile.length - 1];
    s = applyEvent(s, { type: "drawDiscard" });
    expect(s.phase).toBe("holdingDiscard");
    expect(s.held).toEqual(top);
    expect(() => applyEvent(s, { type: "discardHeld" })).toThrow(EngineError);
    const replaced = s.players[0].dream[2].card;
    s = applyEvent(s, { type: "swapHeld", slot: 2 });
    expect(s.players[0].dream[2].card).toEqual(top);
    expect(s.players[0].dream[2].knownTo).toEqual([0]);
    expect(s.discardPile[s.discardPile.length - 1]).toEqual(replaced);
    expect(s.currentPlayer).toBe(1);
    expect(s.phase).toBe("awaitTurn");
  });

  it("deck draw can be swapped or discarded", () => {
    let s = readyGame();
    s = drawRigged(s, num(900, 0));
    expect(s.phase).toBe("holdingDeck");
    let s2 = applyEvent(s, { type: "discardHeld" });
    expect(s2.discardPile[s2.discardPile.length - 1].id).toBe(900);
    expect(s2.currentPlayer).toBe(1);

    s2 = applyEvent(s, { type: "swapHeld", slot: 0 });
    expect(s2.players[0].dream[0].card.id).toBe(900);
  });

  it("cannot activate a non-special card", () => {
    let s = readyGame();
    s = drawRigged(s, num(901, 4));
    expect(() => applyEvent(s, { type: "activateSpecial" })).toThrow(/no special/);
  });

  it("enforces turn order via actor param", () => {
    const s = readyGame();
    expect(() => applyEvent(s, { type: "drawDeck" }, 1)).toThrow(/turn/);
    expect(() => applyEvent(s, { type: "drawDeck" }, 0)).not.toThrow();
  });
});

describe("special: choose_1", () => {
  it("picks any discard card and must swap it into own dream", () => {
    let s = readyGame();
    s.discardPile = [num(800, 1), num(801, 2), num(802, 3)];
    s = drawRigged(s, special(950, "choose_1", 6));
    s = applyEvent(s, { type: "activateSpecial" });
    expect(s.phase).toBe("choose1Pick");
    // the activated special itself is now on top of the discard pile
    expect(s.discardPile.map((c) => c.id)).toEqual([800, 801, 802, 950]);
    s = applyEvent(s, { type: "choose1Pick", discardIndex: 1 });
    expect(s.held?.id).toBe(801);
    expect(s.phase).toBe("choose1Swap");
    expect(() => applyEvent(s, { type: "discardHeld" })).toThrow(EngineError);
    const replaced = s.players[0].dream[0].card;
    s = applyEvent(s, { type: "swapHeld", slot: 0 });
    expect(s.players[0].dream[0].card.id).toBe(801);
    expect(s.discardPile[s.discardPile.length - 1]).toEqual(replaced);
    expect(s.currentPlayer).toBe(1);
  });
});

describe("special: take_2", () => {
  it("draws two, keeps one, discards the other, then acts normally", () => {
    let s = readyGame();
    s.drawPile = [...s.drawPile, num(810, 0), num(811, 9), special(951, "take_2", 5)];
    s = applyEvent(s, { type: "drawDeck" }); // holds take_2
    s = applyEvent(s, { type: "activateSpecial" });
    expect(s.phase).toBe("take2Pick");
    expect(s.take2Cards?.map((c) => c.id)).toEqual([811, 810]);
    s = applyEvent(s, { type: "take2Pick", index: 1 }); // keep the 0
    expect(s.held?.id).toBe(810);
    expect(s.discardPile[s.discardPile.length - 1].id).toBe(811);
    expect(s.phase).toBe("holdingDeck");
    s = applyEvent(s, { type: "swapHeld", slot: 3 });
    expect(s.players[0].dream[3].card.id).toBe(810);
  });

  it("chains: a special kept from take_2 can be activated", () => {
    let s = readyGame();
    s.drawPile = [
      ...s.drawPile,
      special(952, "peek_1", 3),
      num(812, 5),
      special(953, "take_2", 5),
    ];
    s = applyEvent(s, { type: "drawDeck" });
    s = applyEvent(s, { type: "activateSpecial" });
    s = applyEvent(s, { type: "take2Pick", index: 1 }); // keep peek_1
    expect(s.held?.special).toBe("peek_1");
    s = applyEvent(s, { type: "activateSpecial" });
    expect(s.phase).toBe("peek1Target");
  });
});

describe("special: peek_1", () => {
  it("marks any slot as known to the peeker", () => {
    let s = readyGame();
    s = drawRigged(s, special(954, "peek_1", 3));
    s = applyEvent(s, { type: "activateSpecial" });
    s = applyEvent(s, { type: "peek1Target", player: 1, slot: 2 });
    expect(s.players[1].dream[2].knownTo).toContain(0);
    expect(s.currentPlayer).toBe(1);
  });
});

describe("special: swap_2", () => {
  it("swaps two dream cards, knowledge travels with the card", () => {
    let s = readyGame();
    const mine = s.players[0].dream[0].card;
    const theirs = s.players[1].dream[1].card;
    s = drawRigged(s, special(955, "swap_2", 7));
    s = applyEvent(s, { type: "activateSpecial" });
    s = applyEvent(s, { type: "swap2Select", player: 0, slot: 0 });
    expect(s.phase).toBe("swap2Second");
    expect(() =>
      applyEvent(s, { type: "swap2Select", player: 0, slot: 0 }),
    ).toThrow(/different/);
    s = applyEvent(s, { type: "swap2Select", player: 1, slot: 1 });
    expect(s.players[0].dream[0].card).toEqual(theirs);
    expect(s.players[1].dream[1].card).toEqual(mine);
    // player 0 peeked slot 0 during setup; that knowledge follows the card
    expect(s.players[1].dream[1].knownTo).toEqual([0]);
    expect(s.currentPlayer).toBe(1);
  });
});

describe("POBUDKA and round end", () => {
  it("caller with lowest dream scores 0, others add raw", () => {
    let s = readyGame();
    s.players[0].dream = slots(num(700, 0), num(701, 0), num(702, 1), num(703, 0));
    s.players[1].dream = slots(num(704, 9), num(705, 9), num(706, 9), num(707, 9));
    s = applyEvent(s, { type: "callPobudka" });
    expect(s.phase).toBe("roundEnd");
    expect(s.players[0].totalScore).toBe(0);
    expect(s.players[1].totalScore).toBe(36);
    expect(s.roundResults?.[0]).toMatchObject({ raw: 1, added: 0, wasLowest: true });
  });

  it("wrong caller pays the penalty; true lowest still scores 0", () => {
    let s = readyGame();
    s.players[0].dream = slots(num(700, 9), num(701, 9), num(702, 0), num(703, 0));
    s.players[1].dream = slots(num(704, 1), num(705, 0), num(706, 0), num(707, 0));
    s = applyEvent(s, { type: "callPobudka" });
    expect(s.players[0].totalScore).toBe(18 + 5);
    expect(s.players[1].totalScore).toBe(0);
  });

  it("nextRound redeals and passes the start left of the round ender", () => {
    let s = readyGame();
    s = applyEvent(s, { type: "callPobudka" }); // player 0 ends the round
    s = applyEvent(s, { type: "nextRound" });
    expect(s.round).toBe(2);
    expect(s.phase).toBe("peeking");
    expect(s.currentPlayer).toBe(1);
    s.players.forEach((p) => {
      expect(p.dream).toHaveLength(4);
      expect(p.peekedSlots).toEqual([]);
      p.dream.forEach((slot) => expect(slot.knownTo).toEqual([]));
    });
    expect(s.drawPile.length + s.discardPile.length).toBe(56 - 8);
  });

  it("round ends by deck exhaustion after the final action", () => {
    let s = readyGame();
    s.drawPile = [num(920, 2)]; // one card left
    s = applyEvent(s, { type: "drawDeck" });
    s = applyEvent(s, { type: "discardHeld" });
    expect(s.phase).toBe("roundEnd");
    expect(s.lastAction).toEqual({ type: "roundEnded", byDeckExhaustion: true });
  });

  it("game over at 100+, lowest total wins", () => {
    let s = readyGame();
    s.players[0].totalScore = 96;
    s.players[1].totalScore = 40;
    s.players[0].dream = slots(num(700, 9), num(701, 1), num(702, 1), num(703, 1));
    s.players[1].dream = slots(num(704, 0), num(705, 0), num(706, 0), num(707, 0));
    s = applyEvent(s, { type: "callPobudka" });
    expect(s.players[0].totalScore).toBe(96 + 12 + 5);
    expect(s.phase).toBe("gameOver");
    expect(s.winners).toEqual([1]);
  });
});

describe("determinism", () => {
  it("same seed produces the same game", () => {
    const a = createGame([{ id: "a", name: "A" }, { id: "b", name: "B" }], 123);
    const b = createGame([{ id: "a", name: "A" }, { id: "b", name: "B" }], 123);
    expect(a).toEqual(b);
  });

  it("reducer never mutates its input", () => {
    const s = readyGame();
    const frozen = JSON.stringify(s);
    applyEvent(s, { type: "drawDeck" });
    expect(JSON.stringify(s)).toBe(frozen);
  });
});

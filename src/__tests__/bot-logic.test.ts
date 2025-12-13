import { describe, expect, it, vi } from "vitest";
import {
  decidePeekAction,
  decidePlayAction,
  decideHeldCardAction,
  getCurrentBotId,
  isBotTurn,
} from "@/lib/bot-logic";
import { GameState } from "@/types";

const baseState = (): GameState =>
  ({
    gameMode: "solo",
    roomId: null,
    hostId: "human",
    botDifficulty: "normal",
    drawPile: [],
    discardPile: [],
    players: [
      { id: "human", name: "Human", hand: [], score: 0 },
      { id: "bot", name: "Bot", hand: [], score: 0 },
    ],
    startingPlayerIndex: 0,
    currentPlayerIndex: 0,
    gamePhase: "playing",
    actionMessage: "",
    roundWinnerName: null,
    gameWinnerName: null,
    turnCount: 0,
    chatMessages: [],
  }) satisfies GameState;

describe("bot-logic (solo)", () => {
  it("treats peekingState.playerIndex as active turn for bots", () => {
    const state = baseState();
    state.gamePhase = "peeking";
    state.peekingState = { playerIndex: 1, peekedCount: 0, startIndex: 0 };

    expect(isBotTurn(state, "human")).toBe(true);
    expect(getCurrentBotId(state, "human")).toBe("bot");
  });

  it("returns FINISH_PEEKING once a bot peeked twice", () => {
    const state = baseState();
    state.gamePhase = "peeking";
    state.peekingState = { playerIndex: 1, peekedCount: 2, startIndex: 0 };
    state.players[1].hand = [
      { card: { id: 1, value: 1, isSpecial: false }, isFaceUp: false, hasBeenPeeked: true },
      { card: { id: 2, value: 2, isSpecial: false }, isFaceUp: false, hasBeenPeeked: true },
      { card: { id: 3, value: 3, isSpecial: false }, isFaceUp: false, hasBeenPeeked: false },
      { card: { id: 4, value: 4, isSpecial: false }, isFaceUp: false, hasBeenPeeked: false },
    ];

    expect(decidePeekAction(state, "bot")).toEqual({ type: "FINISH_PEEKING" });
  });

  it("must swap (not discard) when drawSource is discard", () => {
    const state = baseState();
    state.gamePhase = "holding_card";
    state.currentPlayerIndex = 1;
    state.drawSource = "discard";
    state.drawnCard = { id: 99, value: 1, isSpecial: false };
    state.players[1].hand = [
      { card: { id: 10, value: 9, isSpecial: false }, isFaceUp: false, hasBeenPeeked: false },
      { card: { id: 11, value: 7, isSpecial: false }, isFaceUp: false, hasBeenPeeked: false },
      { card: { id: 12, value: 5, isSpecial: false }, isFaceUp: false, hasBeenPeeked: false },
      { card: { id: 13, value: 3, isSpecial: false }, isFaceUp: false, hasBeenPeeked: false },
    ];

    const action = decideHeldCardAction(state, "bot");
    expect(action?.type).toBe("SWAP_HELD_CARD");
  });

  it("difficulty affects willingness to take low discard (easy < hard)", () => {
    const hard = baseState();
    hard.botDifficulty = "hard";
    hard.discardPile = [{ id: 1, value: 2, isSpecial: false }];

    const easy = baseState();
    easy.botDifficulty = "easy";
    easy.discardPile = [{ id: 1, value: 2, isSpecial: false }];

    vi.spyOn(Math, "random").mockReturnValue(0.6);
    expect(decidePeekAction(hard, "bot")).toBeNull(); // sanity

    // hard takes discard at random=0.6 (<=0.92)
    hard.gamePhase = "playing";
    hard.currentPlayerIndex = 1;
    expect(decidePlayAction(hard, "bot")?.type).toBe("DRAW_FROM_DISCARD");

    // easy does not (0.6 > 0.45)
    easy.gamePhase = "playing";
    easy.currentPlayerIndex = 1;
    expect(decidePlayAction(easy, "bot")?.type).toBe("DRAW_FROM_DECK");

    vi.restoreAllMocks();
  });
});

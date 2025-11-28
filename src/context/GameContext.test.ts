import { describe, expect, it, vi } from "vitest";

import { gameReducer, sanitizeRemoteState } from "@/context/GameContext";
import { initialState } from "@/stores/gameStore";
import { GameAction, GameState, Player } from "@/types";

vi.mock("@/i18n/config", () => ({
  default: {
    t: (key: string, vars?: Record<string, unknown>) => {
      if (typeof vars?.player === "string") return vars.player;
      if (typeof vars?.winner === "string") return vars.winner;
      return key;
    },
  },
}));

let cardId = 0;
const nextCardId = () => cardId++;

const createPlayer = (id: string, name: string, values: number[]): Player => ({
  id,
  name,
  hand: values.map((value) => ({
    card: { id: nextCardId(), value, isSpecial: false },
    isFaceUp: false,
    hasBeenPeeked: false,
  })),
  score: 0,
});

const buildState = (overrides: Partial<GameState>): GameState => ({
  ...initialState,
  ...overrides,
});

describe("gameReducer guardrails", () => {
  it("keeps opponent cards hidden when a player peeks their own hand", () => {
    const players = [
      createPlayer("p1", "Alice", [1, 2]),
      createPlayer("p2", "Bob", [3, 4]),
    ];

    const state = buildState({
      players,
      currentPlayerIndex: 0,
      gamePhase: "peeking",
      peekingState: { playerIndex: 0, peekedCount: 0 },
    });

    const result = gameReducer(state, {
      type: "PROCESS_ACTION",
      payload: {
        action: { type: "PEEK_CARD", payload: { playerId: "p1", cardIndex: 1 } },
      },
    });

    expect(result.players[0].hand[1].isFaceUp).toBe(true);
    expect(result.players[1].hand.every((card) => card.isFaceUp === false)).toBe(true);
    expect(result.peekingState?.peekedCount).toBe(1);
  });

  it("draws from the deck without exposing the drawn card to other players", () => {
    const players = [
      createPlayer("p1", "Alice", [1, 2]),
      createPlayer("p2", "Bob", [3, 4]),
    ];
    const drawPile = [
      { id: nextCardId(), value: 5, isSpecial: false },
      { id: nextCardId(), value: 6, isSpecial: false },
    ];

    const state = buildState({
      players,
      drawPile,
      currentPlayerIndex: 0,
      gamePhase: "playing",
    });

    const result = gameReducer(state, {
      type: "PROCESS_ACTION",
      payload: { action: { type: "DRAW_FROM_DECK" } },
    });

    expect(result.drawPile).toHaveLength(drawPile.length - 1);
    expect(result.drawnCard).toEqual(drawPile[drawPile.length - 1]);
    expect(result.gamePhase).toBe("holding_card");
    expect(result.players[1].hand).toEqual(players[1].hand);
  });

  it("marks peek targets without leaking visibility during special actions", () => {
    const players = [
      createPlayer("p1", "Alice", [1, 2]),
      createPlayer("p2", "Bob", [3, 4]),
    ];

    const state = buildState({
      players,
      currentPlayerIndex: 0,
      gamePhase: "action_peek_1",
      turnCount: 0,
    });

    const result = gameReducer(state, {
      type: "PROCESS_ACTION",
      payload: {
        action: { type: "ACTION_PEEK_1_SELECT", payload: { playerId: "p2", cardIndex: 0 } },
      },
    });

    expect(result.players[1].hand[0].hasBeenPeeked).toBe(true);
    expect(result.players[1].hand[0].isFaceUp).toBe(false);
    expect(result.currentPlayerIndex).toBe(1);
    expect(result.turnCount).toBe(1);
  });

  it("guards against invalid peek indexes without mutating state", () => {
    const players = [
      createPlayer("p1", "Alice", [1, 2]),
      createPlayer("p2", "Bob", [3, 4]),
    ];

    const state = buildState({
      players,
      currentPlayerIndex: 0,
      gamePhase: "peeking",
      peekingState: { playerIndex: 0, peekedCount: 0 },
    });

    const invalidAction: GameAction = {
      type: "PEEK_CARD",
      payload: { playerId: "p1", cardIndex: 9 },
    };

    const result = gameReducer(state, {
      type: "PROCESS_ACTION",
      payload: { action: invalidAction },
    });

    expect(result).toBe(state);
  });

  it("rejects peek selections to non-existent players", () => {
    const players = [
      createPlayer("p1", "Alice", [1, 2]),
      createPlayer("p2", "Bob", [3, 4]),
    ];

    const state = buildState({
      players,
      currentPlayerIndex: 0,
      gamePhase: "action_peek_1",
      turnCount: 0,
    });

    const invalidAction: GameAction = {
      type: "ACTION_PEEK_1_SELECT",
      payload: { playerId: "missing", cardIndex: 0 },
    };

    const result = gameReducer(state, {
      type: "PROCESS_ACTION",
      payload: { action: invalidAction },
    });

    expect(result).toBe(state);
  });

  it("requires swap targets to be valid cards", () => {
    const players = [
      createPlayer("p1", "Alice", [1, 2]),
      createPlayer("p2", "Bob", [3, 4]),
    ];

    const initialSwapState = buildState({
      players,
      currentPlayerIndex: 0,
      gamePhase: "action_swap_2_select_1",
      turnCount: 0,
    });

    const invalidFirstSelection = gameReducer(initialSwapState, {
      type: "PROCESS_ACTION",
      payload: {
        action: {
          type: "ACTION_SWAP_2_SELECT",
          payload: { playerId: "p1", cardIndex: 99 },
        },
      },
    });

    expect(invalidFirstSelection).toBe(initialSwapState);

    const readyForSecond = gameReducer(initialSwapState, {
      type: "PROCESS_ACTION",
      payload: {
        action: {
          type: "ACTION_SWAP_2_SELECT",
          payload: { playerId: "p1", cardIndex: 1 },
        },
      },
    });

    const invalidSecondSelection = gameReducer(readyForSecond, {
      type: "PROCESS_ACTION",
      payload: {
        action: {
          type: "ACTION_SWAP_2_SELECT",
          payload: { playerId: "p2", cardIndex: 5 },
        },
      },
    });

    expect(invalidSecondSelection).toBe(readyForSecond);
  });

  it("accepts only temp cards during take_2 choice", () => {
    const tempCards = [
      { id: nextCardId(), value: 5, isSpecial: false },
      { id: nextCardId(), value: 6, isSpecial: false },
    ];

    const state = buildState({
      players: [createPlayer("p1", "Alice", [1, 2])],
      currentPlayerIndex: 0,
      gamePhase: "action_take_2",
      tempCards,
      discardPile: [],
    });

    const bogusCard: GameAction = {
      type: "ACTION_TAKE_2_CHOOSE",
      payload: { card: { id: 999, value: 0, isSpecial: false } },
    };

    const result = gameReducer(state, {
      type: "PROCESS_ACTION",
      payload: { action: bogusCard },
    });

    expect(result).toBe(state);
  });

  it("only allows calling pobudka during a turn's main phase", () => {
    const players = [createPlayer("p1", "Alice", [1, 2])];
    const holdingState = buildState({
      players,
      currentPlayerIndex: 0,
      gamePhase: "holding_card",
      drawnCard: { id: nextCardId(), value: 4, isSpecial: false },
    });

    const ignoredCall = gameReducer(holdingState, {
      type: "PROCESS_ACTION",
      payload: { action: { type: "CALL_POBUDKA" } },
    });

    expect(ignoredCall).toBe(holdingState);
  });
});

describe("sanitizeRemoteState", () => {
  it("hides opponents' drawn cards and temp cards while preserving my view", () => {
    const players = [
      createPlayer("p1", "Alice", [1, 2]),
      createPlayer("p2", "Bob", [3, 4]),
    ];

    const remoteState = buildState({
      players,
      currentPlayerIndex: 1,
      gamePhase: "action_take_2",
      drawnCard: { id: nextCardId(), value: 9, isSpecial: false },
      drawSource: "deck",
      tempCards: [
        { id: nextCardId(), value: 10, isSpecial: false },
        { id: nextCardId(), value: 11, isSpecial: false },
      ],
    });

    const sanitized = sanitizeRemoteState(remoteState, remoteState, "p1");

    expect(sanitized.drawnCard).toBeNull();
    expect(sanitized.drawSource).toBeNull();
    expect(sanitized.tempCards).toBeUndefined();
    expect(sanitized.players[1].hand.every((card) => card.isFaceUp === false)).toBe(
      true,
    );
  });

  it("keeps my drawn card visible on my turn", () => {
    const players = [
      createPlayer("p1", "Alice", [1, 2]),
      createPlayer("p2", "Bob", [3, 4]),
    ];

    const remoteState = buildState({
      players,
      currentPlayerIndex: 0,
      gamePhase: "holding_card",
      drawnCard: { id: nextCardId(), value: 9, isSpecial: false },
      drawSource: "deck",
    });

    const sanitized = sanitizeRemoteState(remoteState, remoteState, "p1");

    expect(sanitized.drawnCard).toEqual(remoteState.drawnCard);
    expect(sanitized.drawSource).toBe("deck");
  });
});

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  decidePeekAction,
  decidePlayAction,
  decideHeldCardAction,
  decideTake2Action,
  decidePeek1Action,
  decideSwap2Select1Action,
  decideSwap2Select2Action,
  getCurrentBotId,
  isBotTurn,
  getBotAction,
  clearAllBotMemory,
  rememberPeekedCard,
  forgetRememberedCard,
} from "@/lib/bot-logic";
import { type Card, type GameAction, type GameState } from "@/types";

const createCard = (id: number, value: number, isSpecial = false, specialAction?: Card["specialAction"]): Card => ({
  id,
  value,
  isSpecial,
  specialAction,
});

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

const expectActionType = <T extends GameAction["type"]>(
  action: GameAction | null | undefined,
  type: T,
): Extract<GameAction, { type: T }> => {
  expect(action).toBeTruthy();
  expect(action!.type).toBe(type);
  return action as Extract<GameAction, { type: T }>;
};

describe("bot-logic", () => {
  beforeEach(() => {
    clearAllBotMemory();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("isBotTurn", () => {
    it("returns false for non-solo game modes", () => {
      const state = baseState();
      state.gameMode = "hotseat";
      expect(isBotTurn(state, "human")).toBe(false);

      state.gameMode = "online";
      expect(isBotTurn(state, "human")).toBe(false);
    });

    it("returns false during lobby phase", () => {
      const state = baseState();
      state.gamePhase = "lobby";
      expect(isBotTurn(state, "human")).toBe(false);
    });

    it("returns false during game_over phase", () => {
      const state = baseState();
      state.gamePhase = "game_over";
      expect(isBotTurn(state, "human")).toBe(false);
    });

    it("returns true when bot is active player during playing phase", () => {
      const state = baseState();
      state.gamePhase = "playing";
      state.currentPlayerIndex = 1; // bot
      expect(isBotTurn(state, "human")).toBe(true);
    });

    it("returns false when human is active player during playing phase", () => {
      const state = baseState();
      state.gamePhase = "playing";
      state.currentPlayerIndex = 0; // human
      expect(isBotTurn(state, "human")).toBe(false);
    });

    it("uses peekingState.playerIndex during peeking phase", () => {
      const state = baseState();
      state.gamePhase = "peeking";
      state.currentPlayerIndex = 0; // human is current
      state.peekingState = { playerIndex: 1, peekedCount: 0, startIndex: 0 }; // but bot is peeking
      expect(isBotTurn(state, "human")).toBe(true);
    });

    it("returns false when human is peeking", () => {
      const state = baseState();
      state.gamePhase = "peeking";
      state.peekingState = { playerIndex: 0, peekedCount: 0, startIndex: 0 };
      expect(isBotTurn(state, "human")).toBe(false);
    });
  });

  describe("getCurrentBotId", () => {
    it("returns bot id when bot is active", () => {
      const state = baseState();
      state.currentPlayerIndex = 1;
      expect(getCurrentBotId(state, "human")).toBe("bot");
    });

    it("returns null when human is active", () => {
      const state = baseState();
      state.currentPlayerIndex = 0;
      expect(getCurrentBotId(state, "human")).toBeNull();
    });

    it("returns correct bot id during peeking phase", () => {
      const state = baseState();
      state.gamePhase = "peeking";
      state.peekingState = { playerIndex: 1, peekedCount: 0, startIndex: 0 };
      expect(getCurrentBotId(state, "human")).toBe("bot");
    });
  });

  describe("decidePeekAction", () => {
    it("returns FINISH_PEEKING when peekedCount >= 2", () => {
      const state = baseState();
      state.gamePhase = "peeking";
      state.peekingState = { playerIndex: 1, peekedCount: 2, startIndex: 0 };
      state.players[1].hand = [
        { card: createCard(1, 1), isFaceUp: false, hasBeenPeeked: true },
        { card: createCard(2, 2), isFaceUp: false, hasBeenPeeked: true },
        { card: createCard(3, 3), isFaceUp: false, hasBeenPeeked: false },
        { card: createCard(4, 4), isFaceUp: false, hasBeenPeeked: false },
      ];

      expect(decidePeekAction(state, "bot")).toEqual({ type: "FINISH_PEEKING" });
    });

    it("returns PEEK_CARD for unpeeked cards", () => {
      const state = baseState();
      state.gamePhase = "peeking";
      state.peekingState = { playerIndex: 1, peekedCount: 0, startIndex: 0 };
      state.players[1].hand = [
        { card: createCard(1, 1), isFaceUp: false, hasBeenPeeked: false },
        { card: createCard(2, 2), isFaceUp: false, hasBeenPeeked: false },
        { card: createCard(3, 3), isFaceUp: false, hasBeenPeeked: false },
        { card: createCard(4, 4), isFaceUp: false, hasBeenPeeked: false },
      ];

      const action = decidePeekAction(state, "bot");
      const peek = expectActionType(action, "PEEK_CARD");
      expect(peek.payload.playerId).toBe("bot");
    });

    it("returns null when it is not bot's peeking turn", () => {
      const state = baseState();
      state.gamePhase = "peeking";
      state.peekingState = { playerIndex: 0, peekedCount: 0, startIndex: 0 }; // human peeking

      expect(decidePeekAction(state, "bot")).toBeNull();
    });

    it("returns null when bot not found", () => {
      const state = baseState();
      state.gamePhase = "peeking";
      state.peekingState = { playerIndex: 1, peekedCount: 0, startIndex: 0 };

      expect(decidePeekAction(state, "unknown")).toBeNull();
    });
  });

  describe("decidePlayAction", () => {
    it("returns DRAW_FROM_DECK when discard is empty", () => {
      const state = baseState();
      state.gamePhase = "playing";
      state.currentPlayerIndex = 1;
      state.discardPile = [];

      expect(decidePlayAction(state, "bot")).toEqual({ type: "DRAW_FROM_DECK" });
    });

    it("returns DRAW_FROM_DISCARD for low value cards in hard mode", () => {
      const state = baseState();
      state.botDifficulty = "hard";
      state.gamePhase = "playing";
      state.currentPlayerIndex = 1;
      state.discardPile = [createCard(1, 1)]; // low value

      vi.spyOn(Math, "random").mockReturnValue(0.5); // under 0.92 threshold
      expect(decidePlayAction(state, "bot")).toEqual({ type: "DRAW_FROM_DISCARD" });
    });

    it("returns CALL_POBUDKA when conditions are met", () => {
      const state = baseState();
      state.botDifficulty = "hard";
      state.gamePhase = "playing";
      state.currentPlayerIndex = 1;
      state.players[1].hand = [
        { card: createCard(1, 0), isFaceUp: false, hasBeenPeeked: false },
        { card: createCard(2, 1), isFaceUp: false, hasBeenPeeked: false },
        { card: createCard(3, 2), isFaceUp: false, hasBeenPeeked: false },
        { card: createCard(4, 1), isFaceUp: false, hasBeenPeeked: false },
      ];

      // remember all cards as low
      rememberPeekedCard("bot", 0, 0);
      rememberPeekedCard("bot", 1, 1);
      rememberPeekedCard("bot", 2, 2);
      rememberPeekedCard("bot", 3, 1);

      vi.spyOn(Math, "random").mockReturnValue(0.1); // low enough to trigger pobudka
      const action = decidePlayAction(state, "bot");
      expect(action).toEqual({ type: "CALL_POBUDKA" });
    });
  });

  describe("decideHeldCardAction", () => {
    it("must swap when drawSource is discard", () => {
      const state = baseState();
      state.gamePhase = "holding_card";
      state.currentPlayerIndex = 1;
      state.drawSource = "discard";
      state.drawnCard = createCard(99, 1);
      state.players[1].hand = [
        { card: createCard(10, 9), isFaceUp: false, hasBeenPeeked: false },
        { card: createCard(11, 7), isFaceUp: false, hasBeenPeeked: false },
        { card: createCard(12, 5), isFaceUp: false, hasBeenPeeked: false },
        { card: createCard(13, 3), isFaceUp: false, hasBeenPeeked: false },
      ];

      const action = decideHeldCardAction(state, "bot");
      expect(action?.type).toBe("SWAP_HELD_CARD");
    });

    it("must swap when drawSource is take2", () => {
      const state = baseState();
      state.gamePhase = "holding_card";
      state.currentPlayerIndex = 1;
      state.drawSource = "take2";
      state.drawnCard = createCard(99, 3);
      state.players[1].hand = [
        { card: createCard(10, 9), isFaceUp: false, hasBeenPeeked: false },
        { card: createCard(11, 7), isFaceUp: false, hasBeenPeeked: false },
        { card: createCard(12, 5), isFaceUp: false, hasBeenPeeked: false },
        { card: createCard(13, 3), isFaceUp: false, hasBeenPeeked: false },
      ];

      const action = decideHeldCardAction(state, "bot");
      expect(action?.type).toBe("SWAP_HELD_CARD");
    });

    it("may use special action for special cards from deck", () => {
      const state = baseState();
      state.gamePhase = "holding_card";
      state.currentPlayerIndex = 1;
      state.drawSource = "deck";
      state.drawnCard = createCard(99, 6, true, "peek_1");
      state.players[1].hand = [
        { card: createCard(10, 5), isFaceUp: false, hasBeenPeeked: false },
        { card: createCard(11, 5), isFaceUp: false, hasBeenPeeked: false },
        { card: createCard(12, 5), isFaceUp: false, hasBeenPeeked: false },
        { card: createCard(13, 5), isFaceUp: false, hasBeenPeeked: false },
      ];

      vi.spyOn(Math, "random").mockReturnValue(0.1); // low enough to use special
      const action = decideHeldCardAction(state, "bot");
      expect(action?.type).toBe("USE_SPECIAL_ACTION");
    });

    it("swaps low value cards with high known cards", () => {
      const state = baseState();
      state.gamePhase = "holding_card";
      state.currentPlayerIndex = 1;
      state.drawSource = "deck";
      state.drawnCard = createCard(99, 1); // low value
      state.players[1].hand = [
        { card: createCard(10, 9), isFaceUp: false, hasBeenPeeked: false },
        { card: createCard(11, 7), isFaceUp: false, hasBeenPeeked: false },
        { card: createCard(12, 5), isFaceUp: false, hasBeenPeeked: false },
        { card: createCard(13, 3), isFaceUp: false, hasBeenPeeked: false },
      ];

      // remember card at index 0 as high value
      rememberPeekedCard("bot", 0, 9);

      const action = decideHeldCardAction(state, "bot");
      const swap = expectActionType(action, "SWAP_HELD_CARD");
      expect(swap.payload.cardIndex).toBe(0);
    });

    it("discards high value cards", () => {
      const state = baseState();
      state.gamePhase = "holding_card";
      state.currentPlayerIndex = 1;
      state.drawSource = "deck";
      state.drawnCard = createCard(99, 9); // high value
      state.players[1].hand = [
        { card: createCard(10, 1), isFaceUp: false, hasBeenPeeked: false },
        { card: createCard(11, 2), isFaceUp: false, hasBeenPeeked: false },
        { card: createCard(12, 3), isFaceUp: false, hasBeenPeeked: false },
        { card: createCard(13, 4), isFaceUp: false, hasBeenPeeked: false },
      ];

      const action = decideHeldCardAction(state, "bot");
      expect(action?.type).toBe("DISCARD_HELD_CARD");
    });

    it("returns null when drawnCard is null", () => {
      const state = baseState();
      state.gamePhase = "holding_card";
      state.currentPlayerIndex = 1;
      state.drawnCard = null;

      expect(decideHeldCardAction(state, "bot")).toBeNull();
    });
  });

  describe("decideTake2Action", () => {
    it("chooses lower value card", () => {
      const state = baseState();
      state.gamePhase = "action_take_2";
      state.tempCards = [createCard(1, 7), createCard(2, 3)];

      const action = decideTake2Action(state);
      const choose = expectActionType(action, "ACTION_TAKE_2_CHOOSE");
      expect(choose.payload.card.value).toBe(3);
    });

    it("chooses first card when values are equal", () => {
      const state = baseState();
      state.gamePhase = "action_take_2";
      state.tempCards = [createCard(1, 5), createCard(2, 5)];

      const action = decideTake2Action(state);
      const choose = expectActionType(action, "ACTION_TAKE_2_CHOOSE");
      expect(choose.payload.card.id).toBe(1);
    });

    it("returns null when tempCards is undefined", () => {
      const state = baseState();
      state.gamePhase = "action_take_2";
      state.tempCards = undefined;

      expect(decideTake2Action(state)).toBeNull();
    });

    it("returns null when tempCards has wrong length", () => {
      const state = baseState();
      state.gamePhase = "action_take_2";
      state.tempCards = [createCard(1, 5)];

      expect(decideTake2Action(state)).toBeNull();
    });
  });

  describe("decidePeek1Action", () => {
    it("prefers peeking own unknown cards", () => {
      const state = baseState();
      state.gamePhase = "action_peek_1";
      state.currentPlayerIndex = 1;
      state.players[1].hand = [
        { card: createCard(1, 1), isFaceUp: false, hasBeenPeeked: false },
        { card: createCard(2, 2), isFaceUp: false, hasBeenPeeked: false },
        { card: createCard(3, 3), isFaceUp: false, hasBeenPeeked: false },
        { card: createCard(4, 4), isFaceUp: false, hasBeenPeeked: false },
      ];

      vi.spyOn(Math, "random").mockReturnValue(0.1); // low enough to peek own
      const action = decidePeek1Action(state, "bot");
      const select = expectActionType(action, "ACTION_PEEK_1_SELECT");
      expect(select.payload.playerId).toBe("bot");
    });

    it("can peek opponent cards", () => {
      const state = baseState();
      state.gamePhase = "action_peek_1";
      state.currentPlayerIndex = 1;
      state.players[1].hand = [
        { card: createCard(1, 1), isFaceUp: false, hasBeenPeeked: false },
        { card: createCard(2, 2), isFaceUp: false, hasBeenPeeked: false },
        { card: createCard(3, 3), isFaceUp: false, hasBeenPeeked: false },
        { card: createCard(4, 4), isFaceUp: false, hasBeenPeeked: false },
      ];
      state.players[0].hand = [
        { card: createCard(5, 5), isFaceUp: false, hasBeenPeeked: false },
        { card: createCard(6, 6), isFaceUp: false, hasBeenPeeked: false },
        { card: createCard(7, 7), isFaceUp: false, hasBeenPeeked: false },
        { card: createCard(8, 8), isFaceUp: false, hasBeenPeeked: false },
      ];

      // remember all own cards so bot peeks opponent
      rememberPeekedCard("bot", 0, 1);
      rememberPeekedCard("bot", 1, 2);
      rememberPeekedCard("bot", 2, 3);
      rememberPeekedCard("bot", 3, 4);

      vi.spyOn(Math, "random").mockReturnValue(0.99); // high enough to peek opponent
      const action = decidePeek1Action(state, "bot");
      const select = expectActionType(action, "ACTION_PEEK_1_SELECT");
      expect(select.payload.playerId).toBe("human");
    });
  });

  describe("decideSwap2Select1Action", () => {
    it("selects own high card when known", () => {
      const state = baseState();
      state.gamePhase = "action_swap_2_select_1";
      state.currentPlayerIndex = 1;
      state.players[1].hand = [
        { card: createCard(1, 9), isFaceUp: false, hasBeenPeeked: false },
        { card: createCard(2, 2), isFaceUp: false, hasBeenPeeked: false },
        { card: createCard(3, 3), isFaceUp: false, hasBeenPeeked: false },
        { card: createCard(4, 4), isFaceUp: false, hasBeenPeeked: false },
      ];

      rememberPeekedCard("bot", 0, 9);

      const action = decideSwap2Select1Action(state, "bot");
      const select = expectActionType(action, "ACTION_SWAP_2_SELECT");
      expect(select.payload.playerId).toBe("bot");
      expect(select.payload.cardIndex).toBe(0);
    });

    it("selects opponent card when no high cards known", () => {
      const state = baseState();
      state.gamePhase = "action_swap_2_select_1";
      state.currentPlayerIndex = 1;
      state.players[0].hand = [
        { card: createCard(5, 5), isFaceUp: false, hasBeenPeeked: false },
        { card: createCard(6, 6), isFaceUp: false, hasBeenPeeked: false },
        { card: createCard(7, 7), isFaceUp: false, hasBeenPeeked: false },
        { card: createCard(8, 8), isFaceUp: false, hasBeenPeeked: false },
      ];
      state.players[1].hand = [
        { card: createCard(1, 1), isFaceUp: false, hasBeenPeeked: false },
        { card: createCard(2, 2), isFaceUp: false, hasBeenPeeked: false },
        { card: createCard(3, 3), isFaceUp: false, hasBeenPeeked: false },
        { card: createCard(4, 4), isFaceUp: false, hasBeenPeeked: false },
      ];

      const action = decideSwap2Select1Action(state, "bot");
      const select = expectActionType(action, "ACTION_SWAP_2_SELECT");
      expect(select.payload.playerId).toBe("human");
    });
  });

  describe("decideSwap2Select2Action", () => {
    it("selects opponent card when first selection was own card", () => {
      const state = baseState();
      state.gamePhase = "action_swap_2_select_2";
      state.currentPlayerIndex = 1;
      state.swapState = { card1: { playerId: "bot", cardIndex: 0 } };
      state.players[0].hand = [
        { card: createCard(5, 5), isFaceUp: false, hasBeenPeeked: false },
        { card: createCard(6, 6), isFaceUp: false, hasBeenPeeked: false },
        { card: createCard(7, 7), isFaceUp: false, hasBeenPeeked: false },
        { card: createCard(8, 8), isFaceUp: false, hasBeenPeeked: false },
      ];

      const action = decideSwap2Select2Action(state, "bot");
      const select = expectActionType(action, "ACTION_SWAP_2_SELECT");
      expect(select.payload.playerId).toBe("human");
    });

    it("selects own card when first selection was opponent card", () => {
      const state = baseState();
      state.gamePhase = "action_swap_2_select_2";
      state.currentPlayerIndex = 1;
      state.swapState = { card1: { playerId: "human", cardIndex: 0 } };
      state.players[1].hand = [
        { card: createCard(1, 1), isFaceUp: false, hasBeenPeeked: false },
        { card: createCard(2, 2), isFaceUp: false, hasBeenPeeked: false },
        { card: createCard(3, 3), isFaceUp: false, hasBeenPeeked: false },
        { card: createCard(4, 4), isFaceUp: false, hasBeenPeeked: false },
      ];

      const action = decideSwap2Select2Action(state, "bot");
      const select = expectActionType(action, "ACTION_SWAP_2_SELECT");
      expect(select.payload.playerId).toBe("bot");
    });

    it("returns null when swapState is missing", () => {
      const state = baseState();
      state.gamePhase = "action_swap_2_select_2";
      state.swapState = undefined;

      expect(decideSwap2Select2Action(state, "bot")).toBeNull();
    });
  });

  describe("getBotAction", () => {
    it("returns correct action for each phase", () => {
      const state = baseState();
      state.currentPlayerIndex = 1;
      state.players[1].hand = [
        { card: createCard(1, 1), isFaceUp: false, hasBeenPeeked: false },
        { card: createCard(2, 2), isFaceUp: false, hasBeenPeeked: false },
        { card: createCard(3, 3), isFaceUp: false, hasBeenPeeked: false },
        { card: createCard(4, 4), isFaceUp: false, hasBeenPeeked: false },
      ];

      // playing phase
      state.gamePhase = "playing";
      expect(getBotAction(state, "bot")?.type).toMatch(/DRAW_FROM_|CALL_POBUDKA/);

      // holding_card phase
      state.gamePhase = "holding_card";
      state.drawnCard = createCard(99, 5);
      state.drawSource = "deck";
      expect(getBotAction(state, "bot")?.type).toMatch(/SWAP_HELD_CARD|DISCARD_HELD_CARD|USE_SPECIAL_ACTION/);

      // action_take_2 phase
      state.gamePhase = "action_take_2";
      state.tempCards = [createCard(1, 3), createCard(2, 7)];
      expect(getBotAction(state, "bot")?.type).toBe("ACTION_TAKE_2_CHOOSE");

      // action_peek_1 phase
      state.gamePhase = "action_peek_1";
      expect(getBotAction(state, "bot")?.type).toBe("ACTION_PEEK_1_SELECT");

      // action_swap_2_select_1 phase
      state.gamePhase = "action_swap_2_select_1";
      expect(getBotAction(state, "bot")?.type).toBe("ACTION_SWAP_2_SELECT");

      // action_swap_2_select_2 phase
      state.gamePhase = "action_swap_2_select_2";
      state.swapState = { card1: { playerId: "bot", cardIndex: 0 } };
      expect(getBotAction(state, "bot")?.type).toBe("ACTION_SWAP_2_SELECT");
    });

    it("returns null for round_end phase", () => {
      const state = baseState();
      state.gamePhase = "round_end";
      expect(getBotAction(state, "bot")).toBeNull();
    });

    it("returns null for game_over phase", () => {
      const state = baseState();
      state.gamePhase = "game_over";
      expect(getBotAction(state, "bot")).toBeNull();
    });

    it("returns null for lobby phase", () => {
      const state = baseState();
      state.gamePhase = "lobby";
      expect(getBotAction(state, "bot")).toBeNull();
    });
  });

  describe("memory management", () => {
    it("remembers peeked cards", () => {
      rememberPeekedCard("bot", 0, 5);
      rememberPeekedCard("bot", 2, 3);

      const state = baseState();
      state.gamePhase = "holding_card";
      state.currentPlayerIndex = 1;
      state.drawSource = "deck";
      state.drawnCard = createCard(99, 1);
      state.players[1].hand = [
        { card: createCard(1, 5), isFaceUp: false, hasBeenPeeked: false },
        { card: createCard(2, 2), isFaceUp: false, hasBeenPeeked: false },
        { card: createCard(3, 3), isFaceUp: false, hasBeenPeeked: false },
        { card: createCard(4, 4), isFaceUp: false, hasBeenPeeked: false },
      ];

      // should swap with remembered high card at index 0
      const action = decideHeldCardAction(state, "bot");
      const swap = expectActionType(action, "SWAP_HELD_CARD");
      expect(swap.payload.cardIndex).toBe(0);
    });

    it("forgets cards after swap", () => {
      rememberPeekedCard("bot", 0, 9);

      // simulate forgetting after swap
      forgetRememberedCard("bot", 0);

      const state = baseState();
      state.gamePhase = "holding_card";
      state.currentPlayerIndex = 1;
      state.drawSource = "deck";
      state.drawnCard = createCard(99, 1);
      state.players[1].hand = [
        { card: createCard(1, 5), isFaceUp: false, hasBeenPeeked: false },
        { card: createCard(2, 2), isFaceUp: false, hasBeenPeeked: false },
        { card: createCard(3, 3), isFaceUp: false, hasBeenPeeked: false },
        { card: createCard(4, 4), isFaceUp: false, hasBeenPeeked: false },
      ];

      // no high cards known, so it should swap with unknown
      const action = decideHeldCardAction(state, "bot");
      expect(action?.type).toBe("SWAP_HELD_CARD");
    });

    it("clearAllBotMemory clears all memories", () => {
      rememberPeekedCard("bot1", 0, 5);
      rememberPeekedCard("bot2", 1, 3);

      clearAllBotMemory();

      // memories should be cleared (tested indirectly)
      const state = baseState();
      state.players.push({ id: "bot2", name: "Bot 2", hand: [], score: 0 });
      state.gamePhase = "action_peek_1";
      state.currentPlayerIndex = 1;
      state.players[1].hand = [
        { card: createCard(1, 1), isFaceUp: false, hasBeenPeeked: false },
        { card: createCard(2, 2), isFaceUp: false, hasBeenPeeked: false },
        { card: createCard(3, 3), isFaceUp: false, hasBeenPeeked: false },
        { card: createCard(4, 4), isFaceUp: false, hasBeenPeeked: false },
      ];

      vi.spyOn(Math, "random").mockReturnValue(0.1);
      // should try to peek own card since memory is cleared
      const action = decidePeek1Action(state, "bot");
      const select = expectActionType(action, "ACTION_PEEK_1_SELECT");
      expect(select.payload.playerId).toBe("bot");
    });
  });

  describe("difficulty settings", () => {
    it("easy mode has lower take discard chance", () => {
      const easy = baseState();
      easy.botDifficulty = "easy";
      easy.gamePhase = "playing";
      easy.currentPlayerIndex = 1;
      easy.discardPile = [createCard(1, 2)];

      vi.spyOn(Math, "random").mockReturnValue(0.5);
      // 0.5 > 0.45 threshold for easy, should draw from deck
      expect(decidePlayAction(easy, "bot")?.type).toBe("DRAW_FROM_DECK");
    });

    it("hard mode has higher take discard chance", () => {
      const hard = baseState();
      hard.botDifficulty = "hard";
      hard.gamePhase = "playing";
      hard.currentPlayerIndex = 1;
      hard.discardPile = [createCard(1, 2)];

      vi.spyOn(Math, "random").mockReturnValue(0.5);
      // 0.5 < 0.92 threshold for hard, should take discard
      expect(decidePlayAction(hard, "bot")?.type).toBe("DRAW_FROM_DISCARD");
    });
  });
});

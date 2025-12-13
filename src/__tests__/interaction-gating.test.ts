import { describe, it, expect } from "vitest";
import {
  isOpponentTargetablePhase,
  isSpecialSelectionPhase,
  getActivePlayerId,
  canActNow,
  shouldAllowOpponentCardClick,
  getCardInteractivity,
  shouldPulseCard,
} from "@/lib/interaction-gating";
import { GameState, GamePhase } from "@/types";
import { initialGameState } from "@/state/initialGame";

describe("interaction-gating", () => {
  describe("isOpponentTargetablePhase", () => {
    it("returns true for action_peek_1 phase", () => {
      expect(isOpponentTargetablePhase("action_peek_1")).toBe(true);
    });

    it("returns true for action_swap_2_select_1 phase", () => {
      expect(isOpponentTargetablePhase("action_swap_2_select_1")).toBe(true);
    });

    it("returns true for action_swap_2_select_2 phase", () => {
      expect(isOpponentTargetablePhase("action_swap_2_select_2")).toBe(true);
    });

    it("returns false for action_take_2 phase", () => {
      expect(isOpponentTargetablePhase("action_take_2")).toBe(false);
    });

    it("returns false for playing phase", () => {
      expect(isOpponentTargetablePhase("playing")).toBe(false);
    });

    it("returns false for peeking phase", () => {
      expect(isOpponentTargetablePhase("peeking")).toBe(false);
    });

    it("returns false for holding_card phase", () => {
      expect(isOpponentTargetablePhase("holding_card")).toBe(false);
    });

    it("returns false for round_end phase", () => {
      expect(isOpponentTargetablePhase("round_end")).toBe(false);
    });

    it("returns false for game_over phase", () => {
      expect(isOpponentTargetablePhase("game_over")).toBe(false);
    });

    it("returns false for lobby phase", () => {
      expect(isOpponentTargetablePhase("lobby")).toBe(false);
    });
  });

  describe("isSpecialSelectionPhase", () => {
    it("returns true for action_peek_1", () => {
      expect(isSpecialSelectionPhase("action_peek_1")).toBe(true);
    });

    it("returns true for action_swap_2_select_1", () => {
      expect(isSpecialSelectionPhase("action_swap_2_select_1")).toBe(true);
    });

    it("returns true for action_swap_2_select_2", () => {
      expect(isSpecialSelectionPhase("action_swap_2_select_2")).toBe(true);
    });

    it("returns true for action_take_2", () => {
      expect(isSpecialSelectionPhase("action_take_2")).toBe(true);
    });

    it("returns false for playing phase", () => {
      expect(isSpecialSelectionPhase("playing")).toBe(false);
    });

    it("returns false for peeking phase", () => {
      expect(isSpecialSelectionPhase("peeking")).toBe(false);
    });

    it("returns false for holding_card phase", () => {
      expect(isSpecialSelectionPhase("holding_card")).toBe(false);
    });
  });

  describe("getActivePlayerId", () => {
    it("returns peekingState player during peeking phase", () => {
      const state: GameState = {
        ...initialGameState,
        gamePhase: "peeking",
        players: [
          { id: "p1", name: "Alice", hand: [], score: 0 },
          { id: "p2", name: "Bob", hand: [], score: 0 },
        ],
        currentPlayerIndex: 0,
        peekingState: { playerIndex: 1, peekedCount: 0, startIndex: 0 },
      };

      expect(getActivePlayerId(state)).toBe("p2");
    });

    it("returns currentPlayer during playing phase", () => {
      const state: GameState = {
        ...initialGameState,
        gamePhase: "playing",
        players: [
          { id: "p1", name: "Alice", hand: [], score: 0 },
          { id: "p2", name: "Bob", hand: [], score: 0 },
        ],
        currentPlayerIndex: 1,
      };

      expect(getActivePlayerId(state)).toBe("p2");
    });

    it("returns currentPlayer during action_peek_1 phase", () => {
      const state: GameState = {
        ...initialGameState,
        gamePhase: "action_peek_1",
        players: [
          { id: "p1", name: "Alice", hand: [], score: 0 },
          { id: "p2", name: "Bob", hand: [], score: 0 },
        ],
        currentPlayerIndex: 0,
      };

      expect(getActivePlayerId(state)).toBe("p1");
    });

    it("returns currentPlayer during action_swap_2 phases", () => {
      const state: GameState = {
        ...initialGameState,
        gamePhase: "action_swap_2_select_1",
        players: [
          { id: "p1", name: "Alice", hand: [], score: 0 },
          { id: "p2", name: "Bob", hand: [], score: 0 },
        ],
        currentPlayerIndex: 0,
      };

      expect(getActivePlayerId(state)).toBe("p1");
    });

    it("returns undefined when no players", () => {
      const state: GameState = {
        ...initialGameState,
        gamePhase: "playing",
        players: [],
        currentPlayerIndex: 0,
      };

      expect(getActivePlayerId(state)).toBeUndefined();
    });

    it("returns undefined when peekingState player index is out of bounds", () => {
      const state: GameState = {
        ...initialGameState,
        gamePhase: "peeking",
        players: [{ id: "p1", name: "Alice", hand: [], score: 0 }],
        currentPlayerIndex: 0,
        peekingState: { playerIndex: 5, peekedCount: 0, startIndex: 0 },
      };

      expect(getActivePlayerId(state)).toBeUndefined();
    });
  });

  describe("canActNow", () => {
    it("returns true in hotseat mode regardless of player", () => {
      expect(canActNow("hotseat", "p1", "p2")).toBe(true);
      expect(canActNow("hotseat", "p1", "p1")).toBe(true);
      expect(canActNow("hotseat", undefined, "p1")).toBe(true);
    });

    it("returns true in solo mode when human player is active", () => {
      expect(canActNow("solo", "human", "human")).toBe(true);
    });

    it("returns false in solo mode when bot is active", () => {
      expect(canActNow("solo", "bot", "human")).toBe(false);
    });

    it("returns true in online mode when local player matches current player", () => {
      expect(canActNow("online", "p1", "p1")).toBe(true);
    });

    it("returns false in online mode when local player does not match", () => {
      expect(canActNow("online", "p2", "p1")).toBe(false);
    });

    it("returns false for unknown game mode", () => {
      expect(canActNow(null as unknown as GameState["gameMode"], "p1", "p1")).toBe(false);
    });

    it("returns false when activePlayerId is undefined in online mode", () => {
      expect(canActNow("online", undefined, "p1")).toBe(false);
    });

    it("returns false when myPlayerId is undefined in online mode", () => {
      expect(canActNow("online", "p1", undefined)).toBe(false);
    });
  });

  describe("shouldAllowOpponentCardClick", () => {
    it("always allows non-opponent card clicks", () => {
      expect(
        shouldAllowOpponentCardClick({
          isOpponent: false,
          gamePhase: "playing",
          canActNow: false,
          isPeekingTurn: false,
          isCurrentPlayer: false,
        })
      ).toBe(true);
    });

    it("allows opponent card clicks during peek_1 when canActNow", () => {
      expect(
        shouldAllowOpponentCardClick({
          isOpponent: true,
          gamePhase: "action_peek_1",
          canActNow: true,
          isPeekingTurn: false,
          isCurrentPlayer: false,
        })
      ).toBe(true);
    });

    it("blocks opponent card clicks during peek_1 when cannot act", () => {
      expect(
        shouldAllowOpponentCardClick({
          isOpponent: true,
          gamePhase: "action_peek_1",
          canActNow: false,
          isPeekingTurn: false,
          isCurrentPlayer: false,
        })
      ).toBe(false);
    });

    it("allows opponent card clicks during swap_2_select_1 when canActNow", () => {
      expect(
        shouldAllowOpponentCardClick({
          isOpponent: true,
          gamePhase: "action_swap_2_select_1",
          canActNow: true,
          isPeekingTurn: false,
          isCurrentPlayer: false,
        })
      ).toBe(true);
    });

    it("allows opponent card clicks during swap_2_select_2 when canActNow", () => {
      expect(
        shouldAllowOpponentCardClick({
          isOpponent: true,
          gamePhase: "action_swap_2_select_2",
          canActNow: true,
          isPeekingTurn: false,
          isCurrentPlayer: false,
        })
      ).toBe(true);
    });

    it("blocks opponent card clicks during take_2", () => {
      expect(
        shouldAllowOpponentCardClick({
          isOpponent: true,
          gamePhase: "action_take_2",
          canActNow: true,
          isPeekingTurn: false,
          isCurrentPlayer: false,
        })
      ).toBe(false);
    });

    it("blocks opponent card clicks during playing phase", () => {
      expect(
        shouldAllowOpponentCardClick({
          isOpponent: true,
          gamePhase: "playing",
          canActNow: true,
          isPeekingTurn: false,
          isCurrentPlayer: false,
        })
      ).toBe(false);
    });

    it("allows clicks during peeking when isPeekingTurn", () => {
      expect(
        shouldAllowOpponentCardClick({
          isOpponent: true,
          gamePhase: "peeking",
          canActNow: false,
          isPeekingTurn: true,
          isCurrentPlayer: false,
        })
      ).toBe(true);
    });

    it("allows clicks during holding_card when isCurrentPlayer", () => {
      expect(
        shouldAllowOpponentCardClick({
          isOpponent: true,
          gamePhase: "holding_card",
          canActNow: false,
          isPeekingTurn: false,
          isCurrentPlayer: true,
        })
      ).toBe(true);
    });
  });

  describe("getCardInteractivity", () => {
    it("returns true during peeking for unpeeked cards when isPeekingTurn and peekedCount < 2", () => {
      expect(
        getCardInteractivity({
          gamePhase: "peeking",
          canActNow: false,
          isPeekingTurn: true,
          isCurrentPlayer: false,
          cardIsFaceUp: false,
          peekedCount: 0,
        })
      ).toBe(true);

      expect(
        getCardInteractivity({
          gamePhase: "peeking",
          canActNow: false,
          isPeekingTurn: true,
          isCurrentPlayer: false,
          cardIsFaceUp: false,
          peekedCount: 1,
        })
      ).toBe(true);
    });

    it("returns false during peeking when already peeked 2 cards", () => {
      expect(
        getCardInteractivity({
          gamePhase: "peeking",
          canActNow: false,
          isPeekingTurn: true,
          isCurrentPlayer: false,
          cardIsFaceUp: false,
          peekedCount: 2,
        })
      ).toBe(false);
    });

    it("returns false during peeking for already face-up cards", () => {
      expect(
        getCardInteractivity({
          gamePhase: "peeking",
          canActNow: false,
          isPeekingTurn: true,
          isCurrentPlayer: false,
          cardIsFaceUp: true,
          peekedCount: 0,
        })
      ).toBe(false);
    });

    it("returns false during peeking when not isPeekingTurn", () => {
      expect(
        getCardInteractivity({
          gamePhase: "peeking",
          canActNow: false,
          isPeekingTurn: false,
          isCurrentPlayer: false,
          cardIsFaceUp: false,
          peekedCount: 0,
        })
      ).toBe(false);
    });

    it("returns true during holding_card for current player", () => {
      expect(
        getCardInteractivity({
          gamePhase: "holding_card",
          canActNow: false,
          isPeekingTurn: false,
          isCurrentPlayer: true,
          cardIsFaceUp: false,
          peekedCount: 0,
        })
      ).toBe(true);
    });

    it("returns false during holding_card for non-current player", () => {
      expect(
        getCardInteractivity({
          gamePhase: "holding_card",
          canActNow: false,
          isPeekingTurn: false,
          isCurrentPlayer: false,
          cardIsFaceUp: false,
          peekedCount: 0,
        })
      ).toBe(false);
    });

    it("returns true during peek_1 when canActNow", () => {
      expect(
        getCardInteractivity({
          gamePhase: "action_peek_1",
          canActNow: true,
          isPeekingTurn: false,
          isCurrentPlayer: false,
          cardIsFaceUp: false,
          peekedCount: 0,
        })
      ).toBe(true);
    });

    it("returns true during swap_2 phases when canActNow", () => {
      expect(
        getCardInteractivity({
          gamePhase: "action_swap_2_select_1",
          canActNow: true,
          isPeekingTurn: false,
          isCurrentPlayer: false,
          cardIsFaceUp: false,
          peekedCount: 0,
        })
      ).toBe(true);

      expect(
        getCardInteractivity({
          gamePhase: "action_swap_2_select_2",
          canActNow: true,
          isPeekingTurn: false,
          isCurrentPlayer: false,
          cardIsFaceUp: false,
          peekedCount: 0,
        })
      ).toBe(true);
    });

    it("returns false during take_2 (not opponent-targetable)", () => {
      expect(
        getCardInteractivity({
          gamePhase: "action_take_2",
          canActNow: true,
          isPeekingTurn: false,
          isCurrentPlayer: false,
          cardIsFaceUp: false,
          peekedCount: 0,
        })
      ).toBe(false);
    });

    it("returns false during playing phase", () => {
      expect(
        getCardInteractivity({
          gamePhase: "playing",
          canActNow: true,
          isPeekingTurn: false,
          isCurrentPlayer: false,
          cardIsFaceUp: false,
          peekedCount: 0,
        })
      ).toBe(false);
    });
  });

  describe("shouldPulseCard", () => {
    it("returns true during peek_1 for face-down cards when canActNow", () => {
      expect(
        shouldPulseCard({
          gamePhase: "action_peek_1",
          canActNow: true,
          isPeekingTurn: false,
          cardIsFaceUp: false,
          peekedCount: 0,
        })
      ).toBe(true);
    });

    it("returns false during peek_1 for face-up cards", () => {
      expect(
        shouldPulseCard({
          gamePhase: "action_peek_1",
          canActNow: true,
          isPeekingTurn: false,
          cardIsFaceUp: true,
          peekedCount: 0,
        })
      ).toBe(false);
    });

    it("returns false during peek_1 when cannot act", () => {
      expect(
        shouldPulseCard({
          gamePhase: "action_peek_1",
          canActNow: false,
          isPeekingTurn: false,
          cardIsFaceUp: false,
          peekedCount: 0,
        })
      ).toBe(false);
    });

    it("returns true during swap_2 phases for face-down cards when canActNow", () => {
      expect(
        shouldPulseCard({
          gamePhase: "action_swap_2_select_1",
          canActNow: true,
          isPeekingTurn: false,
          cardIsFaceUp: false,
          peekedCount: 0,
        })
      ).toBe(true);

      expect(
        shouldPulseCard({
          gamePhase: "action_swap_2_select_2",
          canActNow: true,
          isPeekingTurn: false,
          cardIsFaceUp: false,
          peekedCount: 0,
        })
      ).toBe(true);
    });

    it("returns true during peeking for unpeeked cards when isPeekingTurn", () => {
      expect(
        shouldPulseCard({
          gamePhase: "peeking",
          canActNow: false,
          isPeekingTurn: true,
          cardIsFaceUp: false,
          peekedCount: 0,
        })
      ).toBe(true);

      expect(
        shouldPulseCard({
          gamePhase: "peeking",
          canActNow: false,
          isPeekingTurn: true,
          cardIsFaceUp: false,
          peekedCount: 1,
        })
      ).toBe(true);
    });

    it("returns false during peeking when already peeked 2 cards", () => {
      expect(
        shouldPulseCard({
          gamePhase: "peeking",
          canActNow: false,
          isPeekingTurn: true,
          cardIsFaceUp: false,
          peekedCount: 2,
        })
      ).toBe(false);
    });

    it("returns false during playing phase", () => {
      expect(
        shouldPulseCard({
          gamePhase: "playing",
          canActNow: true,
          isPeekingTurn: false,
          cardIsFaceUp: false,
          peekedCount: 0,
        })
      ).toBe(false);
    });

    it("returns false during take_2 phase", () => {
      expect(
        shouldPulseCard({
          gamePhase: "action_take_2",
          canActNow: true,
          isPeekingTurn: false,
          cardIsFaceUp: false,
          peekedCount: 0,
        })
      ).toBe(false);
    });
  });

  describe("integration: hotseat mode scenarios", () => {
    it("allows player 1 to peek any card during peek_1 in hotseat", () => {
      const gamePhase: GamePhase = "action_peek_1";
      const gameMode = "hotseat";
      const activePlayerId = "p1";
      const myPlayerId = "p1";

      const canAct = canActNow(gameMode, activePlayerId, myPlayerId);
      expect(canAct).toBe(true);

      // can click on opponent's card
      expect(
        shouldAllowOpponentCardClick({
          isOpponent: true,
          gamePhase,
          canActNow: canAct,
          isPeekingTurn: false,
          isCurrentPlayer: false,
        })
      ).toBe(true);
    });

    it("allows any player to act in hotseat during swap_2", () => {
      const gamePhase: GamePhase = "action_swap_2_select_1";
      const gameMode = "hotseat";

      // even if active player is different from my player
      const canAct = canActNow(gameMode, "p2", "p1");
      expect(canAct).toBe(true);

      expect(
        shouldAllowOpponentCardClick({
          isOpponent: true,
          gamePhase,
          canActNow: canAct,
          isPeekingTurn: false,
          isCurrentPlayer: false,
        })
      ).toBe(true);
    });
  });

  describe("integration: solo mode scenarios", () => {
    it("allows human to peek any card during peek_1 in solo mode", () => {
      const gamePhase: GamePhase = "action_peek_1";
      const gameMode = "solo";
      const activePlayerId = "human";
      const myPlayerId = "human";

      const canAct = canActNow(gameMode, activePlayerId, myPlayerId);
      expect(canAct).toBe(true);

      expect(
        shouldAllowOpponentCardClick({
          isOpponent: true,
          gamePhase,
          canActNow: canAct,
          isPeekingTurn: false,
          isCurrentPlayer: false,
        })
      ).toBe(true);
    });

    it("blocks human from clicking during bot's turn in solo mode", () => {
      const gamePhase: GamePhase = "action_peek_1";
      const gameMode = "solo";
      const activePlayerId = "bot";
      const myPlayerId = "human";

      const canAct = canActNow(gameMode, activePlayerId, myPlayerId);
      expect(canAct).toBe(false);

      expect(
        shouldAllowOpponentCardClick({
          isOpponent: true,
          gamePhase,
          canActNow: canAct,
          isPeekingTurn: false,
          isCurrentPlayer: false,
        })
      ).toBe(false);
    });
  });

  describe("integration: online mode scenarios", () => {
    it("allows local player to act during their turn in online mode", () => {
      const gamePhase: GamePhase = "action_swap_2_select_2";
      const gameMode = "online";
      const activePlayerId = "p1";
      const myPlayerId = "p1";

      const canAct = canActNow(gameMode, activePlayerId, myPlayerId);
      expect(canAct).toBe(true);

      expect(
        shouldAllowOpponentCardClick({
          isOpponent: true,
          gamePhase,
          canActNow: canAct,
          isPeekingTurn: false,
          isCurrentPlayer: false,
        })
      ).toBe(true);
    });

    it("blocks local player from acting during opponent's turn in online mode", () => {
      const gamePhase: GamePhase = "action_peek_1";
      const gameMode = "online";
      const activePlayerId = "p2";
      const myPlayerId = "p1";

      const canAct = canActNow(gameMode, activePlayerId, myPlayerId);
      expect(canAct).toBe(false);

      expect(
        shouldAllowOpponentCardClick({
          isOpponent: true,
          gamePhase,
          canActNow: canAct,
          isPeekingTurn: false,
          isCurrentPlayer: false,
        })
      ).toBe(false);
    });
  });
});

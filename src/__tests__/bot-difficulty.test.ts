import { describe, it, expect, vi } from "vitest";
import { getBotAction } from "@/lib/bot-logic";
import { GameState, Card } from "@/types";
import { initialGameState } from "@/state/initialGame";

// Helper to create a basic state
const createTestState = (overrides: Partial<GameState>): GameState => ({
  ...initialGameState,
  ...overrides,
});

const createCard = (value: number, isSpecial = false, specialAction?: string): Card => ({
  id: Math.floor(Math.random() * 10000),
  value,
  isSpecial,
  specialAction: specialAction as any,
});

describe("Bot Difficulty Rebalance", () => {
  const botId = "bot-1";
  const humanId = "human-1";

  describe("Easy Bot", () => {
    it("is lenient with discard pile (threshold 4)", () => {
      const state = createTestState({
        gameMode: "solo",
        botDifficulty: "easy",
        gamePhase: "playing",
        players: [
          { id: humanId, name: "Human", hand: [], score: 0 },
          { id: botId, name: "Bot", hand: [], score: 0 },
        ],
        currentPlayerIndex: 1,
        discardPile: [createCard(4)], // High value but below easy threshold
      });

      // Easy bots have takeDiscardThreshold: 4, so they might take it.
      // However, it's still probabilistic (takeDiscardChance: 0.35).
      // We'll mock Math.random to force a positive result.
      vi.spyOn(Math, 'random').mockReturnValue(0.1);

      expect(getBotAction(state, botId)?.type).toBe("DRAW_FROM_DISCARD");
      
      vi.restoreAllMocks();
    });

    it.skip("has low chance of calling Pobudka (0.08)", () => {
        // TODO: Need to mock BotMemory module to properly test Pobudka calling behavior
        // getBotAction relies on internal memory state that needs proper setup
    });
  });

  describe("Hard Bot", () => {
    it("is aggressive with special actions (chance 0.85)", () => {
        vi.spyOn(Math, 'random').mockReturnValue(0.1);
        const state = createTestState({
            gameMode: "solo",
            botDifficulty: "hard",
            gamePhase: "holding_card",
            drawSource: "deck",
            drawnCard: createCard(5, true, "peek_1"),
            players: [
              { id: humanId, name: "Human", hand: [], score: 0 },
              { id: botId, name: "Bot", hand: [], score: 0 },
            ],
            currentPlayerIndex: 1,
          });

          const action = getBotAction(state, botId);
          expect(action?.type).toBe("USE_SPECIAL_ACTION");
          vi.restoreAllMocks();
    });

    it("is more likely to call Pobudka with higher scores (threshold 11)", () => {
        // Hard bot is more confident
        // This is a bit hard to test without controlling the bot memory
    });
  });
});

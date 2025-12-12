import { describe, it, expect, beforeEach } from 'vitest';
import { gameReducer, getVisibleStateForViewer, sanitizeStateForSync, mergePeekedHandState } from '@/state/gameReducer';
import { initialGameState } from '@/state/initialGame';
import { GameState, Player, Card } from '@/types';

// Helper to create a test player
const createTestPlayer = (id: string, name: string, cards: Card[]): Player => ({
  id,
  name,
  hand: cards.map(card => ({ card, isFaceUp: false, hasBeenPeeked: false })),
  score: 0,
});

// Helper to create a test card
const createCard = (id: number, value: number, isSpecial = false, specialAction?: Card['specialAction']): Card => ({
  id,
  value,
  isSpecial,
  specialAction,
});

describe('gameReducer', () => {
  let baseState: GameState;

  beforeEach(() => {
    baseState = {
      ...initialGameState,
      gameMode: 'hotseat',
      gamePhase: 'playing',
      players: [
        createTestPlayer('p1', 'Alice', [
          createCard(1, 2),
          createCard(2, 5),
          createCard(3, 3),
          createCard(4, 7),
        ]),
        createTestPlayer('p2', 'Bob', [
          createCard(5, 1),
          createCard(6, 4),
          createCard(7, 6),
          createCard(8, 8),
        ]),
      ],
      drawPile: [createCard(9, 0), createCard(10, 9)],
      discardPile: [createCard(11, 5)],
      currentPlayerIndex: 0,
    };
  });

  describe('SET_STATE action', () => {
    it('replaces the entire state', () => {
      const newState: GameState = { ...baseState, actionMessage: 'Test message' };
      const result = gameReducer(baseState, { type: 'SET_STATE', payload: newState });
      expect(result.actionMessage).toBe('Test message');
    });
  });

  describe('ADD_CHAT_MESSAGE action', () => {
    it('appends a new chat message', () => {
      const message = {
        id: 'msg1',
        senderId: 'p1',
        senderName: 'Alice',
        message: 'Hello!',
        timestamp: Date.now(),
      };
      
      const result = gameReducer(baseState, { type: 'ADD_CHAT_MESSAGE', payload: message });
      expect(result.chatMessages).toHaveLength(1);
      expect(result.chatMessages[0]).toEqual(message);
    });

    it('preserves existing messages when adding new one', () => {
      const existingMessage = {
        id: 'msg0',
        senderId: 'p2',
        senderName: 'Bob',
        message: 'Hi there',
        timestamp: Date.now() - 1000,
      };
      
      const stateWithMessage = { ...baseState, chatMessages: [existingMessage] };
      
      const newMessage = {
        id: 'msg1',
        senderId: 'p1',
        senderName: 'Alice',
        message: 'Hello!',
        timestamp: Date.now(),
      };
      
      const result = gameReducer(stateWithMessage, { type: 'ADD_CHAT_MESSAGE', payload: newMessage });
      expect(result.chatMessages).toHaveLength(2);
      expect(result.chatMessages[0]).toEqual(existingMessage);
      expect(result.chatMessages[1]).toEqual(newMessage);
    });
  });

  describe('SET_CHAT_MESSAGES action', () => {
    it('replaces all chat messages', () => {
      const messages = [
        { id: 'msg1', senderId: 'p1', senderName: 'Alice', message: 'One', timestamp: 1 },
        { id: 'msg2', senderId: 'p2', senderName: 'Bob', message: 'Two', timestamp: 2 },
      ];
      
      const result = gameReducer(baseState, { type: 'SET_CHAT_MESSAGES', payload: messages });
      expect(result.chatMessages).toEqual(messages);
    });
  });

  describe('PEEK_CARD action', () => {
    beforeEach(() => {
      baseState = {
        ...baseState,
        gamePhase: 'peeking',
        peekingState: { playerIndex: 0, peekedCount: 0 },
      };
    });

    it('allows peeking a card during peeking phase', () => {
      const result = gameReducer(baseState, {
        type: 'PROCESS_ACTION',
        payload: { action: { type: 'PEEK_CARD', payload: { playerId: 'p1', cardIndex: 0 } } },
      });

      expect(result.players[0].hand[0].isFaceUp).toBe(true);
      expect(result.players[0].hand[0].hasBeenPeeked).toBe(true);
      expect(result.peekingState?.peekedCount).toBe(1);
    });

    it('ignores peek when not in peeking phase', () => {
      const playingState = { ...baseState, gamePhase: 'playing' as const };
      const result = gameReducer(playingState, {
        type: 'PROCESS_ACTION',
        payload: { action: { type: 'PEEK_CARD', payload: { playerId: 'p1', cardIndex: 0 } } },
      });

      expect(result).toEqual(playingState);
    });

    it('ignores peek when player tries to peek opponent card', () => {
      const result = gameReducer(baseState, {
        type: 'PROCESS_ACTION',
        payload: { action: { type: 'PEEK_CARD', payload: { playerId: 'p2', cardIndex: 0 } } },
      });

      expect(result).toEqual(baseState);
    });

    it('ignores peek when card is already face up', () => {
      baseState.players[0].hand[0].isFaceUp = true;
      const result = gameReducer(baseState, {
        type: 'PROCESS_ACTION',
        payload: { action: { type: 'PEEK_CARD', payload: { playerId: 'p1', cardIndex: 0 } } },
      });

      expect(result).toEqual(baseState);
    });

    it('ignores peek when already peeked 2 cards', () => {
      const stateWith2Peeks = {
        ...baseState,
        peekingState: { playerIndex: 0, peekedCount: 2 },
      };
      const result = gameReducer(stateWith2Peeks, {
        type: 'PROCESS_ACTION',
        payload: { action: { type: 'PEEK_CARD', payload: { playerId: 'p1', cardIndex: 0 } } },
      });

      expect(result).toEqual(stateWith2Peeks);
    });
  });

  describe('FINISH_PEEKING action', () => {
    it('moves to next player when one finishes peeking', () => {
      const state: GameState = {
        ...baseState,
        gamePhase: 'peeking',
        peekingState: { playerIndex: 0, peekedCount: 2 },
      };

      const result = gameReducer(state, {
        type: 'PROCESS_ACTION',
        payload: { action: { type: 'FINISH_PEEKING' } },
      });

      expect(result.peekingState?.playerIndex).toBe(1);
      expect(result.peekingState?.peekedCount).toBe(0);
      expect(result.gamePhase).toBe('peeking');
    });

    it('starts playing phase when all players finish peeking', () => {
      const state: GameState = {
        ...baseState,
        gamePhase: 'peeking',
        peekingState: { playerIndex: 1, peekedCount: 2 },
      };

      const result = gameReducer(state, {
        type: 'PROCESS_ACTION',
        payload: { action: { type: 'FINISH_PEEKING' } },
      });

      expect(result.gamePhase).toBe('playing');
      expect(result.currentPlayerIndex).toBe(0);
      expect(result.peekingState).toBeUndefined();
    });

    it('hides cards after finishing peeking', () => {
      const state: GameState = {
        ...baseState,
        gamePhase: 'peeking',
        peekingState: { playerIndex: 0, peekedCount: 2 },
      };
      state.players[0].hand[0].isFaceUp = true;
      state.players[0].hand[1].isFaceUp = true;

      const result = gameReducer(state, {
        type: 'PROCESS_ACTION',
        payload: { action: { type: 'FINISH_PEEKING' } },
      });

      expect(result.players[0].hand[0].isFaceUp).toBe(false);
      expect(result.players[0].hand[1].isFaceUp).toBe(false);
    });

    it('ignores when not in peeking phase', () => {
      const result = gameReducer(baseState, {
        type: 'PROCESS_ACTION',
        payload: { action: { type: 'FINISH_PEEKING' } },
      });

      expect(result).toEqual(baseState);
    });

    it('ignores when player has not peeked 2 cards', () => {
      const state: GameState = {
        ...baseState,
        gamePhase: 'peeking',
        peekingState: { playerIndex: 0, peekedCount: 1 },
      };

      const result = gameReducer(state, {
        type: 'PROCESS_ACTION',
        payload: { action: { type: 'FINISH_PEEKING' } },
      });

      expect(result).toEqual(state);
    });
  });

  describe('DRAW_FROM_DECK action', () => {
    it('draws a card from deck during playing phase', () => {
      const result = gameReducer(baseState, {
        type: 'PROCESS_ACTION',
        payload: { action: { type: 'DRAW_FROM_DECK' } },
      });

      expect(result.drawnCard).toEqual(createCard(10, 9));
      expect(result.drawPile).toHaveLength(1);
      expect(result.gamePhase).toBe('holding_card');
      expect(result.drawSource).toBe('deck');
    });

    it('ignores draw when not in playing phase', () => {
      const state = { ...baseState, gamePhase: 'holding_card' as const };
      const result = gameReducer(state, {
        type: 'PROCESS_ACTION',
        payload: { action: { type: 'DRAW_FROM_DECK' } },
      });

      expect(result).toEqual(state);
    });

    it('ends round when deck is empty (no reshuffle)', () => {
      const stateWithEmptyDeck: GameState = {
        ...baseState,
        drawPile: [],
        discardPile: [
          createCard(11, 5),
          createCard(12, 3),
          createCard(13, 7),
        ],
      };

      const result = gameReducer(stateWithEmptyDeck, {
        type: 'PROCESS_ACTION',
        payload: { action: { type: 'DRAW_FROM_DECK' } },
      });

      expect(result.gamePhase).toBe('round_end');
      expect(result.drawnCard).toBeUndefined();
    });

    it('ends round when deck and discard are exhausted', () => {
      const stateWithNoCards: GameState = {
        ...baseState,
        drawPile: [],
        discardPile: [createCard(11, 5)], // Only 1 card, can't reshuffle
      };

      const result = gameReducer(stateWithNoCards, {
        type: 'PROCESS_ACTION',
        payload: { action: { type: 'DRAW_FROM_DECK' } },
      });

      expect(result.gamePhase).toBe('round_end');
    });

    it('ends round when deck is empty even with minimal discard', () => {
      const stateWithMinimalDiscard: GameState = {
        ...baseState,
        drawPile: [],
        discardPile: [createCard(11, 5), createCard(12, 3)],
      };

      const result = gameReducer(stateWithMinimalDiscard, {
        type: 'PROCESS_ACTION',
        payload: { action: { type: 'DRAW_FROM_DECK' } },
      });

      expect(result.gamePhase).toBe('round_end');
      expect(result.drawnCard).toBeUndefined();
    });

    it('sets lastMove with draw action', () => {
      const result = gameReducer(baseState, {
        type: 'PROCESS_ACTION',
        payload: { action: { type: 'DRAW_FROM_DECK' } },
      });

      expect(result.lastMove?.action).toBe('draw');
      expect(result.lastMove?.source).toBe('deck');
      expect(result.lastMove?.playerId).toBe('p1');
    });
  });

  describe('DRAW_FROM_DISCARD action', () => {
    it('draws a card from discard pile during playing phase', () => {
      const result = gameReducer(baseState, {
        type: 'PROCESS_ACTION',
        payload: { action: { type: 'DRAW_FROM_DISCARD' } },
      });

      expect(result.drawnCard).toEqual(createCard(11, 5));
      expect(result.discardPile).toHaveLength(0);
      expect(result.gamePhase).toBe('holding_card');
      expect(result.drawSource).toBe('discard');
    });

    it('ignores draw when not in playing phase', () => {
      const state = { ...baseState, gamePhase: 'holding_card' as const };
      const result = gameReducer(state, {
        type: 'PROCESS_ACTION',
        payload: { action: { type: 'DRAW_FROM_DISCARD' } },
      });

      expect(result).toEqual(state);
    });

    it('ignores draw when discard pile is empty', () => {
      const stateWithEmptyDiscard = { ...baseState, discardPile: [] };
      const result = gameReducer(stateWithEmptyDiscard, {
        type: 'PROCESS_ACTION',
        payload: { action: { type: 'DRAW_FROM_DISCARD' } },
      });

      expect(result).toEqual(stateWithEmptyDiscard);
    });
  });

  describe('DISCARD_HELD_CARD action', () => {
    it('discards held card and advances turn', () => {
      const stateHolding: GameState = {
        ...baseState,
        gamePhase: 'holding_card',
        drawnCard: createCard(20, 4),
        drawSource: 'deck',
      };

      const result = gameReducer(stateHolding, {
        type: 'PROCESS_ACTION',
        payload: { action: { type: 'DISCARD_HELD_CARD' } },
      });

      expect(result.discardPile).toContainEqual(createCard(20, 4));
      expect(result.drawnCard).toBeNull();
      expect(result.currentPlayerIndex).toBe(1);
      expect(result.gamePhase).toBe('playing');
    });

    it('ignores discard when not holding a card', () => {
      const result = gameReducer(baseState, {
        type: 'PROCESS_ACTION',
        payload: { action: { type: 'DISCARD_HELD_CARD' } },
      });

      expect(result).toEqual(baseState);
    });

    it('ignores discard when card was drawn from discard pile', () => {
      const stateHoldingFromDiscard: GameState = {
        ...baseState,
        gamePhase: 'holding_card',
        drawnCard: createCard(20, 4),
        drawSource: 'discard',
      };

      const result = gameReducer(stateHoldingFromDiscard, {
        type: 'PROCESS_ACTION',
        payload: { action: { type: 'DISCARD_HELD_CARD' } },
      });

      expect(result).toEqual(stateHoldingFromDiscard);
    });

    it('ignores discard when card was from take_2 action', () => {
      const stateHoldingFromTake2: GameState = {
        ...baseState,
        gamePhase: 'holding_card',
        drawnCard: createCard(20, 4),
        drawSource: 'take2',
      };

      const result = gameReducer(stateHoldingFromTake2, {
        type: 'PROCESS_ACTION',
        payload: { action: { type: 'DISCARD_HELD_CARD' } },
      });

      expect(result).toEqual(stateHoldingFromTake2);
    });
  });

  describe('SWAP_HELD_CARD action', () => {
    it('swaps held card with player hand card', () => {
      const stateHolding: GameState = {
        ...baseState,
        gamePhase: 'holding_card',
        drawnCard: createCard(20, 4),
        drawSource: 'deck',
      };

      const result = gameReducer(stateHolding, {
        type: 'PROCESS_ACTION',
        payload: { action: { type: 'SWAP_HELD_CARD', payload: { cardIndex: 0 } } },
      });

      // The drawn card should now be in player's hand
      expect(result.players[0].hand[0].card).toEqual(createCard(20, 4));
      // The old card should be in discard
      expect(result.discardPile).toContainEqual(createCard(1, 2));
      expect(result.drawnCard).toBeNull();
      expect(result.currentPlayerIndex).toBe(1);
    });

    it('ignores swap when not holding a card', () => {
      const result = gameReducer(baseState, {
        type: 'PROCESS_ACTION',
        payload: { action: { type: 'SWAP_HELD_CARD', payload: { cardIndex: 0 } } },
      });

      expect(result).toEqual(baseState);
    });
  });

  describe('USE_SPECIAL_ACTION action', () => {
    it('activates take_2 special action', () => {
      const stateWithSpecial: GameState = {
        ...baseState,
        gamePhase: 'holding_card',
        drawnCard: createCard(20, 5, true, 'take_2'),
        drawSource: 'deck',
      };

      const result = gameReducer(stateWithSpecial, {
        type: 'PROCESS_ACTION',
        payload: { action: { type: 'USE_SPECIAL_ACTION' } },
      });

      expect(result.gamePhase).toBe('action_take_2');
      expect(result.tempCards).toBeDefined();
      expect(result.tempCards).toHaveLength(2);
      expect(result.discardPile).toContainEqual(createCard(20, 5, true, 'take_2'));
    });

    it('take_2 works with drawSource take2', () => {
      const stateWithSpecial: GameState = {
        ...baseState,
        gamePhase: 'holding_card',
        drawnCard: createCard(20, 5, true, 'take_2'),
        drawSource: 'take2',
      };

      const result = gameReducer(stateWithSpecial, {
        type: 'PROCESS_ACTION',
        payload: { action: { type: 'USE_SPECIAL_ACTION' } },
      });

      expect(result.gamePhase).toBe('action_take_2');
    });

    it('take_2 handles deck with fewer than 2 cards', () => {
      const stateWithFewCards: GameState = {
        ...baseState,
        gamePhase: 'holding_card',
        drawnCard: createCard(20, 5, true, 'take_2'),
        drawSource: 'deck',
        drawPile: [createCard(30, 1)], // Only 1 card
      };

      const result = gameReducer(stateWithFewCards, {
        type: 'PROCESS_ACTION',
        payload: { action: { type: 'USE_SPECIAL_ACTION' } },
      });

      expect(result.gamePhase).toBe('action_take_2');
      expect(result.tempCards).toHaveLength(1);
    });

    it('activates peek_1 special action', () => {
      const stateWithSpecial: GameState = {
        ...baseState,
        gamePhase: 'holding_card',
        drawnCard: createCard(20, 6, true, 'peek_1'),
        drawSource: 'deck',
      };

      const result = gameReducer(stateWithSpecial, {
        type: 'PROCESS_ACTION',
        payload: { action: { type: 'USE_SPECIAL_ACTION' } },
      });

      expect(result.gamePhase).toBe('action_peek_1');
    });

    it('activates swap_2 special action', () => {
      const stateWithSpecial: GameState = {
        ...baseState,
        gamePhase: 'holding_card',
        drawnCard: createCard(20, 7, true, 'swap_2'),
        drawSource: 'deck',
      };

      const result = gameReducer(stateWithSpecial, {
        type: 'PROCESS_ACTION',
        payload: { action: { type: 'USE_SPECIAL_ACTION' } },
      });

      expect(result.gamePhase).toBe('action_swap_2_select_1');
    });

    it('ignores when not holding a special card', () => {
      const stateWithNormal: GameState = {
        ...baseState,
        gamePhase: 'holding_card',
        drawnCard: createCard(20, 5, false),
        drawSource: 'deck',
      };

      const result = gameReducer(stateWithNormal, {
        type: 'PROCESS_ACTION',
        payload: { action: { type: 'USE_SPECIAL_ACTION' } },
      });

      expect(result).toEqual(stateWithNormal);
    });

    it('ignores when card was drawn from discard', () => {
      const stateWithSpecialFromDiscard: GameState = {
        ...baseState,
        gamePhase: 'holding_card',
        drawnCard: createCard(20, 5, true, 'take_2'),
        drawSource: 'discard',
      };

      const result = gameReducer(stateWithSpecialFromDiscard, {
        type: 'PROCESS_ACTION',
        payload: { action: { type: 'USE_SPECIAL_ACTION' } },
      });

      expect(result).toEqual(stateWithSpecialFromDiscard);
    });

    it('ignores when not in holding_card phase', () => {
      const stateNotHolding: GameState = {
        ...baseState,
        gamePhase: 'playing',
        drawnCard: createCard(20, 5, true, 'take_2'),
        drawSource: 'deck',
      };

      const result = gameReducer(stateNotHolding, {
        type: 'PROCESS_ACTION',
        payload: { action: { type: 'USE_SPECIAL_ACTION' } },
      });

      expect(result).toEqual(stateNotHolding);
    });

    it('ignores when drawnCard is null', () => {
      const stateNoDraw: GameState = {
        ...baseState,
        gamePhase: 'holding_card',
        drawnCard: null,
        drawSource: 'deck',
      };

      const result = gameReducer(stateNoDraw, {
        type: 'PROCESS_ACTION',
        payload: { action: { type: 'USE_SPECIAL_ACTION' } },
      });

      expect(result).toEqual(stateNoDraw);
    });
  });

  describe('ACTION_PEEK_1_SELECT action', () => {
    it('marks selected card as peeked and advances turn', () => {
      const stateInPeek: GameState = {
        ...baseState,
        gamePhase: 'action_peek_1',
        drawnCard: createCard(20, 6, true, 'peek_1'),
        drawSource: 'deck',
      };

      const result = gameReducer(stateInPeek, {
        type: 'PROCESS_ACTION',
        payload: { action: { type: 'ACTION_PEEK_1_SELECT', payload: { playerId: 'p2', cardIndex: 0 } } },
      });

      expect(result.players[1].hand[0].hasBeenPeeked).toBe(true);
      expect(result.discardPile).toContainEqual(createCard(20, 6, true, 'peek_1'));
      expect(result.currentPlayerIndex).toBe(1);
      expect(result.gamePhase).toBe('playing');
    });

    it('ignores when not in action_peek_1 phase', () => {
      const result = gameReducer(baseState, {
        type: 'PROCESS_ACTION',
        payload: { action: { type: 'ACTION_PEEK_1_SELECT', payload: { playerId: 'p2', cardIndex: 0 } } },
      });

      expect(result).toEqual(baseState);
    });

    it('returns state when drawnCard is null', () => {
      const stateInPeekNoDraw: GameState = {
        ...baseState,
        gamePhase: 'action_peek_1',
        drawnCard: null,
        drawSource: 'deck',
      };

      const result = gameReducer(stateInPeekNoDraw, {
        type: 'PROCESS_ACTION',
        payload: { action: { type: 'ACTION_PEEK_1_SELECT', payload: { playerId: 'p2', cardIndex: 0 } } },
      });

      expect(result).toEqual(stateInPeekNoDraw);
    });
  });

  describe('ACTION_SWAP_2_SELECT action', () => {
    it('selects first card for swap', () => {
      const stateInSwap: GameState = {
        ...baseState,
        gamePhase: 'action_swap_2_select_1',
        drawnCard: createCard(20, 7, true, 'swap_2'),
        drawSource: 'deck',
      };

      const result = gameReducer(stateInSwap, {
        type: 'PROCESS_ACTION',
        payload: { action: { type: 'ACTION_SWAP_2_SELECT', payload: { playerId: 'p1', cardIndex: 0 } } },
      });

      expect(result.gamePhase).toBe('action_swap_2_select_2');
      expect(result.swapState?.card1).toEqual({ playerId: 'p1', cardIndex: 0 });
    });

    it('completes swap with second card selection', () => {
      const stateInSwap2: GameState = {
        ...baseState,
        gamePhase: 'action_swap_2_select_2',
        drawnCard: createCard(20, 7, true, 'swap_2'),
        drawSource: 'deck',
        swapState: { card1: { playerId: 'p1', cardIndex: 0 } },
      };

      const originalP1Card = stateInSwap2.players[0].hand[0].card;
      const originalP2Card = stateInSwap2.players[1].hand[1].card;

      const result = gameReducer(stateInSwap2, {
        type: 'PROCESS_ACTION',
        payload: { action: { type: 'ACTION_SWAP_2_SELECT', payload: { playerId: 'p2', cardIndex: 1 } } },
      });

      expect(result.players[0].hand[0].card).toEqual(originalP2Card);
      expect(result.players[1].hand[1].card).toEqual(originalP1Card);
      expect(result.discardPile).toContainEqual(createCard(20, 7, true, 'swap_2'));
      expect(result.currentPlayerIndex).toBe(1);
      expect(result.swapState).toBeUndefined();
    });

    it('ignores when not in swap phase', () => {
      const result = gameReducer(baseState, {
        type: 'PROCESS_ACTION',
        payload: { action: { type: 'ACTION_SWAP_2_SELECT', payload: { playerId: 'p1', cardIndex: 0 } } },
      });

      expect(result).toEqual(baseState);
    });

    it('returns state when swapState is missing in phase 2', () => {
      const stateInSwap2NoState: GameState = {
        ...baseState,
        gamePhase: 'action_swap_2_select_2',
        drawnCard: createCard(20, 7, true, 'swap_2'),
        drawSource: 'deck',
        // swapState is missing
      };

      const result = gameReducer(stateInSwap2NoState, {
        type: 'PROCESS_ACTION',
        payload: { action: { type: 'ACTION_SWAP_2_SELECT', payload: { playerId: 'p2', cardIndex: 1 } } },
      });

      expect(result).toEqual(stateInSwap2NoState);
    });

    it('returns state when player not found', () => {
      const stateInSwap2: GameState = {
        ...baseState,
        gamePhase: 'action_swap_2_select_2',
        drawnCard: createCard(20, 7, true, 'swap_2'),
        drawSource: 'deck',
        swapState: { card1: { playerId: 'unknown', cardIndex: 0 } },
      };

      const result = gameReducer(stateInSwap2, {
        type: 'PROCESS_ACTION',
        payload: { action: { type: 'ACTION_SWAP_2_SELECT', payload: { playerId: 'p2', cardIndex: 1 } } },
      });

      expect(result).toEqual(stateInSwap2);
    });

    it('returns state when drawnCard is null in phase 2', () => {
      const stateInSwap2NoDraw: GameState = {
        ...baseState,
        gamePhase: 'action_swap_2_select_2',
        drawnCard: null,
        drawSource: 'deck',
        swapState: { card1: { playerId: 'p1', cardIndex: 0 } },
      };

      const result = gameReducer(stateInSwap2NoDraw, {
        type: 'PROCESS_ACTION',
        payload: { action: { type: 'ACTION_SWAP_2_SELECT', payload: { playerId: 'p2', cardIndex: 1 } } },
      });

      expect(result).toEqual(stateInSwap2NoDraw);
    });
  });

  describe('ACTION_TAKE_2_CHOOSE action', () => {
    it('chooses one of the two cards and discards the other', () => {
      const chosenCard = createCard(30, 3);
      const otherCard = createCard(31, 8);
      const stateInTake2: GameState = {
        ...baseState,
        gamePhase: 'action_take_2',
        tempCards: [chosenCard, otherCard],
        drawnCard: null,
      };

      const result = gameReducer(stateInTake2, {
        type: 'PROCESS_ACTION',
        payload: { action: { type: 'ACTION_TAKE_2_CHOOSE', payload: { card: chosenCard } } },
      });

      expect(result.drawnCard).toEqual(chosenCard);
      expect(result.discardPile).toContainEqual(otherCard);
      expect(result.tempCards).toBeUndefined();
      expect(result.gamePhase).toBe('holding_card');
      expect(result.drawSource).toBe('take2');
    });

    it('ignores when not in action_take_2 phase', () => {
      const result = gameReducer(baseState, {
        type: 'PROCESS_ACTION',
        payload: { action: { type: 'ACTION_TAKE_2_CHOOSE', payload: { card: createCard(30, 3) } } },
      });

      expect(result).toEqual(baseState);
    });
  });

  describe('CALL_POBUDKA action', () => {
    it('ends round and calculates scores', () => {
      const result = gameReducer(baseState, {
        type: 'PROCESS_ACTION',
        payload: { action: { type: 'CALL_POBUDKA' } },
      });

      expect(result.gamePhase).toBe('round_end');
      expect(result.lastRoundScores).toBeDefined();
      expect(result.lastCallerId).toBe('p1');
    });

    it('applies 5-point penalty when caller does not have lowest score', () => {
      // p1 (caller) has hand sum: 2+5+3+7 = 17
      // p2 has hand sum: 1+4+6+8 = 19
      // p1 has lower score, so no penalty
      const result = gameReducer(baseState, {
        type: 'PROCESS_ACTION',
        payload: { action: { type: 'CALL_POBUDKA' } },
      });

      const p1RoundScore = result.lastRoundScores?.find(s => s.playerId === 'p1');
      expect(p1RoundScore?.penalty).toBe(0);
    });

    it('applies penalty when caller has higher score', () => {
      // Modify state so p1 has higher score
      const highScoreState: GameState = {
        ...baseState,
        players: [
          createTestPlayer('p1', 'Alice', [
            createCard(1, 9),
            createCard(2, 9),
            createCard(3, 9),
            createCard(4, 9), // Total: 36
          ]),
          createTestPlayer('p2', 'Bob', [
            createCard(5, 0),
            createCard(6, 0),
            createCard(7, 0),
            createCard(8, 0), // Total: 0
          ]),
        ],
      };

      const result = gameReducer(highScoreState, {
        type: 'PROCESS_ACTION',
        payload: { action: { type: 'CALL_POBUDKA' } },
      });

      const p1RoundScore = result.lastRoundScores?.find(s => s.playerId === 'p1');
      expect(p1RoundScore?.penalty).toBe(5);
    });

    it('ignores when not in playing phase', () => {
      const state = { ...baseState, gamePhase: 'holding_card' as const };
      const result = gameReducer(state, {
        type: 'PROCESS_ACTION',
        payload: { action: { type: 'CALL_POBUDKA' } },
      });

      expect(result).toEqual(state);
    });

    it('triggers game over when a player reaches 100 points', () => {
      const nearEndState: GameState = {
        ...baseState,
        players: [
          { ...baseState.players[0], score: 95 }, // Alice at 95, will get 17 more
          { ...baseState.players[1], score: 0 },
        ],
      };

      const result = gameReducer(nearEndState, {
        type: 'PROCESS_ACTION',
        payload: { action: { type: 'CALL_POBUDKA' } },
      });

      expect(result.gamePhase).toBe('game_over');
      expect(result.gameWinnerName).toBeDefined();
    });
  });

  describe('START_NEW_ROUND action', () => {
    it('starts a new round after round_end', () => {
      const roundEndState: GameState = {
        ...baseState,
        gamePhase: 'round_end',
        drawPile: [createCard(100, 1), createCard(101, 2), createCard(102, 3), createCard(103, 4), createCard(104, 5), createCard(105, 6), createCard(106, 7), createCard(107, 8), createCard(108, 9)],
        discardPile: [createCard(109, 0)],
      };

      const result = gameReducer(roundEndState, {
        type: 'PROCESS_ACTION',
        payload: { action: { type: 'START_NEW_ROUND' } },
      });

      expect(result.gamePhase).toBe('peeking');
      expect(result.peekingState).toEqual({ playerIndex: 1, peekedCount: 0, startIndex: 1 });
      expect(result.currentPlayerIndex).toBe(1);
      expect(result.startingPlayerIndex).toBe(1);
      expect(result.drawnCard).toBeNull();
      expect(result.tempCards).toBeUndefined();
      expect(result.swapState).toBeUndefined();
    });

    it('ignores when not in round_end phase', () => {
      const result = gameReducer(baseState, {
        type: 'PROCESS_ACTION',
        payload: { action: { type: 'START_NEW_ROUND' } },
      });

      expect(result).toEqual(baseState);
    });

    it('deals 4 cards to each player', () => {
      const roundEndState: GameState = {
        ...baseState,
        gamePhase: 'round_end',
        drawPile: Array.from({ length: 20 }, (_, i) => createCard(100 + i, i % 10)),
        discardPile: [createCard(200, 0)],
      };

      const result = gameReducer(roundEndState, {
        type: 'PROCESS_ACTION',
        payload: { action: { type: 'START_NEW_ROUND' } },
      });

      expect(result.players[0].hand).toHaveLength(4);
      expect(result.players[1].hand).toHaveLength(4);
      expect(result.discardPile).toHaveLength(1);
    });

    it('returns unchanged state when not enough cards to deal', () => {
      // Need 2 players * 4 cards + 1 discard = 9 cards minimum
      const roundEndState: GameState = {
        ...baseState,
        gamePhase: 'round_end',
        drawPile: [createCard(100, 1), createCard(101, 2)], // Only 2 cards
        discardPile: [createCard(200, 0)], // 1 card
        // Total: 3 cards + 8 player cards = 11, but we clear hands, so only 3 total
      };
      // Clear player hands so we only have 3 cards total
      roundEndState.players = roundEndState.players.map(p => ({ ...p, hand: [] }));

      const result = gameReducer(roundEndState, {
        type: 'PROCESS_ACTION',
        payload: { action: { type: 'START_NEW_ROUND' } },
      });

      // Should return unchanged state since we don't have enough cards
      expect(result).toEqual(roundEndState);
    });

    it('collects tempCards and drawnCard when starting new round', () => {
      const roundEndState: GameState = {
        ...baseState,
        gamePhase: 'round_end',
        drawPile: Array.from({ length: 10 }, (_, i) => createCard(100 + i, i % 10)),
        discardPile: [createCard(200, 0)],
        tempCards: [createCard(300, 5), createCard(301, 6)],
        drawnCard: createCard(400, 7),
      };

      const result = gameReducer(roundEndState, {
        type: 'PROCESS_ACTION',
        payload: { action: { type: 'START_NEW_ROUND' } },
      });

      expect(result.gamePhase).toBe('peeking');
      expect(result.tempCards).toBeUndefined();
      expect(result.drawnCard).toBeNull();
    });
  });

  describe('default case', () => {
    it('returns state unchanged for unknown action', () => {
      const result = gameReducer(baseState, {
        type: 'UNKNOWN_TYPE' as unknown as 'SET_STATE',
        payload: baseState,
      });

      expect(result).toEqual(baseState);
    });
  });
});

describe('getVisibleStateForViewer', () => {
  let baseState: GameState;

  beforeEach(() => {
    baseState = {
      ...initialGameState,
      gameMode: 'online',
      gamePhase: 'playing',
      players: [
        {
          id: 'p1',
          name: 'Alice',
          hand: [
            { card: createCard(1, 2), isFaceUp: true, hasBeenPeeked: true },
            { card: createCard(2, 5), isFaceUp: false, hasBeenPeeked: false },
          ],
          score: 0,
        },
        {
          id: 'p2',
          name: 'Bob',
          hand: [
            { card: createCard(3, 1), isFaceUp: true, hasBeenPeeked: true },
            { card: createCard(4, 4), isFaceUp: false, hasBeenPeeked: false },
          ],
          score: 0,
        },
      ],
      currentPlayerIndex: 0,
      drawnCard: createCard(5, 9),
    };
  });

  it('shows all cards face down for opponent (except their own)', () => {
    const visibleState = getVisibleStateForViewer(baseState, 'p1');
    
    // Alice (p1) should see her own cards as-is
    expect(visibleState.players[0].hand[0].isFaceUp).toBe(true);
    expect(visibleState.players[0].hand[0].hasBeenPeeked).toBe(true);
    
    // Bob (p2) cards should all be face down for Alice
    expect(visibleState.players[1].hand[0].isFaceUp).toBe(false);
    expect(visibleState.players[1].hand[0].hasBeenPeeked).toBe(true);
  });

  it('reveals all cards during round_end phase', () => {
    const endState = { ...baseState, gamePhase: 'round_end' as const };
    const visibleState = getVisibleStateForViewer(endState, 'p1');
    
    // Both players' cards should be visible
    expect(visibleState.players[0].hand[0].isFaceUp).toBe(true);
    expect(visibleState.players[1].hand[0].isFaceUp).toBe(true);
  });

  it('reveals all cards during game_over phase', () => {
    const endState = { ...baseState, gamePhase: 'game_over' as const };
    const visibleState = getVisibleStateForViewer(endState, 'p1');
    
    // Both players' cards should be visible
    expect(visibleState.players[0].hand[0].isFaceUp).toBe(true);
    expect(visibleState.players[1].hand[0].isFaceUp).toBe(true);
  });

  it('hides drawnCard from non-current player', () => {
    const visibleState = getVisibleStateForViewer(baseState, 'p2');
    
    // p2 is not the current player (currentPlayerIndex: 0 = p1)
    expect(visibleState.drawnCard).toBeNull();
  });

  it('shows drawnCard to current player', () => {
    const visibleState = getVisibleStateForViewer(baseState, 'p1');
    
    // p1 is the current player
    expect(visibleState.drawnCard).toEqual(createCard(5, 9));
  });

  it('returns full state if viewerId is null', () => {
    const visibleState = getVisibleStateForViewer(baseState, null);
    expect(visibleState).toEqual(baseState);
  });
});

describe('sanitizeStateForSync', () => {
  let baseState: GameState;

  beforeEach(() => {
    baseState = {
      ...initialGameState,
      gameMode: 'online',
      gamePhase: 'peeking',
      players: [
        {
          id: 'p1',
          name: 'Alice',
          hand: [
            { card: createCard(1, 2), isFaceUp: true, hasBeenPeeked: true },
            { card: createCard(2, 5), isFaceUp: false, hasBeenPeeked: false },
          ],
          score: 0,
        },
        {
          id: 'p2',
          name: 'Bob',
          hand: [
            { card: createCard(3, 1), isFaceUp: false, hasBeenPeeked: false },
            { card: createCard(4, 4), isFaceUp: false, hasBeenPeeked: false },
          ],
          score: 0,
        },
      ],
      peekingState: { playerIndex: 0, peekedCount: 1 },
    };
  });

  it('hides peeked cards that are face up during peeking phase', () => {
    const result = sanitizeStateForSync(baseState, 'p1');

    // The peeked card should be hidden (isFaceUp: false) but keep hasBeenPeeked
    expect(result.players[0].hand[0].isFaceUp).toBe(false);
    expect(result.players[0].hand[0].hasBeenPeeked).toBe(true);
  });

  it('returns unchanged state when not in peeking phase', () => {
    const playingState = { ...baseState, gamePhase: 'playing' as const };
    const result = sanitizeStateForSync(playingState, 'p1');

    expect(result).toEqual(playingState);
  });

  it('returns unchanged state when currentPlayerId is null', () => {
    const result = sanitizeStateForSync(baseState, null);
    expect(result).toEqual(baseState);
  });

  it('sanitizes all players peeked cards', () => {
    const stateWithMultiplePeeked: GameState = {
      ...baseState,
      players: [
        {
          id: 'p1',
          name: 'Alice',
          hand: [
            { card: createCard(1, 2), isFaceUp: true, hasBeenPeeked: true },
            { card: createCard(2, 5), isFaceUp: true, hasBeenPeeked: true },
          ],
          score: 0,
        },
        {
          id: 'p2',
          name: 'Bob',
          hand: [
            { card: createCard(3, 1), isFaceUp: true, hasBeenPeeked: true },
            { card: createCard(4, 4), isFaceUp: false, hasBeenPeeked: false },
          ],
          score: 0,
        },
      ],
    };

    const result = sanitizeStateForSync(stateWithMultiplePeeked, 'p1');

    // All peeked cards should have isFaceUp set to false
    expect(result.players[0].hand[0].isFaceUp).toBe(false);
    expect(result.players[0].hand[1].isFaceUp).toBe(false);
    expect(result.players[1].hand[0].isFaceUp).toBe(false);
  });
});

describe('mergePeekedHandState', () => {
  let remoteState: GameState;
  let localState: GameState;

  beforeEach(() => {
    remoteState = {
      ...initialGameState,
      gameMode: 'online',
      gamePhase: 'peeking',
      players: [
        {
          id: 'p1',
          name: 'Alice',
          hand: [
            { card: createCard(1, 2), isFaceUp: false, hasBeenPeeked: true },
            { card: createCard(2, 5), isFaceUp: false, hasBeenPeeked: false },
          ],
          score: 0,
        },
        {
          id: 'p2',
          name: 'Bob',
          hand: [
            { card: createCard(3, 1), isFaceUp: false, hasBeenPeeked: false },
            { card: createCard(4, 4), isFaceUp: false, hasBeenPeeked: false },
          ],
          score: 0,
        },
      ],
      peekingState: { playerIndex: 0, peekedCount: 1 },
    };

    localState = {
      ...remoteState,
      players: [
        {
          id: 'p1',
          name: 'Alice',
          hand: [
            { card: createCard(1, 2), isFaceUp: true, hasBeenPeeked: true }, // Local has this peeked
            { card: createCard(2, 5), isFaceUp: false, hasBeenPeeked: false },
          ],
          score: 0,
        },
        {
          id: 'p2',
          name: 'Bob',
          hand: [
            { card: createCard(3, 1), isFaceUp: false, hasBeenPeeked: false },
            { card: createCard(4, 4), isFaceUp: false, hasBeenPeeked: false },
          ],
          score: 0,
        },
      ],
    };
  });

  it('preserves local peeked cards in merged state', () => {
    const result = mergePeekedHandState(remoteState, localState, 'p1');

    // The local peeked card should be preserved
    expect(result.players[0].hand[0].isFaceUp).toBe(true);
    expect(result.players[0].hand[0].hasBeenPeeked).toBe(true);
  });

  it('returns remote state when not in peeking phase', () => {
    const playingRemote = { ...remoteState, gamePhase: 'playing' as const };
    const result = mergePeekedHandState(playingRemote, localState, 'p1');

    expect(result).toEqual(playingRemote);
  });

  it('returns remote state when viewerId is null', () => {
    const result = mergePeekedHandState(remoteState, localState, null);
    expect(result).toEqual(remoteState);
  });

  it('returns remote state when viewer not found', () => {
    const result = mergePeekedHandState(remoteState, localState, 'unknown');
    expect(result).toEqual(remoteState);
  });

  it('returns remote state when local has no peeked cards', () => {
    const localNoPeek: GameState = {
      ...localState,
      players: [
        {
          id: 'p1',
          name: 'Alice',
          hand: [
            { card: createCard(1, 2), isFaceUp: false, hasBeenPeeked: false },
            { card: createCard(2, 5), isFaceUp: false, hasBeenPeeked: false },
          ],
          score: 0,
        },
        localState.players[1],
      ],
    };

    const result = mergePeekedHandState(remoteState, localNoPeek, 'p1');
    expect(result).toEqual(remoteState);
  });
});

describe('scoring calculations', () => {
  it('calculates hand value correctly', () => {
    const hand = [
      { card: createCard(1, 2), isFaceUp: true, hasBeenPeeked: false },
      { card: createCard(2, 5), isFaceUp: true, hasBeenPeeked: false },
      { card: createCard(3, 3), isFaceUp: true, hasBeenPeeked: false },
      { card: createCard(4, 0), isFaceUp: true, hasBeenPeeked: false },
    ];
    
    const totalValue = hand.reduce((sum, slot) => sum + slot.card.value, 0);
    expect(totalValue).toBe(10); // 2 + 5 + 3 + 0
  });

  it('handles special cards in scoring (their face value)', () => {
    const hand = [
      { card: createCard(1, 5, true, 'take_2'), isFaceUp: true, hasBeenPeeked: false },
      { card: createCard(2, 6, true, 'peek_1'), isFaceUp: true, hasBeenPeeked: false },
      { card: createCard(3, 7, true, 'swap_2'), isFaceUp: true, hasBeenPeeked: false },
      { card: createCard(4, 0), isFaceUp: true, hasBeenPeeked: false },
    ];
    
    const totalValue = hand.reduce((sum, slot) => sum + slot.card.value, 0);
    expect(totalValue).toBe(18); // 5 + 6 + 7 + 0
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '@/state/store';
import { initialGameState } from '@/state/initialGame';

/**
 * Tests for the selector patterns.
 * Since these are Zustand hooks that use useShallow, we test the store state
 * directly rather than using React hook testing utilities.
 */

describe('store selectors behavior', () => {
  beforeEach(() => {
    // Reset store state
    useAppStore.setState({
      playerId: 'test-player-1',
      playerName: 'TestPlayer',
      roomId: 'test-room',
      locale: 'en',
      theme: 'light',
      authToken: null,
      game: {
        ...initialGameState,
        gamePhase: 'playing',
        gameMode: 'hotseat',
        players: [
          { id: 'p1', name: 'Alice', hand: [], score: 10 },
          { id: 'p2', name: 'Bob', hand: [], score: 15 },
        ],
        currentPlayerIndex: 0,
        drawPile: [],
        discardPile: [],
      },
      roomStatus: 'playing',
      gameVersion: 1,
      isMenuOpen: false,
      isSheetOpen: false,
      safeArea: { top: 0, right: 0, bottom: 0, left: 0 },
      reducedMotion: false,
      viewportHeight: 800,
      netStatus: 'connected',
      latencyMs: 42,
      reconnectAttempts: 0,
    });
  });

  describe('session state selection', () => {
    it('can select session fields from store', () => {
      const state = useAppStore.getState();
      
      expect(state.playerId).toBe('test-player-1');
      expect(state.playerName).toBe('TestPlayer');
      expect(state.roomId).toBe('test-room');
      expect(state.locale).toBe('en');
      expect(state.theme).toBe('light');
    });
  });

  describe('UI state selection', () => {
    it('can select UI fields from store', () => {
      const state = useAppStore.getState();
      
      expect(state.isMenuOpen).toBe(false);
      expect(state.isSheetOpen).toBe(false);
      expect(state.reducedMotion).toBe(false);
      expect(state.viewportHeight).toBe(800);
      expect(state.safeArea).toEqual({ top: 0, right: 0, bottom: 0, left: 0 });
    });
  });

  describe('game view state selection', () => {
    it('can select game fields from store', () => {
      const state = useAppStore.getState();
      
      expect(state.roomStatus).toBe('playing');
      expect(state.game.gamePhase).toBe('playing');
      expect(state.game.gameMode).toBe('hotseat');
      expect(state.game.players).toHaveLength(2);
      expect(state.game.currentPlayerIndex).toBe(0);
    });
  });

  describe('network state selection', () => {
    it('can select network fields from store', () => {
      const state = useAppStore.getState();
      
      expect(state.netStatus).toBe('connected');
      expect(state.latencyMs).toBe(42);
      expect(state.reconnectAttempts).toBe(0);
    });
  });
});

describe('selector reactivity via subscriptions', () => {
  beforeEach(() => {
    useAppStore.setState({
      playerId: null,
      playerName: '',
      roomId: null,
      locale: 'en',
      theme: 'light',
      authToken: null,
      game: initialGameState,
      roomStatus: 'lobby',
      gameVersion: null,
      isMenuOpen: false,
      isSheetOpen: false,
      safeArea: { top: 0, right: 0, bottom: 0, left: 0 },
      reducedMotion: false,
      viewportHeight: 0,
      netStatus: 'disconnected',
      latencyMs: null,
      reconnectAttempts: 0,
    });
  });

  it('subscriptions receive updates when state changes', () => {
    const updates: string[] = [];
    
    const unsubscribe = useAppStore.subscribe(
      (state) => state.playerId,
      (playerId) => {
        updates.push(playerId ?? 'null');
      }
    );
    
    // Initial state is null
    expect(useAppStore.getState().playerId).toBeNull();
    
    // Update player
    useAppStore.getState().setPlayer('new-id', 'NewPlayer');
    
    expect(updates).toContain('new-id');
    
    unsubscribe();
  });

  it('subscriptions work for nested game state', () => {
    const phases: string[] = [];
    
    const unsubscribe = useAppStore.subscribe(
      (state) => state.game.gamePhase,
      (phase) => {
        phases.push(phase);
      }
    );
    
    // Update game state
    useAppStore.getState().setGame({
      ...initialGameState,
      gamePhase: 'peeking',
    });
    
    expect(phases).toContain('peeking');
    
    useAppStore.getState().setGame({
      ...initialGameState,
      gamePhase: 'playing',
    });
    
    expect(phases).toContain('playing');
    
    unsubscribe();
  });
});

describe('game phase selectors', () => {
  beforeEach(() => {
    useAppStore.setState({
      game: initialGameState,
    });
  });

  it('correctly identifies lobby phase', () => {
    const state = useAppStore.getState();
    expect(state.game.gamePhase).toBe('lobby');
  });

  it('correctly identifies peeking phase', () => {
    useAppStore.getState().setGame({
      ...initialGameState,
      gamePhase: 'peeking',
      peekingState: { playerIndex: 0, peekedCount: 0 },
    });

    const state = useAppStore.getState();
    expect(state.game.gamePhase).toBe('peeking');
    expect(state.game.peekingState?.playerIndex).toBe(0);
  });

  it('correctly identifies playing phase', () => {
    useAppStore.getState().setGame({
      ...initialGameState,
      gamePhase: 'playing',
      currentPlayerIndex: 1,
    });

    const state = useAppStore.getState();
    expect(state.game.gamePhase).toBe('playing');
  });

  it('correctly identifies holding_card phase', () => {
    useAppStore.getState().setGame({
      ...initialGameState,
      gamePhase: 'holding_card',
      drawnCard: { id: 1, value: 5, isSpecial: false },
      drawSource: 'deck',
    });

    const state = useAppStore.getState();
    expect(state.game.gamePhase).toBe('holding_card');
    expect(state.game.drawnCard).toBeDefined();
  });

  it('correctly identifies action_take_2 phase', () => {
    useAppStore.getState().setGame({
      ...initialGameState,
      gamePhase: 'action_take_2',
      tempCards: [
        { id: 1, value: 3, isSpecial: false },
        { id: 2, value: 7, isSpecial: false },
      ],
    });

    const state = useAppStore.getState();
    expect(state.game.gamePhase).toBe('action_take_2');
    expect(state.game.tempCards).toHaveLength(2);
  });

  it('correctly identifies action_peek_1 phase', () => {
    useAppStore.getState().setGame({
      ...initialGameState,
      gamePhase: 'action_peek_1',
    });

    const state = useAppStore.getState();
    expect(state.game.gamePhase).toBe('action_peek_1');
  });

  it('correctly identifies action_swap_2_select_1 phase', () => {
    useAppStore.getState().setGame({
      ...initialGameState,
      gamePhase: 'action_swap_2_select_1',
    });

    const state = useAppStore.getState();
    expect(state.game.gamePhase).toBe('action_swap_2_select_1');
  });

  it('correctly identifies action_swap_2_select_2 phase', () => {
    useAppStore.getState().setGame({
      ...initialGameState,
      gamePhase: 'action_swap_2_select_2',
      swapState: { card1: { playerId: 'p1', cardIndex: 0 } },
    });

    const state = useAppStore.getState();
    expect(state.game.gamePhase).toBe('action_swap_2_select_2');
    expect(state.game.swapState?.card1).toBeDefined();
  });

  it('correctly identifies round_end phase', () => {
    useAppStore.getState().setGame({
      ...initialGameState,
      gamePhase: 'round_end',
      lastRoundScores: [
        { playerId: 'p1', score: 10, penalty: 0 },
        { playerId: 'p2', score: 15, penalty: 0 },
      ],
    });

    const state = useAppStore.getState();
    expect(state.game.gamePhase).toBe('round_end');
    expect(state.game.lastRoundScores).toHaveLength(2);
  });

  it('correctly identifies game_over phase', () => {
    useAppStore.getState().setGame({
      ...initialGameState,
      gamePhase: 'game_over',
      gameWinnerName: 'Alice',
    });

    const state = useAppStore.getState();
    expect(state.game.gamePhase).toBe('game_over');
    expect(state.game.gameWinnerName).toBe('Alice');
  });
});

describe('player state selectors', () => {
  beforeEach(() => {
    useAppStore.setState({
      playerId: 'p1',
      playerName: 'Alice',
      game: {
        ...initialGameState,
        players: [
          { id: 'p1', name: 'Alice', hand: [], score: 25 },
          { id: 'p2', name: 'Bob', hand: [], score: 30 },
          { id: 'p3', name: 'Carol', hand: [], score: 15 },
        ],
        currentPlayerIndex: 1,
      },
    });
  });

  it('can determine current player', () => {
    const state = useAppStore.getState();
    const currentPlayer = state.game.players[state.game.currentPlayerIndex];

    expect(currentPlayer.id).toBe('p2');
    expect(currentPlayer.name).toBe('Bob');
  });

  it('can determine if local player is current player', () => {
    const state = useAppStore.getState();
    const currentPlayer = state.game.players[state.game.currentPlayerIndex];
    const isMyTurn = currentPlayer.id === state.playerId;

    expect(isMyTurn).toBe(false);
  });

  it('can find local player in players list', () => {
    const state = useAppStore.getState();
    const myPlayer = state.game.players.find(p => p.id === state.playerId);

    expect(myPlayer).toBeDefined();
    expect(myPlayer?.name).toBe('Alice');
    expect(myPlayer?.score).toBe(25);
  });

  it('can calculate total scores', () => {
    const state = useAppStore.getState();
    const totalScore = state.game.players.reduce((sum, p) => sum + p.score, 0);

    expect(totalScore).toBe(70);
  });

  it('can find player with lowest score', () => {
    const state = useAppStore.getState();
    const lowestScorePlayer = state.game.players.reduce((lowest, p) =>
      p.score < lowest.score ? p : lowest
    );

    expect(lowestScorePlayer.name).toBe('Carol');
    expect(lowestScorePlayer.score).toBe(15);
  });
});

describe('deck state selectors', () => {
  beforeEach(() => {
    const cards = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      value: i % 10,
      isSpecial: i >= 15,
      specialAction: i >= 15 ? ('peek_1' as const) : undefined,
    }));

    useAppStore.setState({
      game: {
        ...initialGameState,
        drawPile: cards.slice(0, 15),
        discardPile: cards.slice(15, 20),
      },
    });
  });

  it('can get draw pile size', () => {
    const state = useAppStore.getState();
    expect(state.game.drawPile.length).toBe(15);
  });

  it('can get discard pile size', () => {
    const state = useAppStore.getState();
    expect(state.game.discardPile.length).toBe(5);
  });

  it('can get top discard card', () => {
    const state = useAppStore.getState();
    const topDiscard = state.game.discardPile[state.game.discardPile.length - 1];

    expect(topDiscard).toBeDefined();
    expect(topDiscard.id).toBe(19);
  });

  it('can check if deck is empty', () => {
    const state = useAppStore.getState();
    const isDeckEmpty = state.game.drawPile.length === 0;

    expect(isDeckEmpty).toBe(false);
  });

  it('can check if discard is empty', () => {
    useAppStore.getState().setGame({
      ...initialGameState,
      discardPile: [],
    });

    const state = useAppStore.getState();
    const isDiscardEmpty = state.game.discardPile.length === 0;

    expect(isDiscardEmpty).toBe(true);
  });
});

describe('game mode selectors', () => {
  it('can identify solo mode', () => {
    useAppStore.getState().setGame({
      ...initialGameState,
      gameMode: 'solo',
    });

    const state = useAppStore.getState();
    expect(state.game.gameMode).toBe('solo');
  });

  it('can identify hotseat mode', () => {
    useAppStore.getState().setGame({
      ...initialGameState,
      gameMode: 'hotseat',
    });

    const state = useAppStore.getState();
    expect(state.game.gameMode).toBe('hotseat');
  });

  it('can identify online mode', () => {
    useAppStore.getState().setGame({
      ...initialGameState,
      gameMode: 'online',
    });

    const state = useAppStore.getState();
    expect(state.game.gameMode).toBe('online');
  });
});

describe('special action state selectors', () => {
  it('can access tempCards during take_2', () => {
    useAppStore.getState().setGame({
      ...initialGameState,
      gamePhase: 'action_take_2',
      tempCards: [
        { id: 1, value: 3, isSpecial: false },
        { id: 2, value: 7, isSpecial: false },
      ],
    });

    const state = useAppStore.getState();
    expect(state.game.tempCards).toHaveLength(2);
    expect(state.game.tempCards?.[0].value).toBe(3);
    expect(state.game.tempCards?.[1].value).toBe(7);
  });

  it('can access swapState during swap_2', () => {
    useAppStore.getState().setGame({
      ...initialGameState,
      gamePhase: 'action_swap_2_select_2',
      swapState: {
        card1: { playerId: 'p1', cardIndex: 2 },
      },
    });

    const state = useAppStore.getState();
    expect(state.game.swapState).toBeDefined();
    expect(state.game.swapState?.card1.playerId).toBe('p1');
    expect(state.game.swapState?.card1.cardIndex).toBe(2);
  });

  it('can access peekingState during peeking', () => {
    useAppStore.getState().setGame({
      ...initialGameState,
      gamePhase: 'peeking',
      peekingState: { playerIndex: 1, peekedCount: 1 },
    });

    const state = useAppStore.getState();
    expect(state.game.peekingState).toBeDefined();
    expect(state.game.peekingState?.playerIndex).toBe(1);
    expect(state.game.peekingState?.peekedCount).toBe(1);
  });

  it('can check drawn card properties', () => {
    useAppStore.getState().setGame({
      ...initialGameState,
      gamePhase: 'holding_card',
      drawnCard: { id: 99, value: 6, isSpecial: true, specialAction: 'peek_1' },
      drawSource: 'deck',
    });

    const state = useAppStore.getState();
    expect(state.game.drawnCard).toBeDefined();
    expect(state.game.drawnCard?.isSpecial).toBe(true);
    expect(state.game.drawnCard?.specialAction).toBe('peek_1');
    expect(state.game.drawSource).toBe('deck');
  });
});

describe('round and game end selectors', () => {
  it('can access last round scores', () => {
    useAppStore.getState().setGame({
      ...initialGameState,
      gamePhase: 'round_end',
      lastRoundScores: [
        { playerId: 'p1', score: 17, penalty: 5 },
        { playerId: 'p2', score: 8, penalty: 0 },
      ],
      lastCallerId: 'p1',
    });

    const state = useAppStore.getState();
    expect(state.game.lastRoundScores).toHaveLength(2);
    expect(state.game.lastCallerId).toBe('p1');

    const callerScore = state.game.lastRoundScores?.find(s => s.playerId === 'p1');
    expect(callerScore?.penalty).toBe(5);
  });

  it('can access round winner', () => {
    useAppStore.getState().setGame({
      ...initialGameState,
      gamePhase: 'round_end',
      roundWinnerName: 'Bob',
    });

    const state = useAppStore.getState();
    expect(state.game.roundWinnerName).toBe('Bob');
  });

  it('can access game winner', () => {
    useAppStore.getState().setGame({
      ...initialGameState,
      gamePhase: 'game_over',
      gameWinnerName: 'Alice',
    });

    const state = useAppStore.getState();
    expect(state.game.gameWinnerName).toBe('Alice');
  });
});

describe('turn count and player rotation', () => {
  it('can track turn count', () => {
    useAppStore.getState().setGame({
      ...initialGameState,
      turnCount: 5,
    });

    const state = useAppStore.getState();
    expect(state.game.turnCount).toBe(5);
  });

  it('can track starting player index', () => {
    useAppStore.getState().setGame({
      ...initialGameState,
      startingPlayerIndex: 2,
    });

    const state = useAppStore.getState();
    expect(state.game.startingPlayerIndex).toBe(2);
  });

  it('can calculate next player index', () => {
    useAppStore.getState().setGame({
      ...initialGameState,
      players: [
        { id: 'p1', name: 'A', hand: [], score: 0 },
        { id: 'p2', name: 'B', hand: [], score: 0 },
        { id: 'p3', name: 'C', hand: [], score: 0 },
      ],
      currentPlayerIndex: 1,
    });

    const state = useAppStore.getState();
    const nextPlayerIndex = (state.game.currentPlayerIndex + 1) % state.game.players.length;

    expect(nextPlayerIndex).toBe(2);
  });

  it('correctly wraps player index', () => {
    useAppStore.getState().setGame({
      ...initialGameState,
      players: [
        { id: 'p1', name: 'A', hand: [], score: 0 },
        { id: 'p2', name: 'B', hand: [], score: 0 },
      ],
      currentPlayerIndex: 1,
    });

    const state = useAppStore.getState();
    const nextPlayerIndex = (state.game.currentPlayerIndex + 1) % state.game.players.length;

    expect(nextPlayerIndex).toBe(0);
  });
});

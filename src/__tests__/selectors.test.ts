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

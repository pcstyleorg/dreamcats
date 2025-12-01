import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '@/state/store';
import { initialGameState } from '@/state/initialGame';
import { GameState } from '@/types';

describe('useAppStore', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    useAppStore.setState({
      // Session slice defaults
      playerId: null,
      playerName: '',
      roomId: null,
      locale: 'en',
      theme: 'light',
      authToken: null,
      
      // Game slice defaults
      game: initialGameState,
      roomStatus: 'lobby',
      gameVersion: null,
      
      // UI slice defaults
      isMenuOpen: false,
      isSheetOpen: false,
      safeArea: { top: 0, right: 0, bottom: 0, left: 0 },
      reducedMotion: false,
      viewportHeight: 0,
      
      // Net slice defaults
      netStatus: 'disconnected',
      latencyMs: null,
      reconnectAttempts: 0,
    });
  });

  describe('Session slice', () => {
    it('sets player id and name', () => {
      const { setPlayer } = useAppStore.getState();
      setPlayer('player-123', 'Alice');
      
      const state = useAppStore.getState();
      expect(state.playerId).toBe('player-123');
      expect(state.playerName).toBe('Alice');
    });

    it('generates id if empty string provided', () => {
      const { setPlayer } = useAppStore.getState();
      setPlayer('', 'Bob');
      
      const state = useAppStore.getState();
      // nanoid generates an id when empty string is passed
      expect(state.playerId).toBeTruthy();
      expect(state.playerId?.length).toBeGreaterThan(0);
    });

    it('sets room id', () => {
      const { setRoom } = useAppStore.getState();
      setRoom('room-abc');
      
      expect(useAppStore.getState().roomId).toBe('room-abc');
    });

    it('clears room id with null', () => {
      const { setRoom } = useAppStore.getState();
      setRoom('room-abc');
      setRoom(null);
      
      expect(useAppStore.getState().roomId).toBeNull();
    });

    it('sets locale', () => {
      const { setLocale } = useAppStore.getState();
      setLocale('pl');
      
      expect(useAppStore.getState().locale).toBe('pl');
    });

    it('sets theme', () => {
      const { setTheme } = useAppStore.getState();
      setTheme('dark');
      
      expect(useAppStore.getState().theme).toBe('dark');
    });

    it('sets auth token', () => {
      const { setAuthToken } = useAppStore.getState();
      setAuthToken('jwt-token-xyz');
      
      expect(useAppStore.getState().authToken).toBe('jwt-token-xyz');
    });
  });

  describe('Game slice', () => {
    it('sets game state', () => {
      const { setGame } = useAppStore.getState();
      const newGame: GameState = {
        ...initialGameState,
        gameMode: 'hotseat',
        gamePhase: 'playing',
      };
      
      setGame(newGame);
      
      const state = useAppStore.getState();
      expect(state.game.gameMode).toBe('hotseat');
      expect(state.game.gamePhase).toBe('playing');
    });

    it('updates game state with version', () => {
      const { setGame } = useAppStore.getState();
      const newGame: GameState = { ...initialGameState, gameMode: 'online' };
      
      setGame(newGame, { version: 42 });
      
      expect(useAppStore.getState().gameVersion).toBe(42);
    });

    it('updates game with updater function', () => {
      const { updateGame, setGame } = useAppStore.getState();
      setGame({ ...initialGameState, turnCount: 5 });
      
      updateGame((prev) => ({ ...prev, turnCount: prev.turnCount + 1 }));
      
      expect(useAppStore.getState().game.turnCount).toBe(6);
    });

    it('resets game state', () => {
      const { setGame, resetGameState } = useAppStore.getState();
      setGame({ ...initialGameState, gameMode: 'hotseat', turnCount: 10 });
      
      resetGameState();
      
      const state = useAppStore.getState();
      expect(state.game.gameMode).toBe('lobby');
      expect(state.game.turnCount).toBe(0);
      expect(state.roomStatus).toBe('lobby');
    });

    it('sets action message', () => {
      const { setActionMessage } = useAppStore.getState();
      setActionMessage('It is your turn!');
      
      expect(useAppStore.getState().game.actionMessage).toBe('It is your turn!');
    });

    it('appends chat message', () => {
      const { appendChat } = useAppStore.getState();
      const msg = {
        id: 'msg-1',
        senderId: 'p1',
        senderName: 'Alice',
        message: 'Hello!',
        timestamp: Date.now(),
      };
      
      appendChat(msg);
      
      expect(useAppStore.getState().game.chatMessages).toHaveLength(1);
      expect(useAppStore.getState().game.chatMessages[0]).toEqual(msg);
    });

    it('derives roomStatus from gamePhase', () => {
      const { setGame } = useAppStore.getState();
      
      setGame({ ...initialGameState, gamePhase: 'playing' });
      expect(useAppStore.getState().roomStatus).toBe('playing');
      
      setGame({ ...initialGameState, gamePhase: 'round_end' });
      expect(useAppStore.getState().roomStatus).toBe('round_end');
      
      setGame({ ...initialGameState, gamePhase: 'game_over' });
      expect(useAppStore.getState().roomStatus).toBe('game_over');
      
      setGame({ ...initialGameState, gamePhase: 'lobby' });
      expect(useAppStore.getState().roomStatus).toBe('lobby');
    });

    it('sets last move', () => {
      const { setLastMove } = useAppStore.getState();
      const move = {
        playerId: 'p1',
        action: 'draw' as const,
        source: 'deck' as const,
        timestamp: Date.now(),
      };
      
      setLastMove(move);
      expect(useAppStore.getState().game.lastMove).toEqual(move);
      
      setLastMove(null);
      expect(useAppStore.getState().game.lastMove).toBeNull();
    });

    it('sets chat messages directly', () => {
      const { setChat, appendChat } = useAppStore.getState();
      
      // First append some messages
      appendChat({
        id: 'msg-1',
        senderId: 'p1',
        senderName: 'Alice',
        message: 'First',
        timestamp: Date.now(),
      });
      
      // Then replace all with setChat
      const newMessages = [
        { id: 'msg-2', senderId: 'p2', senderName: 'Bob', message: 'New', timestamp: Date.now() },
      ];
      
      setChat(newMessages);
      expect(useAppStore.getState().game.chatMessages).toEqual(newMessages);
    });

    it('sets room status directly', () => {
      const { setRoomStatus } = useAppStore.getState();
      
      setRoomStatus('playing');
      expect(useAppStore.getState().roomStatus).toBe('playing');
      
      setRoomStatus('round_end');
      expect(useAppStore.getState().roomStatus).toBe('round_end');
    });

    it('sets game version directly', () => {
      const { setGameVersion } = useAppStore.getState();
      
      setGameVersion(100);
      expect(useAppStore.getState().gameVersion).toBe(100);
      
      setGameVersion(null);
      expect(useAppStore.getState().gameVersion).toBeNull();
    });

    it('updateGame preserves version when not provided', () => {
      const { setGame, updateGame } = useAppStore.getState();
      setGame({ ...initialGameState }, { version: 50 });
      
      updateGame((prev) => ({ ...prev, turnCount: 10 }));
      
      expect(useAppStore.getState().gameVersion).toBe(50);
    });

    it('updateGame updates version when provided', () => {
      const { setGame, updateGame } = useAppStore.getState();
      setGame({ ...initialGameState }, { version: 50 });
      
      updateGame((prev) => ({ ...prev, turnCount: 10 }), { version: 60 });
      
      expect(useAppStore.getState().gameVersion).toBe(60);
    });
  });

  describe('UI slice', () => {
    it('sets menu open state', () => {
      const { setMenuOpen } = useAppStore.getState();
      
      setMenuOpen(true);
      expect(useAppStore.getState().isMenuOpen).toBe(true);
      
      setMenuOpen(false);
      expect(useAppStore.getState().isMenuOpen).toBe(false);
    });

    it('sets sheet open state', () => {
      const { setSheetOpen } = useAppStore.getState();
      
      setSheetOpen(true);
      expect(useAppStore.getState().isSheetOpen).toBe(true);
    });

    it('sets safe area insets', () => {
      const { setSafeArea } = useAppStore.getState();
      const insets = { top: 44, right: 0, bottom: 34, left: 0 };
      
      setSafeArea(insets);
      
      expect(useAppStore.getState().safeArea).toEqual(insets);
    });

    it('sets reduced motion preference', () => {
      const { setReducedMotion } = useAppStore.getState();
      
      setReducedMotion(true);
      expect(useAppStore.getState().reducedMotion).toBe(true);
    });

    it('sets viewport height', () => {
      const { setViewportHeight } = useAppStore.getState();
      
      setViewportHeight(800);
      expect(useAppStore.getState().viewportHeight).toBe(800);
    });
  });

  describe('Net slice', () => {
    it('sets network status', () => {
      const { setNetStatus } = useAppStore.getState();
      
      setNetStatus('connected');
      expect(useAppStore.getState().netStatus).toBe('connected');
      
      setNetStatus('connecting');
      expect(useAppStore.getState().netStatus).toBe('connecting');
      
      setNetStatus('error');
      expect(useAppStore.getState().netStatus).toBe('error');
    });

    it('sets latency', () => {
      const { setLatency } = useAppStore.getState();
      
      setLatency(50);
      expect(useAppStore.getState().latencyMs).toBe(50);
      
      setLatency(null);
      expect(useAppStore.getState().latencyMs).toBeNull();
    });

    it('bumps reconnect attempts', () => {
      const { bumpReconnect } = useAppStore.getState();
      
      bumpReconnect();
      expect(useAppStore.getState().reconnectAttempts).toBe(1);
      
      bumpReconnect();
      expect(useAppStore.getState().reconnectAttempts).toBe(2);
    });

    it('resets reconnect attempts', () => {
      const { bumpReconnect, resetReconnect } = useAppStore.getState();
      
      bumpReconnect();
      bumpReconnect();
      bumpReconnect();
      
      resetReconnect();
      expect(useAppStore.getState().reconnectAttempts).toBe(0);
    });
  });

  describe('Auto-generated selectors (.use)', () => {
    it('has .use property with selector methods', () => {
      expect(useAppStore.use).toBeDefined();
      expect(typeof useAppStore.use.playerId).toBe('function');
      expect(typeof useAppStore.use.playerName).toBe('function');
      expect(typeof useAppStore.use.game).toBe('function');
      expect(typeof useAppStore.use.netStatus).toBe('function');
    });
  });
});

describe('useTutorialStore', () => {
  // Import dynamically to avoid i18n initialization issues
  it('should exist and have auto-selectors', async () => {
    const { useTutorialStore } = await import('@/stores/tutorialStore');
    
    expect(useTutorialStore.use).toBeDefined();
    expect(typeof useTutorialStore.use.step).toBe('function');
    expect(typeof useTutorialStore.use.startTutorial).toBe('function');
    expect(typeof useTutorialStore.use.endTutorial).toBe('function');
  });
});

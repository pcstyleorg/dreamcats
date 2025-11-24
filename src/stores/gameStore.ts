import { create } from 'zustand';
import i18n from '@/i18n/config';
import { GameState } from '@/types';

export const initialState: GameState = {
  gameMode: 'lobby',
  roomId: null,
  hostId: null,
  players: [],
  drawPile: [],
  discardPile: [],
  currentPlayerIndex: 0,
  gamePhase: 'lobby',
  actionMessage: i18n.t('game.welcomeMessage'),
  roundWinnerName: null,
  gameWinnerName: null,
  turnCount: 0,
  chatMessages: [],
  drawSource: null,
  lastCallerId: null,
  lastMove: null,
};

type GameStore = {
  state: GameState;
  myPlayerId: string | null;
  setState: (updater: GameState | ((prev: GameState) => GameState)) => void;
  setMyPlayerId: (id: string | null) => void;
};

export const useGameStore = create<GameStore>((set) => ({
  state: initialState,
  myPlayerId: null,
  setState: (updater) =>
    set((prev) => ({
      state:
        typeof updater === 'function'
          ? (updater as (prev: GameState) => GameState)(prev.state)
          : updater,
    })),
  setMyPlayerId: (id) => set({ myPlayerId: id }),
}));

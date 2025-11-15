import React, { createContext, useReducer, ReactNode, useContext, useEffect, useState, useCallback } from 'react';
import { GameState, Player, Card, GamePhase } from '@/types';
import { createDeck, shuffleDeck } from '@/lib/game-logic';
import { supabase } from '@/lib/supabaseClient';
import { RealtimeChannel } from '@supabase/supabase-js';
import { toast } from 'sonner';

// Actions that players can take, which will be broadcast
export type GameAction =
  | { type: 'PEEK_CARD'; payload: { playerId: string; cardIndex: number } }
  | { type: 'FINISH_PEEKING' }
  | { type: 'DRAW_FROM_DECK' }
  | { type: 'DRAW_FROM_DISCARD' }
  | { type: 'DISCARD_HELD_CARD' }
  | { type: 'SWAP_HELD_CARD'; payload: { cardIndex: number } }
  | { type: 'USE_SPECIAL_ACTION' }
  | { type: 'ACTION_PEEK_1_SELECT'; payload: { playerId: string; cardIndex: number } }
  | { type: 'ACTION_SWAP_2_SELECT'; payload: { playerId: string; cardIndex: number } }
  | { type: 'ACTION_TAKE_2_CHOOSE'; payload: { card: Card } }
  | { type: 'CALL_POBUDKA' }
  | { type: 'START_NEW_ROUND' };


// Actions for the local reducer
type ReducerAction = 
  | { type: 'SET_STATE'; payload: GameState }
  | { type: 'PROCESS_ACTION', payload: GameAction };

const initialState: GameState = {
  roomId: null,
  hostId: null,
  players: [],
  drawPile: [],
  discardPile: [],
  currentPlayerIndex: 0,
  gamePhase: 'lobby',
  actionMessage: 'Welcome to Sen! Create or join a room to start.',
  roundWinnerName: null,
  gameWinnerName: null,
  turnCount: 0,
};

const gameReducer = (state: GameState, action: ReducerAction): GameState => {
  switch (action.type) {
    case 'SET_STATE':
      return action.payload;
    
    case 'PROCESS_ACTION': {
        const gameAction = action.payload;
        const currentPlayer = state.players[state.currentPlayerIndex];

        // Helper to advance turn
        const advanceTurn = (s: GameState): GameState => {
            const nextPlayerIndex = (s.currentPlayerIndex + 1) % s.players.length;
            return {
                ...s,
                currentPlayerIndex: nextPlayerIndex,
                turnCount: s.turnCount + 1,
                actionMessage: `It's ${s.players[nextPlayerIndex].name}'s turn.`,
                drawnCard: null,
                gamePhase: 'playing',
            };
        };

        switch(gameAction.type) {
            case 'PEEK_CARD': {
                if (state.gamePhase !== 'peeking' || !state.peekingState || state.peekingState.peekedCount >= 2) return state;
                const { playerIndex, peekedCount } = state.peekingState;
                const players = [...state.players];
                const player = players[playerIndex];
                if (gameAction.payload.playerId !== player.id || player.hand[gameAction.payload.cardIndex].isFaceUp) return state;
                const newHand = [...player.hand];
                newHand[gameAction.payload.cardIndex] = { ...newHand[gameAction.payload.cardIndex], isFaceUp: true, hasBeenPeeked: true };
                players[playerIndex] = { ...player, hand: newHand };
                return { ...state, players, peekingState: { ...state.peekingState, peekedCount: peekedCount + 1 } };
            }
            case 'FINISH_PEEKING': {
                 if (state.gamePhase !== 'peeking' || !state.peekingState) return state;
                const { playerIndex } = state.peekingState;
                const players = state.players.map((p, idx) => (idx === playerIndex) ? { ...p, hand: p.hand.map(cardInHand => ({...cardInHand, isFaceUp: false})) } : p);
                const nextPlayerIndex = playerIndex + 1;
                if (nextPlayerIndex < state.players.length) {
                    return { ...state, players, peekingState: { playerIndex: nextPlayerIndex, peekedCount: 0 }, actionMessage: `${state.players[nextPlayerIndex].name}, it's your turn to peek at two cards.` };
                } else {
                    return { ...state, players, gamePhase: 'playing', peekingState: undefined, actionMessage: `The game begins! ${state.players[state.currentPlayerIndex].name}, your turn.` };
                }
            }
            case 'DRAW_FROM_DECK': {
                if (state.gamePhase !== 'playing') return state;
                const newDrawPile = [...state.drawPile];
                const drawnCard = newDrawPile.pop();
                if (!drawnCard) return state; // Should not happen
                return { ...state, drawPile: newDrawPile, drawnCard, gamePhase: 'holding_card', actionMessage: `${currentPlayer.name} drew a card. Use it, swap it, or discard it.` };
            }
            case 'DRAW_FROM_DISCARD': {
                if (state.gamePhase !== 'playing' || state.discardPile.length === 0) return state;
                const newDiscardPile = [...state.discardPile];
                const drawnCard = newDiscardPile.pop()!;
                if (drawnCard.isSpecial) { // Cannot use special action from discard
                    const tempCard = {...drawnCard, isSpecial: false};
                    return { ...state, discardPile: newDiscardPile, drawnCard: tempCard, gamePhase: 'holding_card', actionMessage: `${currentPlayer.name} took from discard. Must swap.` };
                }
                return { ...state, discardPile: newDiscardPile, drawnCard, gamePhase: 'holding_card', actionMessage: `${currentPlayer.name} took from discard. Must swap.` };
            }
            case 'DISCARD_HELD_CARD': {
                if (state.gamePhase !== 'holding_card' || !state.drawnCard) return state;
                const newDiscardPile = [...state.discardPile, state.drawnCard];
                return advanceTurn({ ...state, discardPile: newDiscardPile, actionMessage: `${currentPlayer.name} discarded their drawn card.` });
            }
            case 'SWAP_HELD_CARD': {
                if (state.gamePhase !== 'holding_card' || !state.drawnCard) return state;
                const { cardIndex } = gameAction.payload;
                const players = [...state.players];
                const player = { ...players[state.currentPlayerIndex] };
                const newHand = [...player.hand];
                const cardToDiscard = newHand[cardIndex].card;
                newHand[cardIndex] = { card: state.drawnCard, isFaceUp: false, hasBeenPeeked: false };
                player.hand = newHand;
                players[state.currentPlayerIndex] = player;
                const newDiscardPile = [...state.discardPile, cardToDiscard];
                return advanceTurn({ ...state, players, discardPile: newDiscardPile, actionMessage: `${currentPlayer.name} swapped a card.` });
            }
            case 'USE_SPECIAL_ACTION': {
                if (state.gamePhase !== 'holding_card' || !state.drawnCard?.isSpecial) return state;
                const { specialAction } = state.drawnCard;
                const newDiscardPile = [...state.discardPile, state.drawnCard];
                
                switch(specialAction) {
                    case 'peek_1':
                        return { ...state, gamePhase: 'action_peek_1', discardPile: newDiscardPile, drawnCard: null, actionMessage: `${currentPlayer.name} used 'Peek 1'. Select any card to view.` };
                    case 'swap_2':
                        return { ...state, gamePhase: 'action_swap_2_select_1', discardPile: newDiscardPile, drawnCard: null, actionMessage: `${currentPlayer.name} used 'Swap 2'. Select the first card.` };
                    case 'take_2': {
                        const newDrawPile = [...state.drawPile];
                        const card1 = newDrawPile.pop();
                        const card2 = newDrawPile.pop();
                        const tempCards = [card1, card2].filter(c => c) as Card[];
                        if (tempCards.length === 0) return advanceTurn(state);
                        return { ...state, gamePhase: 'action_take_2', discardPile: newDiscardPile, drawPile: newDrawPile, drawnCard: null, tempCards };
                    }
                    default: return state;
                }
            }
            case 'ACTION_PEEK_1_SELECT': {
                if (state.gamePhase !== 'action_peek_1') return state;
                const { playerId, cardIndex } = gameAction.payload;
                const players = state.players.map(p => {
                    if (p.id === playerId) {
                        const newHand = p.hand.map((c, i) => i === cardIndex ? { ...c, isFaceUp: true } : c);
                        return { ...p, hand: newHand };
                    }
                    return p;
                });
                // Temporarily show the card, then advance turn and hide it
                setTimeout(() => {
                    const originalPlayers = state.players.map(p => ({...p, hand: p.hand.map(c => ({...c, isFaceUp: false}))}));
                    const nextState = advanceTurn({...state, players: originalPlayers});
                    // This needs to be handled carefully with broadcasting. A 'REVEAL_END' action is better.
                    // For now, this is a simplified approach.
                }, 2000);
                return { ...state, players, actionMessage: `${currentPlayer.name} peeked at a card.` };
            }
            case 'ACTION_SWAP_2_SELECT': {
                const { playerId, cardIndex } = gameAction.payload;
                if (state.gamePhase === 'action_swap_2_select_1') {
                    return { ...state, gamePhase: 'action_swap_2_select_2', swapState: { card1: { playerId, cardIndex } }, actionMessage: 'Select the second card to swap.' };
                }
                if (state.gamePhase === 'action_swap_2_select_2' && state.swapState) {
                    const { card1 } = state.swapState;
                    const card2 = { playerId, cardIndex };

                    const player1 = state.players.find(p => p.id === card1.playerId)!;
                    const player2 = state.players.find(p => p.id === card2.playerId)!;

                    const cardToMove1 = player1.hand[card1.cardIndex];
                    const cardToMove2 = player2.hand[card2.cardIndex];

                    const newPlayers = state.players.map(p => {
                        if (p.id === card1.playerId) {
                            const newHand = [...p.hand];
                            newHand[card1.cardIndex] = cardToMove2;
                            return { ...p, hand: newHand };
                        }
                        if (p.id === card2.playerId) {
                             const newHand = [...p.hand];
                            newHand[card2.cardIndex] = cardToMove1;
                            return { ...p, hand: newHand };
                        }
                        return p;
                    });
                    return advanceTurn({ ...state, players: newPlayers, swapState: undefined, actionMessage: `${currentPlayer.name} swapped two cards.` });
                }
                return state;
            }
             case 'ACTION_TAKE_2_CHOOSE': {
                if (state.gamePhase !== 'action_take_2' || !state.tempCards) return state;
                const chosenCard = gameAction.payload.card;
                const otherCard = state.tempCards.find(c => c.id !== chosenCard.id);
                const newDiscardPile = otherCard ? [...state.discardPile, otherCard] : state.discardPile;
                return { ...state, discardPile: newDiscardPile, drawnCard: chosenCard, gamePhase: 'holding_card', tempCards: undefined, actionMessage: `${currentPlayer.name} chose a card from 'Take 2'.` };
            }
            case 'CALL_POBUDKA': {
                const caller = currentPlayer;
                const scores = state.players.map(p => ({
                    player: p,
                    score: p.hand.reduce((acc, h) => acc + h.card.value, 0)
                }));

                const minScore = Math.min(...scores.map(s => s.score));
                const callerScore = scores.find(s => s.player.id === caller.id)!.score;
                const callerHasLowest = callerScore <= minScore;
                
                const lastRoundScores = scores.map(s => {
                    let penalty = 0;
                    if (s.player.id === caller.id && !callerHasLowest) {
                        penalty = 5;
                    }
                    return { playerId: s.player.id, score: s.score, penalty };
                });

                const playersWithNewScores = state.players.map(p => {
                    const roundData = lastRoundScores.find(lrs => lrs.playerId === p.id)!;
                    return { ...p, score: p.score + roundData.score + roundData.penalty };
                });
                
                const roundWinner = scores.reduce((prev, curr) => (prev.score < curr.score) ? prev : curr);
                const gameOver = playersWithNewScores.some(p => p.score >= 100);

                if (gameOver) {
                    const gameWinner = playersWithNewScores.reduce((prev, curr) => (prev.score < curr.score) ? prev : curr);
                    return {
                        ...state,
                        players: playersWithNewScores.map(p => ({...p, hand: p.hand.map(h => ({...h, isFaceUp: true}))})),
                        gamePhase: 'game_over',
                        gameWinnerName: gameWinner.name,
                        lastRoundScores,
                        actionMessage: `Game Over! ${gameWinner.name} wins with the lowest score!`
                    };
                }

                return {
                    ...state,
                    players: playersWithNewScores.map(p => ({...p, hand: p.hand.map(h => ({...h, isFaceUp: true}))})),
                    gamePhase: 'round_end',
                    roundWinnerName: roundWinner.player.name,
                    lastRoundScores,
                    actionMessage: `${caller.name} called 'POBUDKA!'. ${roundWinner.player.name} won the round.`
                };
            }
            case 'START_NEW_ROUND': {
                const deck = shuffleDeck(createDeck());
                const playersWithNewHands = state.players.map(p => ({
                    ...p,
                    hand: deck.splice(0, 4).map(card => ({ card, isFaceUp: false, hasBeenPeeked: false })),
                }));
                const discardPile = [deck.pop()!];
                const nextStartingPlayerIndex = (state.players.findIndex(p => p.name === state.roundWinnerName) + 1) % state.players.length;

                return {
                    ...initialState,
                    roomId: state.roomId,
                    hostId: state.hostId,
                    players: playersWithNewHands,
                    drawPile: deck,
                    discardPile,
                    gamePhase: 'peeking',
                    currentPlayerIndex: nextStartingPlayerIndex,
                    peekingState: { playerIndex: 0, peekedCount: 0 },
                    actionMessage: `${playersWithNewHands[0].name}, it's your turn to peek at two cards.`
                };
            }
            default:
                return state;
        }
    }
    default:
      return state;
  }
};

interface GameContextType {
  state: GameState;
  myPlayerId: string | null;
  createRoom: (playerName: string) => Promise<void>;
  joinRoom: (roomId: string, playerName: string) => Promise<void>;
  broadcastAction: (action: GameAction) => void;
}

export const GameContext = createContext<GameContextType>({
  state: initialState,
  myPlayerId: null,
  createRoom: async () => {},
  joinRoom: async () => {},
  broadcastAction: () => {},
});

export const GameProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const [myPlayerId, setMyPlayerId] = useState<string | null>(sessionStorage.getItem('sen-playerId'));
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  const broadcastAction = useCallback((action: GameAction) => {
    // Optimistically update local state for snappier UI
    dispatch({ type: 'PROCESS_ACTION', payload: action });
    if (channel) {
        channel.send({
            type: 'broadcast',
            event: 'PLAYER_ACTION',
            payload: { action, senderId: myPlayerId },
        });
    }
  }, [channel, myPlayerId]);

  useEffect(() => {
    if (!channel) return;

    const subscription = channel
      .on('broadcast', { event: 'PLAYER_ACTION' }, ({ payload }) => {
        // Avoid re-processing our own actions
        if (payload.senderId !== myPlayerId) {
            dispatch({ type: 'PROCESS_ACTION', payload: payload.action });
        }
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        if(state.hostId !== myPlayerId) return;
        const newPlayerInfo = newPresences[0];
        toast.info(`${newPlayerInfo.name} has joined the room.`);
        
        if (state.players.length === 1) {
            const newPlayer: Player = { id: newPlayerInfo.id, name: newPlayerInfo.name, hand: [], score: 0 };
            const allPlayers = [...state.players, newPlayer];

            const deck = shuffleDeck(createDeck());
            const playersWithCards = allPlayers.map(p => ({
                ...p,
                hand: deck.splice(0, 4).map(card => ({ card, isFaceUp: false, hasBeenPeeked: false })),
            }));
            const discardPile = [deck.pop()!];

            const startPeekingState: GameState = {
                ...state,
                players: playersWithCards,
                drawPile: deck,
                discardPile,
                gamePhase: 'peeking',
                actionMessage: `${playersWithCards[0].name}, it's your turn to peek at two cards.`,
                peekingState: { playerIndex: 0, peekedCount: 0 },
            };
            // Instead of broadcasting state, broadcast the action that creates it
            // This is a placeholder for a more robust sync mechanism
            if(channel) channel.send({type: 'broadcast', event: 'SYNC_STATE', payload: { state: startPeekingState }});
            dispatch({type: 'SET_STATE', payload: startPeekingState});
        }
      })
      .on('broadcast', { event: 'SYNC_STATE' }, ({ payload }) => {
        dispatch({ type: 'SET_STATE', payload: payload.state });
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        toast.warning(`${leftPresences[0].name} has left the room. Game reset.`);
        if(channel) supabase.removeChannel(channel);
        setChannel(null);
        setMyPlayerId(null);
        sessionStorage.removeItem('sen-playerId');
        dispatch({type: 'SET_STATE', payload: initialState});
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [channel, state, myPlayerId]);

  const createRoom = async (playerName: string) => {
    const roomId = `sen-${Math.random().toString(36).substr(2, 6)}`;
    const playerId = `player-${Math.random().toString(36).substr(2, 9)}`;
    const newPlayer: Player = { id: playerId, name: playerName, hand: [], score: 0 };
    const newState: GameState = { ...initialState, roomId, hostId: playerId, players: [newPlayer], actionMessage: `Room created! ID: ${roomId}. Waiting for opponent...` };
    const newChannel = supabase.channel(roomId, { config: { presence: { key: playerId } } });
    await newChannel.subscribe();
    newChannel.track({ id: playerId, name: playerName });
    setChannel(newChannel);
    setMyPlayerId(playerId);
    sessionStorage.setItem('sen-playerId', playerId);
    dispatch({ type: 'SET_STATE', payload: newState });
    toast.success(`Room created! Your ID is ${roomId}. Share it with a friend.`);
  };

  const joinRoom = async (roomId: string, playerName: string) => {
    const playerId = `player-${Math.random().toString(36).substr(2, 9)}`;
    const newChannel = supabase.channel(roomId, { config: { presence: { key: playerId } } });
    newChannel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
            setMyPlayerId(playerId);
            sessionStorage.setItem('sen-playerId', playerId);
            setChannel(newChannel);
            newChannel.track({ id: playerId, name: playerName });
            toast.success(`Joined room ${roomId}! Waiting for host to start.`);
        }
        if (status === 'CHANNEL_ERROR') {
            toast.error("Could not join room. Check the ID.");
            newChannel.unsubscribe();
        }
    });
  };

  return (
    <GameContext.Provider value={{ state, myPlayerId, createRoom, joinRoom, broadcastAction }}>
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => useContext(GameContext);

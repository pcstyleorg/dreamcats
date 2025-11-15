import { createContext, useReducer, ReactNode, useContext, useEffect, useState, useCallback } from 'react';
import { GameState, Player, Card, ChatMessage, GameAction } from '@/types';
import { createDeck, shuffleDeck } from '@/lib/game-logic';
import { supabase } from '@/lib/supabaseClient';
import { RealtimeChannel } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { useSounds, SoundType } from '@/hooks/use-sounds';

type ReducerAction = 
  | { type: 'SET_STATE'; payload: GameState }
  | { type: 'PROCESS_ACTION', payload: { action: GameAction, isLocal?: boolean } }
  | { type: 'ADD_CHAT_MESSAGE', payload: ChatMessage };

const initialState: GameState = {
  gameMode: 'lobby',
  roomId: null,
  hostId: null,
  players: [],
  drawPile: [],
  discardPile: [],
  currentPlayerIndex: 0,
  gamePhase: 'lobby',
  actionMessage: 'Welcome to Sen! Choose your path.',
  roundWinnerName: null,
  gameWinnerName: null,
  turnCount: 0,
  chatMessages: [],
};

const gameReducer = (state: GameState, action: ReducerAction): GameState => {
  switch (action.type) {
    case 'SET_STATE':
      return action.payload;
    case 'ADD_CHAT_MESSAGE':
        return {
            ...state,
            chatMessages: [...state.chatMessages, action.payload],
        };
    case 'PROCESS_ACTION': {
        const gameAction = action.payload.action;
        const currentPlayer = state.players[state.currentPlayerIndex];

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
                if (!drawnCard) return state; 
                return { ...state, drawPile: newDrawPile, drawnCard, gamePhase: 'holding_card', actionMessage: `${currentPlayer.name} drew a card. Use it, swap it, or discard it.` };
            }
            case 'DRAW_FROM_DISCARD': {
                if (state.gamePhase !== 'playing' || state.discardPile.length === 0) return state;
                const newDiscardPile = [...state.discardPile];
                const drawnCard = newDiscardPile.pop()!;
                if (drawnCard.isSpecial) {
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
                
                // Note: The card will be hidden after a delay, handled by the component
                return advanceTurn({ ...state, players, actionMessage: `${currentPlayer.name} peeked at a card.` });
            }
            case 'ACTION_SWAP_2_SELECT': {
                const { playerId, cardIndex } = gameAction.payload;
                if (state.gamePhase === 'action_swap_2_select_1') {
                    return { ...state, gamePhase: 'action_swap_2_select_2', swapState: { card1: { playerId, cardIndex } }, actionMessage: 'Select the second card to swap.' };
                }
                if (state.gamePhase === 'action_swap_2_select_2' && state.swapState) {
                    const { card1 } = state.swapState;
                    const card2 = { playerId, cardIndex };

                    const player1Index = state.players.findIndex(p => p.id === card1.playerId)!;
                    const player2Index = state.players.findIndex(p => p.id === card2.playerId)!;
                    
                    const newPlayers = JSON.parse(JSON.stringify(state.players));
                    const cardToMove1 = newPlayers[player1Index].hand[card1.cardIndex];
                    const cardToMove2 = newPlayers[player2Index].hand[card2.cardIndex];

                    newPlayers[player1Index].hand[card1.cardIndex] = cardToMove2;
                    newPlayers[player2Index].hand[card2.cardIndex] = cardToMove1;

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
                    gameMode: state.gameMode,
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
  startHotseatGame: (player1Name: string, player2Name: string) => void;
  broadcastAction: (action: GameAction) => void;
  sendChatMessage: (message: string) => void;
  playSound: (sound: SoundType) => void;
}

export const GameContext = createContext<GameContextType>({
  state: initialState,
  myPlayerId: null,
  createRoom: async () => {},
  joinRoom: async () => {},
  startHotseatGame: () => {},
  broadcastAction: () => {},
  sendChatMessage: () => {},
  playSound: () => {},
});

let channel: RealtimeChannel | null = null;

export const GameProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
  const { playSound } = useSounds();

  const processAndBroadcastAction = useCallback((action: GameAction) => {
    dispatch({ type: 'PROCESS_ACTION', payload: { action, isLocal: true } });
    if (state.gameMode === 'online' && channel) {
        channel.send({
            type: 'broadcast',
            event: 'PLAYER_ACTION',
            payload: { action, senderId: myPlayerId },
        });
    }
    // Play sounds for actions
    switch(action.type) {
        case 'PEEK_CARD':
        case 'SWAP_HELD_CARD':
        case 'ACTION_PEEK_1_SELECT':
            playSound('flip');
            break;
        case 'DRAW_FROM_DECK':
        case 'DRAW_FROM_DISCARD':
            playSound('draw');
            break;
        case 'CALL_POBUDKA':
            playSound('pobudka');
            break;
    }
  }, [state.gameMode, myPlayerId, playSound]);

  const sendChatMessage = (message: string) => {
    if (state.gameMode !== 'online' || !channel || !myPlayerId) return;
    const me = state.players.find(p => p.id === myPlayerId);
    if (!me) return;

    const chatMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      senderId: myPlayerId,
      senderName: me.name,
      message,
      timestamp: Date.now(),
    };
    
    dispatch({ type: 'ADD_CHAT_MESSAGE', payload: chatMessage });
    playSound('chat');

    channel.send({
      type: 'broadcast',
      event: 'CHAT_MESSAGE',
      payload: { message: chatMessage },
    });
  };

  const setupChannel = useCallback((ch: RealtimeChannel) => {
    if (channel) {
        supabase.removeChannel(channel);
    }
    channel = ch;
    channel
      .on('broadcast', { event: 'PLAYER_ACTION' }, ({ payload }) => {
        if (payload.senderId !== myPlayerId) {
            dispatch({ type: 'PROCESS_ACTION', payload: { action: payload.action } });
        }
      })
      .on('broadcast', { event: 'CHAT_MESSAGE' }, ({ payload }) => {
        if (payload.message.senderId !== myPlayerId) {
            dispatch({ type: 'ADD_CHAT_MESSAGE', payload: payload.message });
            playSound('chat');
        }
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        if(state.hostId !== myPlayerId || state.players.length >= 2) return;
        const newPlayerInfo = newPresences[0];
        toast.info(`${newPlayerInfo.name} has joined the room.`);
        
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
            gameMode: 'online',
            players: playersWithCards,
            drawPile: deck,
            discardPile,
            gamePhase: 'peeking',
            actionMessage: `${playersWithCards[0].name}, it's your turn to peek at two cards.`,
            peekingState: { playerIndex: 0, peekedCount: 0 },
        };
        if(channel) channel.send({type: 'broadcast', event: 'SYNC_STATE', payload: { state: startPeekingState }});
        dispatch({type: 'SET_STATE', payload: startPeekingState});
      })
      .on('broadcast', { event: 'SYNC_STATE' }, ({ payload }) => {
        dispatch({ type: 'SET_STATE', payload: payload.state });
      })
       .on('broadcast', { event: 'REQUEST_SYNC' }, ({ payload }) => {
        if (payload.senderId !== myPlayerId) {
            channel?.send({type: 'broadcast', event: 'SYNC_STATE', payload: { state }});
        }
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        toast.warning(`${leftPresences[0].name} has left the room. Game reset.`);
        if(channel) supabase.removeChannel(channel);
        channel = null;
        setMyPlayerId(null);
        sessionStorage.clear();
        dispatch({type: 'SET_STATE', payload: initialState});
      })
      .subscribe();
  }, [myPlayerId, state, playSound]);

  // Reconnection logic
  useEffect(() => {
    const reconnect = async () => {
        const storedPlayerId = sessionStorage.getItem('sen-playerId');
        const storedRoomId = sessionStorage.getItem('sen-roomId');
        const storedPlayerName = sessionStorage.getItem('sen-playerName');

        if (storedPlayerId && storedRoomId && storedPlayerName) {
            setMyPlayerId(storedPlayerId);
            const newChannel = supabase.channel(storedRoomId, { config: { presence: { key: storedPlayerId } } });
            setupChannel(newChannel);
            await newChannel.track({ id: storedPlayerId, name: storedPlayerName });
            toast.info(`Reconnected to room ${storedRoomId}. Requesting game state...`);
            newChannel.send({ type: 'broadcast', event: 'REQUEST_SYNC', payload: { senderId: storedPlayerId } });
        }
    }
    reconnect();
  }, [setupChannel]);

  const createRoom = async (playerName: string) => {
    const roomId = `sen-${Math.random().toString(36).substr(2, 6)}`;
    const playerId = `player-${Math.random().toString(36).substr(2, 9)}`;
    const newPlayer: Player = { id: playerId, name: playerName, hand: [], score: 0 };
    const newState: GameState = { ...initialState, gameMode: 'online', roomId, hostId: playerId, players: [newPlayer], actionMessage: `Room created! ID: ${roomId}. Waiting for opponent...` };
    
    const newChannel = supabase.channel(roomId, { config: { presence: { key: playerId } } });
    setupChannel(newChannel);
    await newChannel.track({ id: playerId, name: playerName });

    setMyPlayerId(playerId);
    sessionStorage.setItem('sen-playerId', playerId);
    sessionStorage.setItem('sen-roomId', roomId);
    sessionStorage.setItem('sen-playerName', playerName);

    dispatch({ type: 'SET_STATE', payload: newState });
    toast.success(`Room created! Your ID is ${roomId}. Share it with a friend.`);
  };

  const joinRoom = async (roomId: string, playerName:string) => {
    const playerId = `player-${Math.random().toString(36).substr(2, 9)}`;
    const newChannel = supabase.channel(roomId);
    
    newChannel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
            setupChannel(newChannel);
            await newChannel.track({ id: playerId, name: playerName });
            setMyPlayerId(playerId);
            sessionStorage.setItem('sen-playerId', playerId);
            sessionStorage.setItem('sen-roomId', roomId);
            sessionStorage.setItem('sen-playerName', playerName);
            toast.success(`Joined room ${roomId}! Waiting for game to sync.`);
        }
        if (status === 'CHANNEL_ERROR') {
            toast.error("Could not join room. Check the ID.");
            newChannel.unsubscribe();
        }
    });
  };

  const startHotseatGame = (player1Name: string, player2Name: string) => {
    const p1: Player = { id: 'player-1', name: player1Name, hand: [], score: 0 };
    const p2: Player = { id: 'player-2', name: player2Name, hand: [], score: 0 };
    const allPlayers = [p1, p2];

    const deck = shuffleDeck(createDeck());
    const playersWithCards = allPlayers.map(p => ({
        ...p,
        hand: deck.splice(0, 4).map(card => ({ card, isFaceUp: false, hasBeenPeeked: false })),
    }));
    const discardPile = [deck.pop()!];

    const startPeekingState: GameState = {
        ...initialState,
        gameMode: 'hotseat',
        players: playersWithCards,
        drawPile: deck,
        discardPile,
        gamePhase: 'peeking',
        actionMessage: `${playersWithCards[0].name}, it's your turn to peek at two cards.`,
        peekingState: { playerIndex: 0, peekedCount: 0 },
    };
    dispatch({type: 'SET_STATE', payload: startPeekingState});
  }

  return (
    <GameContext.Provider value={{ state, myPlayerId, createRoom, joinRoom, startHotseatGame, broadcastAction: processAndBroadcastAction, sendChatMessage, playSound }}>
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => useContext(GameContext);

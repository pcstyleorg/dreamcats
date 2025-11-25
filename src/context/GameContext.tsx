import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { GameState, Player, Card, ChatMessage, GameAction } from "@/types";
import { createDeck, shuffleDeck } from "@/lib/game-logic";
import { toast } from "sonner";
import { useSounds, SoundType } from "@/hooks/use-sounds";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import i18n from "@/i18n/config";
import { useGameStore, initialState } from "@/stores/gameStore";

type ReducerAction =
  | { type: "SET_STATE"; payload: GameState }
  | {
    type: "PROCESS_ACTION";
    payload: { action: GameAction; isLocal?: boolean };
  }
  | { type: "ADD_CHAT_MESSAGE"; payload: ChatMessage }
  | { type: "SET_CHAT_MESSAGES"; payload: ChatMessage[] };

const isRevealPhase = (phase: GameState["gamePhase"]) =>
  phase === "round_end" || phase === "game_over";

const getVisibleStateForViewer = (
  state: GameState,
  viewerId: string | null,
): GameState => {
  if (!viewerId) return state;
  const revealAll = isRevealPhase(state.gamePhase);

  const players = state.players.map((player) => {
    if (revealAll || player.id === viewerId) return player;

    return {
      ...player,
      // Opponent cards are always face-down in this player's view
      hand: player.hand.map((slot) => ({
        ...slot,
        isFaceUp: false,
        hasBeenPeeked: false,
      })),
    };
  });

  return { ...state, players };
};

const gameReducer = (state: GameState, action: ReducerAction): GameState => {
  switch (action.type) {
    case "SET_STATE":
      return action.payload;
    case "ADD_CHAT_MESSAGE":
      return {
        ...state,
        chatMessages: [...state.chatMessages, action.payload],
      };
    case "SET_CHAT_MESSAGES":
      return {
        ...state,
        chatMessages: action.payload,
      };
    case "PROCESS_ACTION": {
      const gameAction = action.payload.action;
      const currentPlayer = state.players[state.currentPlayerIndex];

      const advanceTurn = (s: GameState): GameState => {
        const nextPlayerIndex = (s.currentPlayerIndex + 1) % s.players.length;
        return {
          ...s,
          currentPlayerIndex: nextPlayerIndex,
          turnCount: s.turnCount + 1,
          actionMessage: i18n.t('game.playerTurn', { player: s.players[nextPlayerIndex].name }),
          drawnCard: null,
          drawSource: null,
          gamePhase: "playing",
        };
      };

      const endRoundWithScores = (
        s: GameState,
        options: { reason: "pobudka" | "deck_exhausted"; callerId?: string },
      ): GameState => {
        const scores = s.players.map((p) => ({
          player: p,
          score: p.hand.reduce((acc, h) => acc + h.card.value, 0),
        }));

        const minScore = Math.min(...scores.map((entry) => entry.score));
        const callerScoreEntry = options.callerId
          ? scores.find((entry) => entry.player.id === options.callerId)
          : undefined;
        const callerScore = callerScoreEntry?.score;
        const callerHasLowest =
          options.reason === "pobudka" &&
          callerScore !== undefined &&
          callerScore <= minScore;

        const lastRoundScores = scores.map((entry) => {
          let penalty = 0;
          if (
            options.reason === "pobudka" &&
            options.callerId &&
            entry.player.id === options.callerId &&
            !callerHasLowest
          ) {
            penalty = 5;
          }
          return { playerId: entry.player.id, score: entry.score, penalty };
        });

        const playersWithNewScores = s.players.map((p) => {
          const roundData = lastRoundScores.find(
            (lrs) => lrs.playerId === p.id,
          )!;
          return {
            ...p,
            score: p.score + roundData.score + roundData.penalty,
          };
        });

        const roundWinner = scores.reduce((prev, curr) =>
          prev.score < curr.score ? prev : curr,
        );
        const gameOver = playersWithNewScores.some((p) => p.score >= 100);

        if (gameOver) {
          const gameWinner = playersWithNewScores.reduce((prev, curr) =>
            prev.score < curr.score ? prev : curr,
          );
          return {
            ...s,
            lastCallerId: options.callerId ?? null,
            players: playersWithNewScores.map((p) => ({
              ...p,
              hand: p.hand.map((h) => ({ ...h, isFaceUp: true })),
            })),
            gamePhase: "game_over",
            gameWinnerName: gameWinner.name,
            lastRoundScores,
            actionMessage: i18n.t('game.gameOver', { player: gameWinner.name }),
          };
        }

        if (options.reason === "deck_exhausted") {
          return {
            ...s,
            lastCallerId: options.callerId ?? null,
            players: playersWithNewScores.map((p) => ({
              ...p,
              hand: p.hand.map((h) => ({ ...h, isFaceUp: true })),
            })),
            gamePhase: "round_end",
            roundWinnerName: roundWinner.player.name,
            lastRoundScores,
            actionMessage: i18n.t('game.deckRanOut', { player: roundWinner.player.name }),
          };
        }

        // POBUDKA resolution
        return {
          ...s,
          lastCallerId: options.callerId ?? null,
          players: playersWithNewScores.map((p) => ({
            ...p,
            hand: p.hand.map((h) => ({ ...h, isFaceUp: true })),
          })),
          gamePhase: "round_end",
          roundWinnerName: roundWinner.player.name,
          lastRoundScores,
          actionMessage: i18n.t('game.calledPobudka', { 
            player: currentPlayer.name, 
            winner: roundWinner.player.name 
          }),
        };
      };

      switch (gameAction.type) {
        case "PEEK_CARD": {
          if (
            state.gamePhase !== "peeking" ||
            !state.peekingState ||
            state.peekingState.peekedCount >= 2
          )
            return state;
          const { playerIndex, peekedCount } = state.peekingState;
          const players = [...state.players];
          const player = players[playerIndex];
          if (
            gameAction.payload.playerId !== player.id ||
            player.hand[gameAction.payload.cardIndex].isFaceUp
          )
            return state;
          const newHand = [...player.hand];
          newHand[gameAction.payload.cardIndex] = {
            ...newHand[gameAction.payload.cardIndex],
            isFaceUp: true,
            hasBeenPeeked: true,
          };
          players[playerIndex] = { ...player, hand: newHand };
          return {
            ...state,
            players,
            peekingState: {
              ...state.peekingState,
              peekedCount: peekedCount + 1,
            },
          };
        }
        case "FINISH_PEEKING": {
          if (state.gamePhase !== "peeking" || !state.peekingState)
            return state;
          const { playerIndex, startIndex = 0 } = state.peekingState;
          const players = state.players.map((p, idx) =>
            idx === playerIndex
              ? {
                ...p,
                hand: p.hand.map((cardInHand) => ({
                  ...cardInHand,
                  isFaceUp: false,
                })),
              }
              : p,
          );
          const nextPlayerIndex = (playerIndex + 1) % state.players.length;
          // If we've looped back to the starting player, peeking is done
          if (nextPlayerIndex === startIndex) {
            const currentPlayerName = players[state.currentPlayerIndex]?.name ?? 'Player';
            return {
              ...state,
              players,
              gamePhase: "playing",
              peekingState: undefined,
              actionMessage: i18n.t('game.gameBegins', { player: currentPlayerName }),
            };
          }
          if (nextPlayerIndex < state.players.length) {
            const nextPlayerName = players[nextPlayerIndex]?.name ?? 'Player';
            return {
              ...state,
              players,
              peekingState: {
                ...state.peekingState,
                playerIndex: nextPlayerIndex,
                peekedCount: 0,
              },
              actionMessage: i18n.t('game.peekTwoCards', { player: nextPlayerName }),
            };
          } else {
            const currentPlayerName = players[state.currentPlayerIndex]?.name ?? 'Player';
            return {
              ...state,
              players,
              gamePhase: "playing",
              peekingState: undefined,
              actionMessage: i18n.t('game.gameBegins', { player: currentPlayerName }),
            };
          }
        }
        case "DRAW_FROM_DECK": {
          if (state.gamePhase !== "playing") return state;
          const newDrawPile = [...state.drawPile];
          const drawnCard = newDrawPile.pop();
          if (!drawnCard) {
            // Deck is exhausted: end the round immediately (no POBUDKA penalty)
            return endRoundWithScores(state, {
              reason: "deck_exhausted",
              callerId: currentPlayer.id,
            });
          }
          return {
            ...state,
            drawPile: newDrawPile,
            drawnCard,
            drawSource: "deck",
            gamePhase: "holding_card",
            lastMove: {
              playerId: currentPlayer.id,
              action: "draw",
              source: "deck",
              timestamp: Date.now(),
            },
            actionMessage: i18n.t('game.drewCard', { player: currentPlayer.name }),
          };
        }
        case "DRAW_FROM_DISCARD": {
          if (state.gamePhase !== "playing" || state.discardPile.length === 0)
            return state;
          const newDiscardPile = [...state.discardPile];
          const drawnCard = newDiscardPile.pop()!;
          return {
            ...state,
            discardPile: newDiscardPile,
            drawnCard,
            drawSource: "discard",
            gamePhase: "holding_card",
            lastMove: {
              playerId: currentPlayer.id,
              action: "draw",
              source: "discard",
              timestamp: Date.now(),
            },
            actionMessage: i18n.t('game.tookFromDiscardMustSwap', { player: currentPlayer.name }),
          };
        }
        case "DISCARD_HELD_CARD": {
          // Cannot discard if drew from discard pile - must swap (per game rules)
          if (state.gamePhase !== "holding_card" || !state.drawnCard || state.drawSource === "discard")
            return state;
          const newDiscardPile = [...state.discardPile, state.drawnCard];
          return advanceTurn({
            ...state,
            discardPile: newDiscardPile,
            lastMove: {
              playerId: currentPlayer.id,
              action: "discard",
              source: state.drawSource ?? undefined,
              timestamp: Date.now(),
            },
            actionMessage: i18n.t('game.discardedDrawnCard', { player: currentPlayer.name }),
          });
        }
        case "SWAP_HELD_CARD": {
          if (state.gamePhase !== "holding_card" || !state.drawnCard)
            return state;
          const { cardIndex } = gameAction.payload;
          const players = [...state.players];
          const player = { ...players[state.currentPlayerIndex] };
          const newHand = [...player.hand];
          const cardToDiscard = newHand[cardIndex].card;

          // Capture source before clearing it
          const source = state.drawSource || "deck";

          newHand[cardIndex] = {
            card: state.drawnCard,
            isFaceUp: false,
            hasBeenPeeked: false,
          };
          player.hand = newHand;
          players[state.currentPlayerIndex] = player;
          const newDiscardPile = [...state.discardPile, cardToDiscard];

          return advanceTurn({
            ...state,
            players,
            discardPile: newDiscardPile,
            lastMove: {
              playerId: currentPlayer.id,
              action: "swap",
              cardIndex,
              source,
              timestamp: Date.now(),
            },
            actionMessage: i18n.t('game.swappedACard', { player: currentPlayer.name }),
          });
        }
        case "USE_SPECIAL_ACTION": {
          if (
            state.gamePhase !== "holding_card" ||
            !state.drawnCard?.isSpecial ||
            state.drawSource !== "deck"
          )
            return state;
          const { specialAction } = state.drawnCard;
          const newDiscardPile = [...state.discardPile, state.drawnCard];

          switch (specialAction) {
            case "peek_1":
              return {
                ...state,
                gamePhase: "action_peek_1",
                discardPile: newDiscardPile,
                drawnCard: null,
                drawSource: null,
                actionMessage: i18n.t('game.usedPeek1', { player: currentPlayer.name }),
              };
            case "swap_2":
              return {
                ...state,
                gamePhase: "action_swap_2_select_1",
                discardPile: newDiscardPile,
                drawnCard: null,
                drawSource: null,
                actionMessage: i18n.t('game.usedSwap2SelectFirst', { player: currentPlayer.name }),
              };
            case "take_2": {
              const newDrawPile = [...state.drawPile];
              const card1 = newDrawPile.pop();
              const card2 = newDrawPile.pop();
              const tempCards = [card1, card2].filter((c) => c) as Card[];
              if (tempCards.length === 0)
                return advanceTurn({
                  ...state,
                  discardPile: newDiscardPile,
                  drawPile: newDrawPile,
                  drawnCard: null,
                  drawSource: null,
                });
              return {
                ...state,
                gamePhase: "action_take_2",
                discardPile: newDiscardPile,
                drawPile: newDrawPile,
                drawnCard: null,
                drawSource: null,
                tempCards,
              };
            }
            default:
              return state;
          }
        }
        case "ACTION_PEEK_1_SELECT": {
          if (state.gamePhase !== "action_peek_1") return state;
          const { playerId, cardIndex } = gameAction.payload;
          const players = state.players.map((p) => {
            if (p.id === playerId) {
              const newHand = p.hand.map((c, i) =>
                i === cardIndex ? { ...c, hasBeenPeeked: true } : c,
              );
              return { ...p, hand: newHand };
            }
            return p;
          });

          return advanceTurn({
            ...state,
            players,
            lastMove: {
              playerId: currentPlayer.id,
              action: "peek",
              targetPlayerId: playerId,
              cardIndex,
              timestamp: Date.now(),
            },
            actionMessage: i18n.t('game.peekedAtCard', { player: currentPlayer.name }),
          });
        }
        case "ACTION_SWAP_2_SELECT": {
          const { playerId, cardIndex } = gameAction.payload;
          if (state.gamePhase === "action_swap_2_select_1") {
            return {
              ...state,
              gamePhase: "action_swap_2_select_2",
              swapState: { card1: { playerId, cardIndex } },
              actionMessage: i18n.t('game.selectSecondCard'),
            };
          }
          if (state.gamePhase === "action_swap_2_select_2" && state.swapState) {
            const { card1 } = state.swapState;
            const card2 = { playerId, cardIndex };

            const player1Index = state.players.findIndex(
              (p) => p.id === card1.playerId,
            )!;
            const player2Index = state.players.findIndex(
              (p) => p.id === card2.playerId,
            )!;

            const newPlayers = JSON.parse(JSON.stringify(state.players));
            const cardToMove1 = newPlayers[player1Index].hand[card1.cardIndex];
            const cardToMove2 = newPlayers[player2Index].hand[card2.cardIndex];

            newPlayers[player1Index].hand[card1.cardIndex] = cardToMove2;
            newPlayers[player2Index].hand[card2.cardIndex] = cardToMove1;

            return advanceTurn({
              ...state,
              players: newPlayers,
              swapState: undefined,
              lastMove: {
                playerId: currentPlayer.id,
                action: "swap_2",
                timestamp: Date.now(),
              },
              actionMessage: i18n.t('game.swappedTwoCards', { player: currentPlayer.name }),
            });
          }
          return state;
        }
        case "ACTION_TAKE_2_CHOOSE": {
          if (state.gamePhase !== "action_take_2" || !state.tempCards)
            return state;
          const chosenCard = gameAction.payload.card;
          const otherCard = state.tempCards.find((c) => c.id !== chosenCard.id);
          const newDiscardPile = otherCard
            ? [...state.discardPile, otherCard]
            : state.discardPile;
          return {
            ...state,
            discardPile: newDiscardPile,
            drawnCard: chosenCard,
            drawSource: "deck",
            gamePhase: "holding_card",
            tempCards: undefined,
            lastMove: {
              playerId: currentPlayer.id,
              action: "take_2",
              timestamp: Date.now(),
            },
            actionMessage: i18n.t('game.choseCardFromTake2', { player: currentPlayer.name }),
          };
        }
        case "CALL_POBUDKA": {
          return endRoundWithScores(state, {
            reason: "pobudka",
            callerId: currentPlayer.id,
          });
        }
        case "START_NEW_ROUND": {
          const deck = shuffleDeck(createDeck());
          const playersWithNewHands = state.players.map((p) => ({
            ...p,
            hand: deck
              .splice(0, 4)
              .map((card) => ({ card, isFaceUp: false, hasBeenPeeked: false })),
          }));
          const discardPile = [deck.pop()!];
          const callerIndex = state.lastCallerId
            ? state.players.findIndex((p) => p.id === state.lastCallerId)
            : state.currentPlayerIndex;
          const nextStartingPlayerIndex =
            callerIndex === -1
              ? 0
              : (callerIndex + 1) % state.players.length;

          return {
            ...initialState,
            gameMode: state.gameMode,
            roomId: state.roomId,
            hostId: state.hostId,
            players: playersWithNewHands,
            drawPile: deck,
            discardPile,
            gamePhase: "peeking",
            currentPlayerIndex: nextStartingPlayerIndex,
            peekingState: {
              playerIndex: nextStartingPlayerIndex,
              peekedCount: 0,
              startIndex: nextStartingPlayerIndex,
            },
            lastMove: null,
            actionMessage: i18n.t('game.peekTwoCards', { player: playersWithNewHands[nextStartingPlayerIndex].name }),
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
  startHotseatGame: (playerNames: string[]) => void;
  startGame: () => Promise<void>;
  broadcastAction: (action: GameAction) => void;
  sendChatMessage: (message: string) => void;
  playSound: (sound: SoundType) => void;
}

export const GameContext = createContext<GameContextType>({
  state: initialState,
  myPlayerId: null,
  createRoom: async () => { },
  joinRoom: async () => { },
  startHotseatGame: () => { },
  startGame: async () => { },
  broadcastAction: () => { },
  sendChatMessage: () => { },
  playSound: () => { },
});

export const GameProvider = ({ children }: { children: ReactNode }) => {
  const state = useGameStore((s) => s.state);
  const setState = useGameStore((s) => s.setState);
  const myPlayerId = useGameStore((s) => s.myPlayerId);
  const setMyPlayerId = useGameStore((s) => s.setMyPlayerId);
  const { playSound } = useSounds();
  const lastSyncedStateRef = useRef<GameState | null>(null);
  const gameStartTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentStateRef = useRef<GameState>(state);

  const dispatch = useCallback(
    (action: ReducerAction) => {
      setState((current) => gameReducer(current, action));
    },
    [setState],
  );

  // Determine the viewer ID based on game mode and phase
  // In online mode: always the local player
  // In hotseat mode during peeking: the player who is currently peeking
  // In hotseat mode otherwise: the current player whose turn it is
  const viewerId = useMemo(() => {
    if (state.gameMode === "online") {
      return myPlayerId;
    }
    // Hotseat mode
    if (state.gamePhase === "peeking" && state.peekingState) {
      return state.players[state.peekingState.playerIndex]?.id ?? null;
    }
    return state.players[state.currentPlayerIndex]?.id ?? null;
  }, [state.gameMode, state.gamePhase, state.peekingState, state.players, state.currentPlayerIndex, myPlayerId]);
  
  const visibleState = useMemo(
    () => getVisibleStateForViewer(state, viewerId),
    [state, viewerId],
  );

  // Keep ref in sync with state
  useEffect(() => {
    currentStateRef.current = state;
  }, [state]);

  // Convex mutations
  const createRoomMutation = useMutation(api.rooms.createRoom);
  const joinRoomMutation = useMutation(api.rooms.joinRoom);
  const setGameStateMutation = useMutation(api.games.setGameState);
  const sendMessageMutation = useMutation(api.chat.sendMessage);
  const updatePresenceMutation = useMutation(api.rooms.updatePlayerPresence);

  // Convex queries - subscribe to game state and chat
  const remoteGameState = useQuery(
    api.games.getGameState,
    state.gameMode === "online" && state.roomId
      ? { roomId: state.roomId }
      : "skip",
  );

  const remoteMessages = useQuery(
    api.chat.getMessages,
    state.gameMode === "online" && state.roomId
      ? { roomId: state.roomId }
      : "skip",
  );

  const remotePlayers = useQuery(
    api.rooms.getPlayers,
    state.gameMode === "online" && state.roomId
      ? { roomId: state.roomId }
      : "skip",
  );

  // Sync remote game state to local state
  useEffect(() => {
    if (!remoteGameState || state.gameMode !== "online") {
      return;
    }

    const remoteState = remoteGameState as GameState;
    
    // Use a simpler comparison: only check key fields that matter for sync
    const remoteKey = `${remoteState.gamePhase}-${remoteState.currentPlayerIndex}-${remoteState.turnCount}-${remoteState.peekingState?.playerIndex ?? 'none'}-${remoteState.peekingState?.peekedCount ?? 0}`;
    const lastKey = lastSyncedStateRef.current 
      ? `${lastSyncedStateRef.current.gamePhase}-${lastSyncedStateRef.current.currentPlayerIndex}-${lastSyncedStateRef.current.turnCount}-${lastSyncedStateRef.current.peekingState?.playerIndex ?? 'none'}-${lastSyncedStateRef.current.peekingState?.peekedCount ?? 0}`
      : null;

    // During peeking phase, preserve local peeked card visibility
    // The key insight: peeked cards should only be visible locally to the player who peeked them
    let finalState = remoteState;

    if (remoteState.gamePhase === "peeking" && myPlayerId) {
      const currentState = currentStateRef.current;
      const localPlayer = currentState.players.find((p) => p.id === myPlayerId);
      const remotePlayer = remoteState.players.find((p) => p.id === myPlayerId);

      if (localPlayer && remotePlayer && localPlayer.hand.length === remotePlayer.hand.length) {
        // Preserve our locally peeked cards (only for our own hand)
        const mergedHand = remotePlayer.hand.map((remoteCard, index) => {
          const localCard = localPlayer.hand[index];
          // If we peeked this card locally, preserve the local view
          if (localCard && localCard.hasBeenPeeked && localCard.isFaceUp) {
            return { ...remoteCard, isFaceUp: true, hasBeenPeeked: true };
          }
          return remoteCard;
        });

        finalState = {
          ...remoteState,
          players: remoteState.players.map((p) =>
            p.id === myPlayerId
              ? { ...p, hand: mergedHand }
              : p,
          ),
        };
      }
    }

    // Always update if game phase or turn changed, or if it's a meaningful state change
    const shouldUpdate = remoteKey !== lastKey || 
      JSON.stringify(remoteState.players.map(p => p.score)) !== JSON.stringify(currentStateRef.current.players.map(p => p.score)) ||
      remoteState.drawPile.length !== currentStateRef.current.drawPile.length ||
      remoteState.discardPile.length !== currentStateRef.current.discardPile.length;

    if (shouldUpdate) {
      dispatch({ type: "SET_STATE", payload: finalState });
      lastSyncedStateRef.current = finalState;
    }
  }, [remoteGameState, state.gameMode, myPlayerId, dispatch]);

  // Sync remote chat messages
  useEffect(() => {
    if (remoteMessages && state.gameMode === "online") {
      const chatMessages: ChatMessage[] = remoteMessages.map((msg) => ({
        id: msg._id,
        senderId: msg.senderId,
        senderName: msg.senderName,
        message: msg.message,
        timestamp: msg.timestamp,
      }));
      dispatch({ type: "SET_CHAT_MESSAGES", payload: chatMessages });
    }
  }, [remoteMessages, state.gameMode, dispatch]);

  // Handle player presence
  useEffect(() => {
    if (remotePlayers && state.gameMode === "online") {
      const activePlayers = remotePlayers.filter(
        (p) => Date.now() - p.lastSeenAt < 30000, // 30 second timeout
      );

      // Check if a player left (only if game has started)
      // Use a longer timeout to avoid false positives during initial join
      const longTimeoutPlayers = remotePlayers.filter(
        (p) => Date.now() - p.lastSeenAt < 60000, // 60 second timeout for leaving detection
      );

      if (
        state.players.length === 2 &&
        longTimeoutPlayers.length < 2 &&
        state.gamePhase !== "lobby" &&
        state.gamePhase !== "peeking" // Don't reset during initial setup
      ) {
        toast.warning("Opponent has left. Game reset.");
        sessionStorage.clear();
        setMyPlayerId(null);
        dispatch({ type: "SET_STATE", payload: initialState });
        return;
      }

      // Check if a new player joined (host only)
      // We no longer auto-start the game. Host must click "Start Game".
      if (
        state.hostId === myPlayerId &&
        state.gamePhase === "lobby"
      ) {
        const newPlayers = activePlayers.filter(
          (p) => !state.players.some((existing) => existing.id === p.playerId)
        );

        if (newPlayers.length > 0) {
          const updatedPlayers = [...state.players];
          let changed = false;

          newPlayers.forEach((newPlayerData) => {
            if (
              updatedPlayers.length < 5 &&
              !updatedPlayers.some((p) => p.id === newPlayerData.playerId)
            ) {
              toast.info(`${newPlayerData.name} has joined the room.`);
              updatedPlayers.push({
                id: newPlayerData.playerId,
                name: newPlayerData.name,
                hand: [],
                score: 0,
              });
              changed = true;
            }
          });

          if (updatedPlayers.length >= 5 && newPlayers.length > 0) {
            toast.error("Room is full (max 5 players for Sen).");
          }

          if (changed) {
            // Update local state with new players
            dispatch({
              type: "SET_STATE",
              payload: { ...state, players: updatedPlayers }
            });

            // Sync to remote to ensure everyone sees the updated player list
            // Note: This might be redundant if we trust the presence system, 
            // but it ensures the "players" array in game state is accurate.
            // However, we should be careful not to overwrite game state if a game is running.
            // Since we are in "lobby", it's safe.
            setGameStateMutation({
              roomId: state.roomId!,
              state: { ...state, players: updatedPlayers },
            });
          }
        }
      }


      // Cleanup timeout on unmount or when conditions change
      return () => {
        if (gameStartTimeoutRef.current) {
          clearTimeout(gameStartTimeoutRef.current);
          gameStartTimeoutRef.current = null;
        }
      };
    }
  }, [remotePlayers, state, myPlayerId, setGameStateMutation, dispatch, setMyPlayerId]);

  // Update presence periodically
  useEffect(() => {
    if (state.gameMode === "online" && state.roomId && myPlayerId) {
      const interval = setInterval(() => {
        updatePresenceMutation({ roomId: state.roomId!, playerId: myPlayerId });
      }, 10000); // Every 10 seconds

      return () => clearInterval(interval);
    }
  }, [state.gameMode, state.roomId, myPlayerId, updatePresenceMutation]);

  // Reconnection logic
  useEffect(() => {
    const reconnect = async () => {
      const storedPlayerId = sessionStorage.getItem("sen-playerId");
      const storedRoomId = sessionStorage.getItem("sen-roomId");
      const storedPlayerName = sessionStorage.getItem("sen-playerName");

      if (storedPlayerId && storedRoomId && storedPlayerName) {
        setMyPlayerId(storedPlayerId);
        try {
          await joinRoomMutation({
            roomId: storedRoomId,
            playerId: storedPlayerId,
            name: storedPlayerName,
          });
          toast.info(`Reconnected to room ${storedRoomId}.`);
        } catch (error) {
          console.error("Reconnection failed:", error);
          sessionStorage.clear();
        }
      }
    };
    reconnect();
  }, [joinRoomMutation, setMyPlayerId]);

  const processAndBroadcastAction = useCallback(
    async (action: GameAction) => {
      // Play sounds for actions
      switch (action.type) {
        case "PEEK_CARD":
        case "SWAP_HELD_CARD":
        case "ACTION_PEEK_1_SELECT":
          playSound("flip");
          break;
        case "DRAW_FROM_DECK":
        case "DRAW_FROM_DISCARD":
          playSound("draw");
          break;
        case "CALL_POBUDKA":
          playSound("pobudka");
          break;
      }

      // Dispatch action locally - state sync will happen via useEffect
      dispatch({ type: "PROCESS_ACTION", payload: { action, isLocal: true } });
    },
    [dispatch, playSound],
  );

  // Sanitize game state for syncing - hide peeked cards from opponents
  const sanitizeStateForSync = useCallback((gameState: GameState): GameState => {
    // During peeking phase, all cards should be synced as face-down
    // Each player sees their own peeked cards locally, but we don't sync that visibility
    if (gameState.gamePhase === "peeking") {
      return {
        ...gameState,
        players: gameState.players.map((player) => ({
          ...player,
          hand: player.hand.map((cardInHand) => ({
            ...cardInHand,
            // Keep hasBeenPeeked for tracking, but hide the card visually when syncing
            isFaceUp: false,
          })),
        })),
      };
    }
    return gameState;
  }, []);

  // Sync local state changes to Convex (for online games)
  // Only sync if state actually changed and it's not from a remote update
  useEffect(() => {
    if (
      state.gameMode === "online" &&
      state.roomId &&
      remoteGameState // Only sync if we have a remote state to compare
    ) {
      // Sanitize state before syncing to hide peeked cards
      const sanitizedState = sanitizeStateForSync(state);
      const currentStateStr = JSON.stringify(sanitizedState);
      const lastSyncedStr = lastSyncedStateRef.current
        ? JSON.stringify(lastSyncedStateRef.current)
        : null;
      const remoteStateStr = JSON.stringify(remoteGameState);

      // Only sync if:
      // 1. Local state differs from what we last synced
      // 2. Local state differs from remote state (we made a change)
      if (
        currentStateStr !== lastSyncedStr &&
        currentStateStr !== remoteStateStr
      ) {
        // Debounce rapid updates
        const timeoutId = setTimeout(async () => {
          try {
            await setGameStateMutation({
              roomId: state.roomId!,
              state: sanitizedState,
            });
            lastSyncedStateRef.current = sanitizedState;
          } catch (error) {
            console.error("Failed to sync game state:", error);
          }
        }, 100);

        return () => clearTimeout(timeoutId);
      }
    }
  }, [state, remoteGameState, setGameStateMutation, sanitizeStateForSync]);

  const sendChatMessage = useCallback(
    async (message: string) => {
      if (state.gameMode !== "online" || !state.roomId || !myPlayerId) return;
      const me = state.players.find((p) => p.id === myPlayerId);
      if (!me) return;

      const chatMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        senderId: myPlayerId,
        senderName: me.name,
        message,
        timestamp: Date.now(),
      };

      dispatch({ type: "ADD_CHAT_MESSAGE", payload: chatMessage });
      playSound("chat");

      try {
        await sendMessageMutation({
          roomId: state.roomId,
          senderId: myPlayerId,
          senderName: me.name,
          message,
        });
      } catch (error) {
        console.error("Failed to send chat message:", error);
      }
    },
    [dispatch, myPlayerId, playSound, sendMessageMutation, state],
  );

  const createRoom = useCallback(
    async (playerName: string) => {
      const roomId = `sen-${Math.random().toString(36).substr(2, 6)}`;
      const playerId = `player-${Math.random().toString(36).substr(2, 9)}`;
      const newPlayer: Player = {
        id: playerId,
        name: playerName,
        hand: [],
        score: 0,
      };
      const newState: GameState = {
        ...initialState,
        gameMode: "online",
        roomId,
        hostId: playerId,
        players: [newPlayer],
        actionMessage: i18n.t('game.roomCreated', { roomId }),
      };

      try {
        await createRoomMutation({
          roomId,
          hostId: playerId,
          hostName: playerName,
        });

        setMyPlayerId(playerId);
        sessionStorage.setItem("sen-playerId", playerId);
        sessionStorage.setItem("sen-roomId", roomId);
        sessionStorage.setItem("sen-playerName", playerName);

        dispatch({ type: "SET_STATE", payload: newState });
        toast.success(
          `Room created! Your ID is ${roomId}. Share it with a friend.`,
        );
      } catch (error) {
        console.error("Failed to create room:", error);
        toast.error("Could not create room. Please try again.");
      }
    },
    [createRoomMutation, dispatch, setMyPlayerId],
  );

  const joinRoom = useCallback(
    async (roomId: string, playerName: string) => {
      const playerId = `player-${Math.random().toString(36).substr(2, 9)}`;

      // Retry logic for joining (in case room isn't created yet)
      let retries = 5;
      let lastError: Error | null = null;

      while (retries > 0) {
        try {
          await joinRoomMutation({
            roomId,
            playerId,
            name: playerName,
          });

          // Initialize local state for the joining player
          const joinState: GameState = {
            ...initialState,
            gameMode: "online",
            roomId,
            hostId: null, // Will be set when we get remote state
            players: [
              {
                id: playerId,
                name: playerName,
                hand: [],
                score: 0,
              },
            ],
            actionMessage: i18n.t('game.joinedRoom', { roomId }),
          };

          setMyPlayerId(playerId);
          sessionStorage.setItem("sen-playerId", playerId);
          sessionStorage.setItem("sen-roomId", roomId);
          sessionStorage.setItem("sen-playerName", playerName);

          dispatch({ type: "SET_STATE", payload: joinState });
          toast.success(`Joined room ${roomId}! Waiting for game to sync.`);
          return;
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          if (lastError.message.includes("Room not found") && retries > 1) {
            // Wait a bit and retry
            await new Promise((resolve) => setTimeout(resolve, 500));
            retries--;
          } else {
            break;
          }
        }
      }

      console.error("Failed to join room:", lastError);
      const message =
        lastError instanceof Error
          ? lastError.message
          : "Failed to join room.";
      toast.error(message);
    },
    [dispatch, joinRoomMutation, setMyPlayerId],
  );

  const startGame = useCallback(async () => {
    if (state.players.length < 2) {
      toast.error("Need at least 2 players to start.");
      return;
    }

    if (state.players.length > 5) {
      toast.error("Maximum 5 players are allowed in Sen.");
      return;
    }

    const deck = shuffleDeck(createDeck());
    const playersWithCards = state.players.map((p) => ({
      ...p,
      hand: deck
        .splice(0, 4)
        .map((card) => ({
          card,
          isFaceUp: false,
          hasBeenPeeked: false,
        })),
    }));
    const discardPile = [deck.pop()!];

    const startPeekingState: GameState = {
      ...state,
      gameMode: "online",
      players: playersWithCards,
      drawPile: deck,
      discardPile,
      gamePhase: "peeking",
      actionMessage: i18n.t('game.peekTwoCards', { player: playersWithCards[0].name }),
      peekingState: { playerIndex: 0, peekedCount: 0 },
    };

    // Save to Convex
    await setGameStateMutation({
      roomId: state.roomId!,
      state: startPeekingState,
    });
    dispatch({ type: "SET_STATE", payload: startPeekingState });
  }, [dispatch, setGameStateMutation, state]);

  const startHotseatGame = useCallback(
    (playerNames: string[]) => {
      if (playerNames.length < 2 || playerNames.length > 5) {
        toast.error("Sen supports 2 to 5 dreamers.");
        return;
      }

      const allPlayers = playerNames.map((name, index) => ({
        id: `player-${index + 1}`,
        name,
        hand: [],
        score: 0,
      }));

      const deck = shuffleDeck(createDeck());
      const playersWithCards = allPlayers.map((p) => ({
        ...p,
        hand: deck
          .splice(0, 4)
          .map((card) => ({ card, isFaceUp: false, hasBeenPeeked: false })),
      }));
      const discardPile = [deck.pop()!];

      const startPeekingState: GameState = {
        ...initialState,
        gameMode: "hotseat",
        players: playersWithCards,
        drawPile: deck,
        discardPile,
        gamePhase: "peeking",
        actionMessage: i18n.t('game.peekTwoCards', { player: playersWithCards[0].name }),
        peekingState: { playerIndex: 0, peekedCount: 0 },
      };
      dispatch({ type: "SET_STATE", payload: startPeekingState });
    },
    [dispatch],
  );

  return (
    <GameContext.Provider
      value={{
        state: visibleState,
        myPlayerId,
        createRoom,
        joinRoom,
        startHotseatGame,
        startGame,
        broadcastAction: processAndBroadcastAction,
        sendChatMessage,
        playSound,
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => useContext(GameContext);

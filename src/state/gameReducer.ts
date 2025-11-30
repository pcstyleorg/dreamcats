import i18n from "@/i18n/config";
import { GameAction, GameState, Player, Card } from "@/types";

export type ReducerAction =
  | { type: "SET_STATE"; payload: GameState }
  | {
      type: "PROCESS_ACTION";
      payload: { action: GameAction; isLocal?: boolean };
    }
  | { type: "ADD_CHAT_MESSAGE"; payload: GameState["chatMessages"][number] }
  | { type: "SET_CHAT_MESSAGES"; payload: GameState["chatMessages"] };

const isRevealPhase = (phase: GameState["gamePhase"]) =>
  phase === "round_end" || phase === "game_over";

export const getVisibleStateForViewer = (
  state: GameState,
  viewerId: string | null,
): GameState => {
  if (!viewerId) return state;
  const revealAll = isRevealPhase(state.gamePhase);

  const players = state.players.map((player) => {
    if (revealAll || player.id === viewerId) return player;

    return {
      ...player,
      hand: player.hand.map((slot) => ({
        ...slot,
        isFaceUp: false,
        hasBeenPeeked: false,
      })),
    };
  });

  return { ...state, players };
};

export const gameReducer = (state: GameState, action: ReducerAction): GameState => {
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
          actionMessage: i18n.t("game.playerTurn", {
            player: s.players[nextPlayerIndex].name,
          }),
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
        // Per RULES §6: If caller ties for lowest, no penalty is applied (callerScore <= minScore)
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

        // Check for game over first - this takes precedence over deck exhaustion
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
            actionMessage: i18n.t("game.gameOver", {
              player: gameWinner.name,
            }),
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
            actionMessage: i18n.t("game.deckRanOut", {
              player: roundWinner.player.name,
            }),
          };
        }

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
          actionMessage: i18n.t("game.calledPobudka", {
            player: currentPlayer.name,
            winner: roundWinner.player.name,
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

          const newPeekedCount = peekedCount + 1;
          if (newPeekedCount >= 2) {
            // Clear peekingState immediately when transitioning to playing phase
            return {
              ...state,
              players,
              gamePhase: "playing",
              currentPlayerIndex: (playerIndex + 1) % players.length,
              turnCount: state.turnCount + 1,
              peekingState: undefined,
              actionMessage: i18n.t("game.playerTurn", {
                player: players[(playerIndex + 1) % players.length].name,
              }),
            };
          }

          return {
            ...state,
            players,
            peekingState: { ...state.peekingState, peekedCount: newPeekedCount },
          };
        }

        case "FINISH_PEEKING": {
          if (
            state.gamePhase !== "peeking" ||
            !state.peekingState ||
            state.peekingState.peekedCount < 2
          )
            return state;

          return {
            ...state,
            gamePhase: "playing",
            currentPlayerIndex:
              (state.peekingState.playerIndex + 1) % state.players.length,
            actionMessage: i18n.t("game.playerTurn", {
              player:
                state.players[
                  (state.peekingState.playerIndex + 1) % state.players.length
                ].name,
            }),
            turnCount: state.turnCount + 1,
            peekingState: undefined,
          };
        }

        case "DRAW_FROM_DECK": {
          if (state.gamePhase !== "playing") return state;

          let drawPile = [...state.drawPile];
          let discardPile = state.discardPile;

          // If deck is empty, reshuffle discard pile back into deck
          if (drawPile.length === 0) {
            // Keep the top card of discard pile, shuffle rest back
            if (state.discardPile.length > 1) {
              const discardClone = [...state.discardPile];
              const topDiscardCard = discardClone.pop()!;
              const deckRebuilt = discardClone.sort(() => Math.random() - 0.5);
              drawPile = deckRebuilt;
              discardPile = [topDiscardCard];

              // If still no cards after reshuffle, end round
              if (drawPile.length === 0) {
                return endRoundWithScores(state, { reason: "deck_exhausted" });
              }
            } else {
              // Can't reshuffle with only 0-1 cards in discard pile, end round
              return endRoundWithScores(state, { reason: "deck_exhausted" });
            }
          }

          const drawnCard = drawPile.pop()!;

          return {
            ...state,
            drawPile,
            discardPile,
            drawnCard,
            drawSource: "deck",
            gamePhase: drawnCard.isSpecial ? "action_take_2" : "holding_card",
            actionMessage: drawnCard.isSpecial
              ? i18n.t("game.drewSpecial", { action: drawnCard.specialAction ?? "Unknown" })
              : i18n.t("game.drewCard"),
            lastMove: {
              playerId: currentPlayer.id,
              action: "draw",
              source: "deck",
              timestamp: Date.now(),
            },
          };
        }

        case "DRAW_FROM_DISCARD": {
          if (
            state.gamePhase !== "playing" ||
            state.discardPile.length === 0 ||
            !state.discardPile[state.discardPile.length - 1]
          ) {
            return state;
          }

          const discardPile = [...state.discardPile];
          const drawnCard = discardPile.pop()!;

          return {
            ...state,
            discardPile,
            drawnCard,
            drawSource: "discard",
            gamePhase: "holding_card",
            actionMessage: i18n.t("game.drewFromDiscard"),
            lastMove: {
              playerId: currentPlayer.id,
              action: "draw",
              source: "discard",
              timestamp: Date.now(),
            },
          };
        }

        case "DISCARD_HELD_CARD": {
          if (
            state.gamePhase !== "holding_card" ||
            !state.drawnCard ||
            !state.drawSource ||
            state.drawSource === "discard"
          )
            return state;

          const discardPile = [...state.discardPile, state.drawnCard];

          return advanceTurn({
            ...state,
            discardPile,
            drawnCard: null,
            drawSource: null,
            lastMove: {
              playerId: currentPlayer.id,
              action: "discard",
              timestamp: Date.now(),
            },
          });
        }

        case "SWAP_HELD_CARD": {
          if (
            state.gamePhase !== "holding_card" ||
            !state.drawnCard ||
            !state.drawSource
          )
            return state;

          const players = [...state.players];
          const current = { ...players[state.currentPlayerIndex] };
          const hand = [...current.hand];

          const replacedCard = hand[gameAction.payload.cardIndex]?.card;
          if (!replacedCard) return state;

          hand[gameAction.payload.cardIndex] = {
            card: state.drawnCard,
            isFaceUp: false,
            hasBeenPeeked: false,
          };

          current.hand = hand;
          players[state.currentPlayerIndex] = current;

          const discardPile = [...state.discardPile, replacedCard];

          return advanceTurn({
            ...state,
            players,
            discardPile,
            drawnCard: null,
            drawSource: null,
            lastMove: {
              playerId: currentPlayer.id,
              action: "swap",
              cardIndex: gameAction.payload.cardIndex,
              timestamp: Date.now(),
            },
          });
        }

        case "USE_SPECIAL_ACTION": {
          if (
            state.gamePhase !== "holding_card" ||
            !state.drawnCard ||
            !state.drawnCard.specialAction
          )
            return state;

          const specialAction = state.drawnCard.specialAction;

          if (specialAction === "take_2") {
            const drawPile = [...state.drawPile];
            const tempCards: Card[] = [];
            // Draw up to 2 cards
            for (let i = 0; i < 2; i++) {
              if (drawPile.length > 0) {
                tempCards.push(drawPile.pop()!);
              }
            }

            // Discard the used special card
            const discardPile = [...state.discardPile, state.drawnCard];

            return {
              ...state,
              gamePhase: "action_take_2",
              drawPile,
              discardPile,
              drawnCard: null,
              tempCards,
              actionMessage: i18n.t("game.specialAction", {
                action: specialAction,
              }),
            };
          }

          const actionPhaseMap: Record<
            "take_2" | "peek_1" | "swap_2",
            GameState["gamePhase"]
          > = {
            take_2: "action_take_2",
            peek_1: "action_peek_1",
            swap_2: "action_swap_2_select_1",
          };

          return {
            ...state,
            gamePhase: actionPhaseMap[specialAction],
            actionMessage: i18n.t("game.specialAction", {
              action: specialAction,
            }),
          };
        }

        case "ACTION_PEEK_1_SELECT": {
          if (state.gamePhase !== "action_peek_1") return state;

          const players = state.players.map((player) => {
            if (player.id !== gameAction.payload.playerId) return player;

            const hand = player.hand.map((card, idx) =>
              idx === gameAction.payload.cardIndex
                ? { ...card, isFaceUp: false, hasBeenPeeked: true } // Keep face-down, only mark as peeked
                : card,
            );

            return { ...player, hand };
          });

          const discardPile = [...state.discardPile, state.drawnCard!];

          return advanceTurn({
            ...state,
            players,
            discardPile,
            drawnCard: null,
            drawSource: null,
            lastMove: {
              playerId: currentPlayer.id,
              action: "peek",
              targetPlayerId: gameAction.payload.playerId,
              timestamp: Date.now(),
            },
          });
        }

        case "ACTION_SWAP_2_SELECT": {
          if (
            state.gamePhase !== "action_swap_2_select_1" &&
            state.gamePhase !== "action_swap_2_select_2"
          )
            return state;

          const players = [...state.players];

          if (state.gamePhase === "action_swap_2_select_1") {
            // BUG FIX: Use payload.playerId instead of currentPlayerId
            // Swap 2 allows selecting ANY player's card, not just current player
            const card1 = {
              playerId: gameAction.payload.playerId,
              cardIndex: gameAction.payload.cardIndex,
            };
            return {
              ...state,
              gamePhase: "action_swap_2_select_2",
              swapState: { card1 },
              actionMessage: i18n.t("game.selectSecondCard"),
            };
          }

          const card1 = state.swapState?.card1;
          if (!card1) return state;

          const getCard = (player: Player, index: number) => player.hand[index];
          const setCard = (player: Player, index: number, value: Player["hand"][number]) => {
            const hand = [...player.hand];
            hand[index] = value;
            return { ...player, hand };
          };

          const playerAIndex = players.findIndex((p) => p.id === card1.playerId);
          const playerBIndex = players.findIndex(
            (p) => p.id === gameAction.payload.playerId,
          );
          if (playerAIndex === -1 || playerBIndex === -1) return state;

          const playerA = players[playerAIndex];
          const playerB = players[playerBIndex];

          const cardA = getCard(playerA, card1.cardIndex);
          const cardB = getCard(playerB, gameAction.payload.cardIndex);
          if (!cardA || !cardB) return state;

          players[playerAIndex] = setCard(playerA, card1.cardIndex, cardB);
          players[playerBIndex] = setCard(playerB, gameAction.payload.cardIndex, cardA);

          const discardPile = [...state.discardPile, state.drawnCard!];

          // Build card2 details for swap2Details
          const card2 = {
            playerId: gameAction.payload.playerId,
            cardIndex: gameAction.payload.cardIndex,
          };

          return advanceTurn({
            ...state,
            players,
            discardPile,
            drawnCard: null,
            drawSource: null,
            swapState: undefined,
            lastMove: {
              playerId: currentPlayer.id,
              action: "swap_2",
              timestamp: Date.now(),
              swap2Details: {
                card1,
                card2,
              },
            },
          });
        }

        case "ACTION_TAKE_2_CHOOSE": {
          if (state.gamePhase !== "action_take_2" || !state.tempCards)
            return state;

          const chosenCard = gameAction.payload.card;
          const otherCard = state.tempCards.find((c) => c.id !== chosenCard.id);

          // Discard the one not chosen
          const discardPile = otherCard
            ? [...state.discardPile, otherCard]
            : state.discardPile;

          return {
            ...state,
            gamePhase: "holding_card",
            drawnCard: chosenCard,
            drawSource: "deck", // Treat as drawn from deck for button visibility
            discardPile,
            tempCards: undefined,
            actionMessage: i18n.t("game.keptCard", {
              player: currentPlayer.name,
            }),
            lastMove: {
              playerId: currentPlayer.id,
              action: "take_2",
              timestamp: Date.now(),
            },
          };
        }

        case "CALL_POBUDKA": {
          if (state.gamePhase !== "playing") return state;

          return endRoundWithScores(state, {
            reason: "pobudka",
            callerId: currentPlayer.id,
          });
        }

        case "START_NEW_ROUND": {
          if (state.gamePhase !== "round_end") return state;
          const playerCards = state.players.flatMap((player) =>
            player.hand.map((handSlot) => handSlot.card)
          );
          const pendingCards = [
            ...(state.tempCards ?? []),
            ...(state.drawnCard ? [state.drawnCard] : []),
          ];
          const deck = [
            ...state.drawPile,
            ...state.discardPile,
            ...playerCards,
            ...pendingCards,
          ];

          // Hand validation: ensure deck has enough cards for all players plus one for discard
          const requiredCards = state.players.length * 4 + 1;
          if (deck.length < requiredCards) {
            console.error(`Not enough cards to deal. Need ${requiredCards}, have ${deck.length}`);
            return state;
          }

          // Fisher-Yates shuffle for better randomness (client-side fallback)
          const shuffled = [...deck];
          for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
          }

          const players = state.players.map((p) => ({
            ...p,
            hand: shuffled
              .splice(0, 4)
              .map((card) => ({
                card,
                isFaceUp: false,
                hasBeenPeeked: false,
              })),
          }));

          const discardPile = [shuffled.pop()!];

          return {
            ...state,
            players,
            drawPile: shuffled,
            discardPile,
            currentPlayerIndex: 0,
            gamePhase: "peeking",
            peekingState: { playerIndex: 0, peekedCount: 0 },
            actionMessage: i18n.t("game.peekTwoCards", {
              player: players[0].name,
            }),
            drawnCard: null,
            drawSource: null,
            tempCards: undefined,
            swapState: undefined,
            lastMove: null,
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

export const sanitizeStateForSync = (gameState: GameState, currentPlayerId: string | null): GameState => {
  if (gameState.gamePhase !== "peeking" || !currentPlayerId) {
    return gameState;
  }

  const sanitizedPlayers = gameState.players.map((player) => {
    if (player.id === currentPlayerId) {
      const sanitizedHand = player.hand.map((cardInHand) => {
        if (cardInHand.hasBeenPeeked && cardInHand.isFaceUp) {
          return { ...cardInHand, isFaceUp: false };
        }
        return cardInHand;
      });
      return { ...player, hand: sanitizedHand };
    } else {
      const sanitizedHand = player.hand.map((cardInHand) => {
        if (cardInHand.hasBeenPeeked && cardInHand.isFaceUp) {
          return { ...cardInHand, isFaceUp: false };
        }
        return cardInHand;
      });
      return { ...player, hand: sanitizedHand };
    }
  });

  return {
    ...gameState,
    players: sanitizedPlayers,
  };
};

export const mergePeekedHandState = (
  remoteState: GameState,
  localState: GameState,
  viewerId: string | null,
): GameState => {
  if (remoteState.gamePhase !== "peeking" || !viewerId) return remoteState;
  const localPlayer = localState.players.find((p) => p.id === viewerId);
  const remotePlayer = remoteState.players.find((p) => p.id === viewerId);
  if (!localPlayer || !remotePlayer) return remoteState;

  const hasLocalPeekedCards = localPlayer.hand.some(
    (card) => card.hasBeenPeeked && card.isFaceUp,
  );
  if (!hasLocalPeekedCards) return remoteState;

  const mergedHand = localPlayer.hand.map((localCard, index) => {
    const remoteCard = remotePlayer.hand[index];
    if (localCard.hasBeenPeeked && localCard.isFaceUp) {
      return localCard;
    }
    return remoteCard ?? localCard;
  });

  return {
    ...remoteState,
    players: remoteState.players.map((p) =>
      p.id === viewerId ? { ...p, hand: mergedHand } : p,
    ),
  };
};

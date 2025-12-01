import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { GameAction, GameState, Player, Card } from "./types";
import { createDeck, shuffleDeck } from "./game_core";

// Helper to clone state for mutation (though we can mutate directly in Convex if we are careful,
// but treating it immutably first is safer for logic porting)
// const clone = <T>(obj: T): T => JSON.parse(JSON.stringify(obj));

export const performAction = mutation({
  args: {
    roomId: v.string(),
    playerId: v.string(),
    action: v.any(), // We'll validate this against GameAction type manually
    idempotencyKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { roomId, playerId, idempotencyKey } = args;
    const action = args.action as GameAction;

    const gameRecord = await ctx.db
      .query("games")
      .withIndex("by_roomId", (q) => q.eq("roomId", roomId))
      .first();

    if (!gameRecord) {
      throw new Error("Game not found");
    }

    // Check if this action was already processed (idempotency)
    if (idempotencyKey) {
      if (gameRecord.idempotencyKey === idempotencyKey) {
        // Action already processed, return without error
        return;
      }
    }

    const state = gameRecord.state as GameState;

    // --- VALIDATION & LOGIC ---

    // Helper to save state
    const saveState = async (newState: GameState) => {
      await ctx.db.patch(gameRecord._id, {
        state: newState,
        lastUpdated: Date.now(),
        version: (gameRecord.version || 0) + 1,
        ...(idempotencyKey && { idempotencyKey }),
      });
    };

    const currentPlayer = state.players[state.currentPlayerIndex];
    const isMyTurn = currentPlayer?.id === playerId;

    // Helper to advance turn
    const advanceTurn = (s: GameState): GameState => {
      const nextPlayerIndex = (s.currentPlayerIndex + 1) % s.players.length;
      return {
        ...s,
        currentPlayerIndex: nextPlayerIndex,
        turnCount: s.turnCount + 1,
        actionMessage: `It's ${s.players[nextPlayerIndex].name}'s turn`, // Simple message, can be localized on client
        drawnCard: null,
        drawSource: null,
        gamePhase: "playing",
      };
    };

    // Helper to end round
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
            actionMessage: `${gameWinner.name} wins the game!`,
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
          actionMessage: options.reason === "pobudka" 
            ? `${currentPlayer.name} called Pobudka! Winner: ${roundWinner.player.name}`
            : `Deck exhausted! Winner: ${roundWinner.player.name}`,
        };
      };


    // --- ACTION HANDLERS ---

    switch (action.type) {
      case "PEEK_CARD": {
        if (state.gamePhase !== "peeking" || !state.peekingState) throw new Error("Not peeking phase");
        
        // Validate turn
        const peekingPlayer = state.players[state.peekingState.playerIndex];
        if (peekingPlayer.id !== playerId) throw new Error("Not your turn to peek");
        
        // Validate target (MUST be own hand)
        if (action.payload.playerId !== playerId) throw new Error("Can only peek your own cards");
        
        // Validate bounds
        if (action.payload.cardIndex < 0 || action.payload.cardIndex >= peekingPlayer.hand.length) throw new Error("Invalid card index");

        const players = [...state.players];
        const playerIndex = state.peekingState.playerIndex;
        const player = players[playerIndex];
        
        // Check if already face up
        if (player.hand[action.payload.cardIndex].isFaceUp) return; // No-op

        const newHand = [...player.hand];
        newHand[action.payload.cardIndex] = {
          ...newHand[action.payload.cardIndex],
          isFaceUp: true,
          hasBeenPeeked: true,
        };
        players[playerIndex] = { ...player, hand: newHand };

        const newPeekedCount = state.peekingState.peekedCount + 1;
        
        if (newPeekedCount >= 2) {
             // Just update count, wait for explicit FINISH_PEEKING
             await saveState({
                ...state,
                players,
                peekingState: { ...state.peekingState, peekedCount: 2 }, // Cap at 2
             });
        } else {
            await saveState({
                ...state,
                players,
                peekingState: { ...state.peekingState, peekedCount: newPeekedCount },
            });
        }
        break;
      }

      case "FINISH_PEEKING": {
          if (state.gamePhase !== "peeking" || !state.peekingState) throw new Error("Not peeking phase");
          
          const playerIndex = state.peekingState.playerIndex;
          const player = state.players[playerIndex];
          
          if (player.id !== playerId) throw new Error("Not your turn to finish peeking");
          if (state.peekingState.peekedCount < 2) throw new Error("Must peek 2 cards first");

          const nextPlayerIndex = (playerIndex + 1) % state.players.length;
          
          // If we circled back to 0, everyone is done
          if (nextPlayerIndex === 0) {
              // Reset all cards to face down for the game start
              const playingPlayers = state.players.map(p => ({
                  ...p,
                  hand: p.hand.map(c => ({ ...c, isFaceUp: false }))
              }));

              await saveState({
                 ...state,
                 players: playingPlayers,
                 gamePhase: "playing",
                 currentPlayerIndex: 0,
                 turnCount: 0,
                 peekingState: undefined,
                 actionMessage: `Game started! ${state.players[0].name}'s turn.`,
              });
          } else {
              await saveState({
                 ...state,
                 peekingState: { playerIndex: nextPlayerIndex, peekedCount: 0 },
                 actionMessage: `${state.players[nextPlayerIndex].name} is peeking...`,
              });
          }
          break; 
      }

      case "DRAW_FROM_DECK": {
        if (!isMyTurn) throw new Error("Not your turn");
        if (state.gamePhase !== "playing") throw new Error("Invalid phase");

        let drawPile = [...state.drawPile];
        let discardPile = [...state.discardPile];

        // If deck is empty, reshuffle discard pile back into deck
        if (drawPile.length === 0) {
          if (discardPile.length > 1) {
            const topDiscard = discardPile.pop()!; // Keep the top card on discard
            drawPile = shuffleDeck(discardPile);
            discardPile = [topDiscard];

            if (drawPile.length === 0) {
              await saveState(endRoundWithScores(state, { reason: "deck_exhausted" }));
              return;
            }
          } else {
            await saveState(endRoundWithScores(state, { reason: "deck_exhausted" }));
            return;
          }
        }

        const drawnCard = drawPile.pop()!;

        await saveState({
            ...state,
            drawPile,
            discardPile,
            drawnCard,
            drawSource: "deck",
            gamePhase: "holding_card",
            actionMessage: drawnCard.isSpecial
                ? `${currentPlayer.name} drew a special card!`
                : `${currentPlayer.name} drew a card`,
            lastMove: {
                playerId,
                action: "draw",
                source: "deck",
                timestamp: Date.now(),
            }
        });
        break;
      }

      case "DRAW_FROM_DISCARD": {
        if (!isMyTurn) throw new Error("Not your turn");
        if (state.gamePhase !== "playing") throw new Error("Invalid phase");
        if (state.discardPile.length === 0) throw new Error("Discard pile empty");

        const discardPile = [...state.discardPile];
        const drawnCard = discardPile.pop()!;

        await saveState({
            ...state,
            discardPile,
            drawnCard,
            drawSource: "discard",
            gamePhase: "holding_card",
            actionMessage: `${currentPlayer.name} took from discard`,
            lastMove: {
                playerId,
                action: "draw",
                source: "discard",
                timestamp: Date.now(),
            }
        });
        break;
      }

      case "DISCARD_HELD_CARD": {
        if (!isMyTurn) throw new Error("Not your turn");
        if (state.gamePhase !== "holding_card") throw new Error("Invalid phase");
        if (!state.drawnCard || !state.drawSource) throw new Error("No card held");
        if (state.drawSource === "discard" || state.drawSource === "take2") throw new Error("Cannot discard card taken from discard pile or keep-from-take2");

        const discardPile = [...state.discardPile, state.drawnCard];
        
        await saveState(advanceTurn({
            ...state,
            discardPile,
            drawnCard: null,
            drawSource: null,
            lastMove: {
                playerId,
                action: "discard",
                timestamp: Date.now(),
            }
        }));
        break;
      }

      case "SWAP_HELD_CARD": {
        if (!isMyTurn) throw new Error("Not your turn");
        if (state.gamePhase !== "holding_card") throw new Error("Invalid phase");
        if (!state.drawnCard) throw new Error("No card held");
        
        // Validate bounds
        if (action.payload.cardIndex < 0 || action.payload.cardIndex >= currentPlayer.hand.length) throw new Error("Invalid card index");

        const players = [...state.players];
        const current = { ...players[state.currentPlayerIndex] };
        const hand = [...current.hand];
        
        const replacedCard = hand[action.payload.cardIndex]?.card;
        
        hand[action.payload.cardIndex] = {
            card: state.drawnCard,
            isFaceUp: false,
            hasBeenPeeked: false,
        };
        current.hand = hand;
        players[state.currentPlayerIndex] = current;
        
        const discardPile = [...state.discardPile, replacedCard];
        
        await saveState(advanceTurn({
            ...state,
            players,
            discardPile,
            drawnCard: null,
            drawSource: null,
            lastMove: {
                playerId,
                action: "swap",
                cardIndex: action.payload.cardIndex,
                timestamp: Date.now(),
            }
        }));
        break;
      }

      case "USE_SPECIAL_ACTION": {
          if (!isMyTurn) throw new Error("Not your turn");
          if (state.gamePhase !== "holding_card") throw new Error("Invalid phase");
          if (!state.drawnCard?.isSpecial) throw new Error("Not a special card");
          if (state.drawSource !== "deck" && state.drawSource !== "take2") throw new Error("Can only use special cards drawn from deck or kept from take2");
          
          const specialAction = state.drawnCard.specialAction!;
          
          if (specialAction === "take_2") {
              // Discard immediately and proceed to Take 2 flow
              const discardPile = [...state.discardPile, state.drawnCard];
              const newState = { ...state, discardPile, drawnCard: null, drawSource: null };

              // Draw 2 cards for selection
              const drawPile = [...state.drawPile];
              const tempCards: Card[] = [];
              for (let i = 0; i < 2; i++) {
                  if (drawPile.length > 0) tempCards.push(drawPile.pop()!);
              }
              // If deck ran out, we might have 0 or 1 card. Handle gracefully?
              // For now assume deck has cards or we reshuffle (not implemented yet).
              
              await saveState({
                  ...newState,
                  drawPile,
                  tempCards,
                  gamePhase: "action_take_2",
                  actionMessage: `${currentPlayer.name} is choosing from 2 cards...`,
              });
          } else if (specialAction === "peek_1") {
              // Keep drawnCard until action completes; discard once in action handler
              await saveState({
                  ...state,
                  drawSource: null,
                  gamePhase: "action_peek_1",
                  actionMessage: `${currentPlayer.name} is peeking at a card...`,
              });
          } else if (specialAction === "swap_2") {
              await saveState({
                  ...state,
                  drawSource: null,
                  gamePhase: "action_swap_2_select_1",
                  actionMessage: `${currentPlayer.name} is swapping 2 cards...`,
              });
          }
          break;
      }

      case "ACTION_PEEK_1_SELECT": {
          if (!isMyTurn) throw new Error("Not your turn");
          if (state.gamePhase !== "action_peek_1") throw new Error("Invalid phase");
          
          // Validate target player exists
          const targetPlayer = state.players.find(p => p.id === action.payload.playerId);
          if (!targetPlayer) throw new Error("Target player not found");
          
          // Validate bounds
          if (action.payload.cardIndex < 0 || action.payload.cardIndex >= targetPlayer.hand.length) throw new Error("Invalid card index");

          const targetCard = targetPlayer.hand[action.payload.cardIndex].card;

          const players = state.players.map((p) => {
              if (p.id !== action.payload.playerId) return p;
              const hand = p.hand.map((c, i) => 
                i === action.payload.cardIndex 
                    ? { ...c, hasBeenPeeked: true } // Mark as peeked, but keep face down
                    : c
              );
              return { ...p, hand };
          });
          
          if (!state.drawnCard) throw new Error("Missing special card to discard");
          const discardPile = [...state.discardPile, state.drawnCard];
          
          await saveState(advanceTurn({
              ...state,
              players,
              discardPile,
              drawnCard: null,
              drawSource: null,
              lastMove: {
                  playerId,
                  action: "peek",
                  targetPlayerId: action.payload.playerId,
                  timestamp: Date.now(),
              }
          }));

          return targetCard; // Return the card so the caller can see it
          break;
      }

      case "ACTION_SWAP_2_SELECT": {
          if (!isMyTurn) throw new Error("Not your turn");
          if (state.gamePhase !== "action_swap_2_select_1" && state.gamePhase !== "action_swap_2_select_2") throw new Error("Invalid phase");

          // Validate target
          const targetPlayer = state.players.find(p => p.id === action.payload.playerId);
          if (!targetPlayer) throw new Error("Target player not found");
          if (action.payload.cardIndex < 0 || action.payload.cardIndex >= targetPlayer.hand.length) throw new Error("Invalid card index");

          if (state.gamePhase === "action_swap_2_select_1") {
              await saveState({
                  ...state,
                  gamePhase: "action_swap_2_select_2",
                  swapState: { card1: { playerId: action.payload.playerId, cardIndex: action.payload.cardIndex } },
                  actionMessage: `${currentPlayer.name} selected first card to swap...`,
              });
          } else {
              // Perform swap
              const card1 = state.swapState!.card1;
              const players = [...state.players];
              
              const playerAIndex = players.findIndex(p => p.id === card1.playerId);
              const playerBIndex = players.findIndex(p => p.id === action.payload.playerId);
              
              const playerA = players[playerAIndex];
              const playerB = players[playerBIndex];
              
              const cardA = playerA.hand[card1.cardIndex];
              const cardB = playerB.hand[action.payload.cardIndex];
              
              // Swap logic
              const newHandA = [...playerA.hand];
              newHandA[card1.cardIndex] = cardB;
              
              const newHandB = [...playerB.hand];
              newHandB[action.payload.cardIndex] = cardA;
              
              // Update players (handle case where A == B)
              if (playerAIndex === playerBIndex) {
                  newHandA[action.payload.cardIndex] = cardA; // Careful with self-swap indices
                  // Actually, if same player, just swap in the single hand array
                  const hand = [...playerA.hand];
                  [hand[card1.cardIndex], hand[action.payload.cardIndex]] = [hand[action.payload.cardIndex], hand[card1.cardIndex]];
                  players[playerAIndex] = { ...playerA, hand };
              } else {
                  players[playerAIndex] = { ...playerA, hand: newHandA };
                  players[playerBIndex] = { ...playerB, hand: newHandB };
              }
              
              if (!state.drawnCard) throw new Error("Missing special card to discard");
              const discardPile = [...state.discardPile, state.drawnCard];
              
              await saveState(advanceTurn({
                  ...state,
                  players,
                  discardPile,
                  drawnCard: null,
                  drawSource: null,
                  swapState: undefined,
                  lastMove: {
                      playerId,
                      action: "swap_2",
                      timestamp: Date.now(),
                      swap2Details: {
                              card1,
                              card2: { playerId: action.payload.playerId, cardIndex: action.payload.cardIndex },
                          }
                  }
              }));
          }
          break;
      }

      case "ACTION_TAKE_2_CHOOSE": {
          if (!isMyTurn) throw new Error("Not your turn");
          if (state.gamePhase !== "action_take_2") throw new Error("Invalid phase");
          if (!state.tempCards) throw new Error("No temp cards");
          
          // Payload should be the ID of the card to KEEP
          const keptCardId = action.payload.card.id;
          const keptCard = state.tempCards.find(c => c.id === keptCardId);
          const rejectedCards = state.tempCards.filter(c => c.id !== keptCardId);
          
          if (!keptCard) throw new Error("Invalid card choice");
          
          // Discard rejected
          const discardPile = [...state.discardPile, ...rejectedCards];
          
          // User is now holding the kept card
          await saveState({
              ...state,
              discardPile,
              tempCards: undefined,
              drawnCard: keptCard,
              drawSource: "take2" as const, // Force swap/use; discard disabled
              gamePhase: "holding_card",
              actionMessage: `${currentPlayer.name} kept a card`,
          });
          break;
      }
      
      case "CALL_POBUDKA": {
          if (!isMyTurn) throw new Error("Not your turn");
          if (state.gamePhase !== "playing") throw new Error("Invalid phase");
          
          await saveState(endRoundWithScores(state, { reason: "pobudka", callerId: playerId }));
          break;
      }
      
      case "START_NEW_ROUND": {
          // Allow starting from lobby or round_end
          if (state.gamePhase !== "round_end" && state.gamePhase !== "lobby") throw new Error("Invalid phase");

          const deck = shuffleDeck(createDeck());

          let currentPlayers = state.players;

          // If starting from lobby, we need to fetch players from the DB first
          if (state.gamePhase === "lobby") {
              const roomPlayers = await ctx.db
                  .query("players")
                  .withIndex("by_roomId", (q) => q.eq("roomId", roomId))
                  .collect();

              if (roomPlayers.length < 2) throw new Error("Need at least 2 players to start");

              // Sort by seat or join order to ensure consistent turn order
              roomPlayers.sort((a, b) => (a.seat ?? 0) - (b.seat ?? 0));

              currentPlayers = roomPlayers.map(p => ({
                  id: p.playerId,
                  name: p.name,
                  hand: [],
                  score: 0,
              }));
          }

          // Hand validation: ensure deck has enough cards for all players plus one for discard pile
          const requiredCards = currentPlayers.length * 4 + 1;
          if (deck.length < requiredCards) {
              throw new Error(`Not enough cards to deal. Need ${requiredCards}, have ${deck.length}`);
          }

          // Deal 4 cards to each player
          const players = currentPlayers.map(p => ({
              ...p,
              hand: [] as Player["hand"]
          }));

          for (let i = 0; i < 4; i++) {
              for (const p of players) {
                  const card = deck.shift();
                  if (card) p.hand.push({ card, isFaceUp: false, hasBeenPeeked: false });
              }
          }

          const discardPile = [deck.pop()!];
          
          await saveState({
              ...state,
              players,
              drawPile: deck,
              discardPile,
              currentPlayerIndex: 0,
              gamePhase: "peeking",
              peekingState: { playerIndex: 0, peekedCount: 0 },
              actionMessage: `New round! ${players[0].name} is peeking...`,
              drawnCard: null,
              drawSource: null,
              tempCards: undefined,
              swapState: undefined,
              lastMove: null,
              lastCallerId: null,
              roundWinnerName: null,
              lastRoundScores: undefined,
          });
          break;
      }
    }
  },
});

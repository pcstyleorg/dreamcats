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

    if (!action || typeof action !== "object" || !("type" in action)) {
      throw new Error("Invalid action");
    }

    // Strong idempotency: if we've already recorded this key, return the prior result.
    // This prevents double-application when the client retries after a lost response.
    if (idempotencyKey) {
      const prior = await ctx.db
        .query("moves")
        .withIndex("by_idem", (q) => q.eq("idempotencyKey", idempotencyKey))
        .first();

      if (prior) {
        if (prior.roomId !== roomId || prior.playerId !== playerId) {
          throw new Error("Idempotency key conflict");
        }
        return (prior.payload as { result?: unknown } | undefined)?.result;
      }
    }

    const gameRecord = await ctx.db
      .query("games")
      .withIndex("by_roomId", (q) => q.eq("roomId", roomId))
      .first();

    if (!gameRecord) {
      throw new Error("Game not found");
    }

    const state = gameRecord.state as GameState;
    let result: unknown = undefined;

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

    const recordMatchIfNeeded = async (prev: GameState, next: GameState) => {
      if (prev.gamePhase === "game_over") return;
      if (next.gamePhase !== "game_over") return;

      const existingMatch = await ctx.db
        .query("matches")
        .withIndex("by_roomId", (q) => q.eq("roomId", roomId))
        .first();
      if (existingMatch) return;

      const endedAt = Date.now();
      const playerScores = next.players.map((p) => ({
        playerId: p.id,
        name: p.name,
        finalScore: p.score,
      }));
      const winner = playerScores.reduce((best, cur) =>
        best.finalScore <= cur.finalScore ? best : cur,
      );

      const matchId = await ctx.db.insert("matches", {
        roomId,
        mode: next.gameMode,
        endedAt,
        winnerPlayerId: winner.playerId,
        winnerName: winner.name,
        winningScore: winner.finalScore,
        playerCount: playerScores.length,
      });

      const playersById = new Map(
        (
          await ctx.db
            .query("players")
            .withIndex("by_roomId", (q) => q.eq("roomId", roomId))
            .collect()
        ).map((p) => [p.playerId, p] as const),
      );

      const sorted = [...playerScores].sort(
        (a, b) => a.finalScore - b.finalScore,
      );
      let lastScore: number | null = null;
      let lastPlace = 0;
      const placeByPlayerId = new Map<string, number>();
      for (let i = 0; i < sorted.length; i++) {
        const score = sorted[i].finalScore;
        if (lastScore === null || score !== lastScore) {
          lastScore = score;
          lastPlace = i + 1;
        }
        placeByPlayerId.set(sorted[i].playerId, lastPlace);
      }

      for (const p of playerScores) {
        const playerDoc = playersById.get(p.playerId);
        const place = placeByPlayerId.get(p.playerId) ?? playerScores.length;
        await ctx.db.insert("matchPlayers", {
          matchId,
          roomId,
          userId: playerDoc?.userId,
          playerId: p.playerId,
          name: p.name,
          finalScore: p.finalScore,
          place,
          endedAt,
        });

        if (!playerDoc?.userId) continue;

        const userId = playerDoc.userId;
        const existingStats = await ctx.db
          .query("userStats")
          .withIndex("by_userId", (q) => q.eq("userId", userId))
          .unique();

        const gamesPlayed = (existingStats?.gamesPlayed ?? 0) + 1;
        const gamesWon =
          (existingStats?.gamesWon ?? 0) + (p.playerId === winner.playerId ? 1 : 0);
        const totalScore = (existingStats?.totalScore ?? 0) + p.finalScore;
        const bestScore =
          existingStats?.bestScore === undefined
            ? p.finalScore
            : Math.min(existingStats.bestScore, p.finalScore);

        if (existingStats) {
          await ctx.db.patch(existingStats._id, {
            gamesPlayed,
            gamesWon,
            totalScore,
            bestScore,
            lastPlayedAt: endedAt,
            updatedAt: endedAt,
          });
        } else {
          await ctx.db.insert("userStats", {
            userId,
            gamesPlayed,
            gamesWon,
            totalScore,
            bestScore,
            lastPlayedAt: endedAt,
            updatedAt: endedAt,
          });
        }
      }
    };

    const saveStateWithSideEffects = async (newState: GameState) => {
      await saveState(newState);
      await recordMatchIfNeeded(state, newState);
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

        // Disallow peeking more than 2 cards per RULES §3
        if (state.peekingState.peekedCount >= 2) break;

        const players = [...state.players];
        const playerIndex = state.peekingState.playerIndex;
        const player = players[playerIndex];
        
        // Check if already face up
        if (player.hand[action.payload.cardIndex].isFaceUp) break; // No-op

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

          const startIndex =
            state.peekingState.startIndex ??
            // Backward-compat: older states may not have startingPlayerIndex
            (state as unknown as { startingPlayerIndex?: number }).startingPlayerIndex ??
            0;

          const nextPlayerIndex = (playerIndex + 1) % state.players.length;
          
          // If we circled back to the peeking start, everyone is done
          if (nextPlayerIndex === startIndex) {
              // Reset all cards to face down for the game start
              const playingPlayers = state.players.map(p => ({
                  ...p,
                  hand: p.hand.map(c => ({ ...c, isFaceUp: false }))
              }));

              await saveState({
                 ...state,
                 players: playingPlayers,
                 gamePhase: "playing",
                 startingPlayerIndex: startIndex,
                 currentPlayerIndex: startIndex,
                 turnCount: 0,
                 peekingState: undefined,
                 actionMessage: `Game started! ${state.players[startIndex].name}'s turn.`,
              });
          } else {
              await saveState({
                 ...state,
                 peekingState: { playerIndex: nextPlayerIndex, peekedCount: 0, startIndex },
                 actionMessage: `${state.players[nextPlayerIndex].name} is peeking...`,
              });
          }
          break; 
      }

      case "DRAW_FROM_DECK": {
        if (!isMyTurn) throw new Error("Not your turn");
        if (state.gamePhase !== "playing") throw new Error("Invalid phase");

        const drawPile = [...state.drawPile];
        const discardPile = [...state.discardPile];

        // Per RULES §4/§2: no reshuffle. If deck is empty, round ends immediately.
        if (drawPile.length === 0) {
          const nextState = endRoundWithScores(state, { reason: "deck_exhausted" });
          await saveStateWithSideEffects(nextState);
          break;
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
              if (drawPile.length === 0) {
                  await saveState(endRoundWithScores(newState, { reason: "deck_exhausted" }));
                  break;
              }
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
                  actionMessage: `${currentPlayer.name} is choosing from ${tempCards.length} card${tempCards.length === 1 ? "" : "s"}...`,
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

          result = targetCard; // Return the card so the caller can see it
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
              const card1 = state.swapState?.card1;
              if (!card1) throw new Error("Missing first card selection");
              const players = [...state.players];
              
              const playerAIndex = players.findIndex(p => p.id === card1.playerId);
              const playerBIndex = players.findIndex(p => p.id === action.payload.playerId);
              if (playerAIndex === -1 || playerBIndex === -1) {
                throw new Error("Target player not found");
              }
              
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
          
          const nextState = endRoundWithScores(state, { reason: "pobudka", callerId: playerId });
          await saveStateWithSideEffects(nextState);
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

          const previousStartIndex =
            state.gamePhase === "round_end"
              ? (state as unknown as { startingPlayerIndex?: number }).startingPlayerIndex ?? 0
              : 0;
          const nextStarterIndex =
            currentPlayers.length > 0
              ? (previousStartIndex + (state.gamePhase === "round_end" ? 1 : 0)) % currentPlayers.length
              : 0;

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
              startingPlayerIndex: nextStarterIndex,
              currentPlayerIndex: nextStarterIndex,
              gamePhase: "peeking",
              peekingState: { playerIndex: nextStarterIndex, peekedCount: 0, startIndex: nextStarterIndex },
              actionMessage: `New round! ${players[nextStarterIndex].name} is peeking...`,
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

      default: {
        throw new Error("Unknown action type");
      }
    }

    if (idempotencyKey) {
      await ctx.db.insert("moves", {
        roomId,
        playerId,
        action: action.type,
        payload: { action, result },
        createdAt: Date.now(),
        idempotencyKey,
      });
    }

    return result;
  },
});

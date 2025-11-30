# Convex to Boardgame.io Migration Plan - Sen Card Game

**Timeline**: 4-6 weeks (Balanced approach)
**Target Architecture**: Boardgame.io server on Railway + React client with direct hooks
**Migration Date**: 2025-11-30

## Executive Summary

This plan outlines a complete migration from Convex to Boardgame.io while preserving all game mechanics, hidden information rules, and user experience. The migration follows a 10-phase approach with minimal disruption to existing functionality.

### Key Architecture Changes

**Before (Convex):**
```
Convex DB → getGameState query (server-side filtering) → ConvexSync → Zustand → React components
              ↑
         performAction mutation
```

**After (Boardgame.io):**
```
Boardgame.io server (Railway) → playerView filtering → WebSocket → React Client hooks → Components
              ↑
         moves.drawDeck(), etc.
```

### Migration Principles

1. **Server-authoritative**: Boardgame.io server is source of truth (like Convex)
2. **Hidden information preserved**: playerView filters opponent cards before sending to clients
3. **No API mirroring**: Map Convex patterns to Boardgame.io idioms (moves, phases, ctx)
4. **Incremental rollout**: Test thoroughly before deprecating Convex
5. **Feature parity**: All 11 actions, 9 phases, and scoring rules maintained

---

## Phase 1: Architecture Analysis & Boardgame.io Setup

### Goal
Establish foundational mapping between Convex and Boardgame.io, install dependencies, and create skeleton game definition.

### Tasks

1. **Install dependencies:**
   ```bash
   bun add boardgame.io
   bun add -D @types/node
   ```

2. **Read existing architecture:**
   - `/Users/pcstyle/projects_recent/sen-web/src/types/index.ts` - GameState interface
   - `/Users/pcstyle/projects_recent/sen-web/convex/types.ts` - Backend types
   - `/Users/pcstyle/projects_recent/sen-web/src/lib/game-logic.ts` - Game phases and actions
   - `/Users/pcstyle/projects_recent/sen-web/convex/games.ts` - Server-side filtering
   - `/Users/pcstyle/projects_recent/sen-web/convex/actions.ts` - 11 action handlers

3. **Create architecture mapping document:**
   Create `MIGRATION.md` with complete mapping table:

   | Convex Concept | Boardgame.io Equivalent | Notes |
   |----------------|-------------------------|-------|
   | `GameState` in DB | `G` object in game state | Mutable in Boardgame.io |
   | `performAction` mutation | `moves: { drawDeck, swapDream, ... }` | 11 total moves |
   | `gamePhase` field | `ctx.phase` | 9 phases total |
   | `currentPlayerIndex` | `ctx.currentPlayer` | String ID in Boardgame.io |
   | `version` counter | Built-in state ID | Automatic in Boardgame.io |
   | `getGameState` query | `playerView` function | Server-side filtering |
   | ConvexSync component | React Client hooks | Direct context access |
   | Zustand game slice | Local component state | Simpler without intermediate layer |
   | `rooms` table | Lobby API matches | Built-in match management |
   | `players` table | `ctx.playOrder`, player metadata | Managed by framework |

4. **Create skeleton game definition:**
   Create `src/game/sen-game.ts`:
   ```typescript
   import { Game } from 'boardgame.io';

   export interface SenGameState {
     // Will expand in Phase 2
   }

   export const SenGame: Game<SenGameState> = {
     name: 'sen',

     setup: (ctx) => {
       // Phase 2: Initialize game state
       return {} as SenGameState;
     },

     phases: {
       lobby: {},
       peeking: {},
       playing: {},
       holding_card: {},
       action_take_2: {},
       action_peek_1: {},
       action_swap_2_select_1: {},
       action_swap_2_select_2: {},
       round_end: {},
       game_over: {},
     },

     moves: {
       // Phase 3: Implement 11 moves
     },

     playerView: (G, ctx, playerID) => {
       // Phase 4: Card visibility filtering
       return G;
     },

     minPlayers: 2,
     maxPlayers: 4,
   };
   ```

5. **Create type definitions:**
   Create `src/game/types.ts` with Card, Player, and move argument types

### Result
- Dependencies installed
- `MIGRATION.md` with complete architecture mapping
- `src/game/sen-game.ts` skeleton compiles
- `src/game/types.ts` with TypeScript types

### Acceptance Criteria
- `bun run build` succeeds
- All 11 action types documented in MIGRATION.md
- All 9 phases listed in skeleton

### Risks
- Type mismatches between GameState and G structure
- Missing edge cases in architecture mapping

---

## Phase 2: Core Game State Migration

### Goal
Port GameState structure to Boardgame.io G object and implement setup() function with deck creation, shuffling, and dealing.

### Tasks

1. **Define SenGameState interface in `src/game/types.ts`:**
   ```typescript
   import { Card } from '@/types';

   export interface SenGameState {
     deck: Card[];
     discardPile: Card[];

     players: {
       [playerID: string]: {
         dream: Card[]; // 4-card hand
         score: number;
         peekedIndices: number[]; // which cards they've seen
         seat: number;
       };
     };

     currentRound: number;
     dealerSeat: number;

     // Turn/phase specific
     drawnCard?: Card;
     actionContext?: {
       cardIndices?: number[];
       targetPlayer?: string;
     };

     // Round end data
     roundScores?: { [playerID: string]: number };
     callerPlayer?: string;
   }
   ```

2. **Port deck utilities:**
   Create `src/game/deck.ts`:
   - `createDeck()` - 54 cards matching RULES.md specification
   - `shuffleDeck(deck, ctx)` - Use `ctx.random.Shuffle()` for seeded RNG
   - `dealCards(deck, count)` - Helper for dealing

   **Deck composition:**
   - Values 0-8: 4 copies each (36 cards)
   - Value 9: 9 copies
   - Special "Weź 2" (take_2): 3 copies with value 5
   - Special "Podejrzyj 1" (peek_1): 3 copies with value 6
   - Special "Zamień 2" (swap_2): 3 copies with value 7

3. **Implement setup() in `sen-game.ts`:**
   ```typescript
   setup: (ctx) => {
     const deck = shuffleDeck(createDeck(), ctx);
     const players: SenGameState['players'] = {};

     // Deal 4 cards to each player
     for (let i = 0; i < ctx.numPlayers; i++) {
       const playerID = String(i);
       players[playerID] = {
         dream: [deck.pop()!, deck.pop()!, deck.pop()!, deck.pop()!],
         score: 0,
         peekedIndices: [],
         seat: i,
       };
     }

     // Move top card to discard pile to start
     const discardPile = [deck.pop()!];

     return {
       deck,
       discardPile,
       players,
       currentRound: 1,
       dealerSeat: 0,
     };
   },
   ```

4. **Create unit tests:**
   `src/game/__tests__/setup.test.ts`:
   - Test deck has exactly 54 cards
   - Test card distribution matches spec
   - Test each player receives 4 cards
   - Test shuffle is non-deterministic

### Result
- Complete SenGameState interface
- Functional setup() creating valid initial state
- Deck utilities using Boardgame.io's seeded RNG
- Unit tests passing

### Acceptance Criteria
- `bun run test src/game/__tests__/setup.test.ts` passes
- Deck composition matches RULES.md exactly
- Each player has 4 cards after setup

### Dependencies
- Phase 1 complete

### Risks
- Incorrect deck composition (must match 54-card spec exactly)
- RNG seeding differences between Convex and Boardgame.io

---

## Phase 3: Game Logic Porting - Moves and Phases

### Goal
Convert all 11 Convex action handlers to Boardgame.io moves and implement 9 phase definitions with turn order and transitions.

### Tasks

1. **Implement 11 moves in `sen-game.ts`:**

   **Drawing moves:**
   ```typescript
   moves: {
     drawDeck: {
       move: (G, ctx) => {
         if (G.drawnCard) return; // Already holding a card
         const card = G.deck.pop();
         if (!card) {
           // Deck exhausted - end round
           ctx.events?.setPhase('round_end');
           return;
         }

         G.drawnCard = card;

         // Check if special card
         if (card.isSpecial) {
           if (card.specialAction === 'take_2') {
             ctx.events?.setPhase('action_take_2');
           } else if (card.specialAction === 'peek_1') {
             ctx.events?.setPhase('action_peek_1');
           } else if (card.specialAction === 'swap_2') {
             ctx.events?.setPhase('action_swap_2_select_1');
           }
         } else {
           ctx.events?.setPhase('holding_card');
         }
       },
       client: false, // Server-only for security
     },

     drawDiscard: {
       move: (G, ctx) => {
         if (G.drawnCard) return;
         const card = G.discardPile.pop();
         if (!card) return;

         G.drawnCard = card;
         ctx.events?.setPhase('holding_card');
       },
       client: false,
     },

     swapDream: {
       move: (G, ctx, dreamIndex: number) => {
         if (!G.drawnCard || dreamIndex < 0 || dreamIndex > 3) return;

         const playerID = ctx.currentPlayer;
         const player = G.players[playerID];
         const oldCard = player.dream[dreamIndex];

         player.dream[dreamIndex] = G.drawnCard;
         G.discardPile.push(oldCard);
         G.drawnCard = undefined;

         ctx.events?.endTurn();
         ctx.events?.setPhase('playing');
       },
       client: false,
     },

     discardDrawn: {
       move: (G, ctx) => {
         if (!G.drawnCard) return;

         G.discardPile.push(G.drawnCard);
         G.drawnCard = undefined;

         ctx.events?.endTurn();
         ctx.events?.setPhase('playing');
       },
       client: false,
     },

     peek: {
       move: (G, ctx, dreamIndex: number) => {
         const playerID = ctx.currentPlayer;
         const player = G.players[playerID];

         if (!player.peekedIndices.includes(dreamIndex)) {
           player.peekedIndices.push(dreamIndex);
         }
       },
       client: false,
     },

     callPobudka: {
       move: (G, ctx) => {
         G.callerPlayer = ctx.currentPlayer;
         ctx.events?.setPhase('round_end');
       },
       client: false,
     },

     // Special card actions
     actionTake2: {
       move: (G, ctx, chosenCardIndex: number) => {
         // Draw 2 cards, player chooses which to keep
         const card1 = G.deck.pop();
         const card2 = G.deck.pop();
         if (!card1 || !card2) return;

         const chosenCard = chosenCardIndex === 0 ? card1 : card2;
         const discardedCard = chosenCardIndex === 0 ? card2 : card1;

         G.discardPile.push(discardedCard);
         G.drawnCard = chosenCard;

         ctx.events?.setPhase('holding_card');
       },
       client: false,
     },

     actionPeek1: {
       move: (G, ctx, targetPlayerID: string, dreamIndex: number) => {
         const player = G.players[ctx.currentPlayer];

         // Mark as peeked for current player's knowledge
         if (!player.peekedIndices.includes(dreamIndex)) {
           player.peekedIndices.push(dreamIndex);
         }

         G.drawnCard = undefined;
         ctx.events?.endTurn();
         ctx.events?.setPhase('playing');
       },
       client: false,
     },

     actionSwap2Select1: {
       move: (G, ctx, playerID: string, dreamIndex: number) => {
         G.actionContext = {
           cardIndices: [dreamIndex],
           targetPlayer: playerID,
         };
         ctx.events?.setPhase('action_swap_2_select_2');
       },
       client: false,
     },

     actionSwap2Select2: {
       move: (G, ctx, targetPlayerID: string, targetDreamIndex: number) => {
         const firstPlayerID = G.actionContext?.targetPlayer;
         const firstIndex = G.actionContext?.cardIndices?.[0];
         if (firstPlayerID === undefined || firstIndex === undefined) return;

         // Swap the two cards
         const temp = G.players[firstPlayerID].dream[firstIndex];
         G.players[firstPlayerID].dream[firstIndex] = G.players[targetPlayerID].dream[targetDreamIndex];
         G.players[targetPlayerID].dream[targetDreamIndex] = temp;

         G.actionContext = undefined;
         G.drawnCard = undefined;
         ctx.events?.endTurn();
         ctx.events?.setPhase('playing');
       },
       client: false,
     },

     nextRound: {
       move: (G, ctx) => {
         const deck = shuffleDeck(createDeck(), ctx);

         // Deal new hands
         Object.keys(G.players).forEach(pid => {
           G.players[pid].dream = [
             deck.pop()!,
             deck.pop()!,
             deck.pop()!,
             deck.pop()!,
           ];
           G.players[pid].peekedIndices = [];
         });

         G.deck = deck;
         G.discardPile = [deck.pop()!];
         G.drawnCard = undefined;
         G.callerPlayer = undefined;
         G.roundScores = undefined;
         G.currentRound++;
         G.dealerSeat = (G.dealerSeat + 1) % ctx.numPlayers;

         ctx.events?.setPhase('peeking');
       },
       client: false,
     },
   }
   ```

2. **Define 9 phases with transitions:**
   ```typescript
   phases: {
     lobby: {
       start: true,
       next: 'peeking',
       turn: {
         activePlayers: { all: 'lobby' },
       },
     },

     peeking: {
       next: 'playing',
       turn: {
         activePlayers: { all: 'peeking' },
       },
       endIf: (G, ctx) => {
         // All players must peek at exactly 2 cards
         return Object.values(G.players).every(
           p => p.peekedIndices.length >= 2
         );
       },
     },

     playing: {
       turn: {
         order: {
           first: (G, ctx) => (G.dealerSeat + 1) % ctx.numPlayers,
           next: (G, ctx) => (ctx.playOrderPos + 1) % ctx.numPlayers,
         },
       },
       endIf: (G, ctx) => !!G.callerPlayer,
       next: 'round_end',
     },

     holding_card: {
       endIf: (G, ctx) => !G.drawnCard,
       next: 'playing',
     },

     action_take_2: {
       endIf: (G, ctx) => !G.drawnCard,
       next: 'holding_card',
     },

     action_peek_1: {
       endIf: (G, ctx) => !G.drawnCard,
       next: 'playing',
     },

     action_swap_2_select_1: {
       endIf: (G, ctx) => !!G.actionContext?.cardIndices,
       next: 'action_swap_2_select_2',
     },

     action_swap_2_select_2: {
       endIf: (G, ctx) => !G.drawnCard,
       next: 'playing',
     },

     round_end: {
       onBegin: (G, ctx) => {
         // Calculate scores
         const scores: { [key: string]: number } = {};
         Object.keys(G.players).forEach(pid => {
           const player = G.players[pid];
           const handValue = player.dream.reduce((sum, card) => {
             return sum + (card.isSpecial ? card.value : card.value);
           }, 0);
           scores[pid] = handValue;
           player.score += handValue;
         });

         // Caller penalty (+5 if not lowest)
         if (G.callerPlayer) {
           const callerScore = scores[G.callerPlayer];
           const lowestScore = Math.min(...Object.values(scores));
           if (callerScore > lowestScore) {
             G.players[G.callerPlayer].score += 5;
           }
         }

         G.roundScores = scores;
       },
       endIf: (G, ctx) => {
         // Game over if anyone >= 100 points
         return Object.values(G.players).some(p => p.score >= 100);
       },
       next: (G, ctx) => {
         const gameOver = Object.values(G.players).some(p => p.score >= 100);
         return gameOver ? 'game_over' : 'playing';
       },
     },

     game_over: {
       onBegin: (G, ctx) => {
         // Find winner (lowest score)
         const winner = Object.entries(G.players).reduce((min, [pid, player]) => {
           return player.score < min.score ? { pid, score: player.score } : min;
         }, { pid: '', score: Infinity });

         // Winner stored in ctx.gameover (Boardgame.io convention)
         ctx.events?.endGame({ winner: winner.pid });
       },
     },
   }
   ```

3. **Create move tests:**
   `src/game/__tests__/moves.test.ts` with tests for all 11 moves

### Result
- 11 functional moves matching Convex actions
- 9 phase definitions with correct transitions
- Move validation preventing illegal actions
- Unit tests for all moves

### Acceptance Criteria
- All moves callable and modify state correctly
- Phase transitions work: lobby → peeking → playing → round_end → game_over
- Turn order follows dealer rotation
- Tests pass: `bun run test src/game/__tests__/moves.test.ts`

### Dependencies
- Phase 2 complete

### Risks
- Phase transition timing bugs
- Special card multi-step actions (swap_2 has 2 phases)
- Turn order after special actions

---

## Phase 4: Hidden Information Implementation

### Goal
Implement playerView function to filter card visibility based on game phase and player ID, ensuring security.

### Tasks

1. **Implement playerView in `sen-game.ts`:**
   ```typescript
   playerView: (G, ctx, playerID) => {
     // Deep clone to avoid mutations
     const filtered: SenGameState = JSON.parse(JSON.stringify(G));

     const currentPhase = ctx.phase;

     // Reveal all cards in end phases
     if (currentPhase === 'round_end' || currentPhase === 'game_over') {
       return filtered;
     }

     // Filter opponent cards
     Object.keys(filtered.players).forEach(pid => {
       if (pid === playerID) {
         // Current player sees only peeked cards
         filtered.players[pid].dream = filtered.players[pid].dream.map((card, idx) => {
           const hasPeeked = filtered.players[pid].peekedIndices.includes(idx);
           return hasPeeked ? card : { id: -1, value: -1, isSpecial: false } as Card;
         });
       } else {
         // Hide all opponent cards
         filtered.players[pid].dream = filtered.players[pid].dream.map(() => ({
           id: -1,
           value: -1,
           isSpecial: false,
         } as Card));
       }
     });

     // Always hide deck contents
     filtered.deck = filtered.deck.map(() => ({
       id: -1,
       value: -1,
       isSpecial: false,
     } as Card));

     return filtered;
   },
   ```

2. **Add hidden card type:**
   Update `src/game/types.ts`:
   ```typescript
   export type Card =
     | { id: number; value: number; isSpecial: false }
     | { id: number; value: number; isSpecial: true; specialAction: 'take_2' | 'peek_1' | 'swap_2' }
     | { id: -1; value: -1; isSpecial: false }; // Hidden placeholder
   ```

3. **Create playerView tests:**
   `src/game/__tests__/playerView.test.ts`:
   - Test opponent cards hidden during playing phase
   - Test all cards revealed during round_end
   - Test player sees only peeked cards
   - Test deck always hidden

### Result
- Functional playerView filtering opponent cards
- Unit tests verifying security
- Documentation of visibility rules

### Acceptance Criteria
- Opponent cards hidden during play
- Peeked cards visible to owner
- All cards revealed at round_end
- Tests pass: `bun run test src/game/__tests__/playerView.test.ts`

### Dependencies
- Phase 3 complete

### Risks
- Over-revealing cards (security vulnerability)
- Deep clone performance issues
- Forgetting to hide drawnCard for opponents

---

## Phase 5: Multiplayer Server Setup (Railway)

### Goal
Create Boardgame.io server with SocketIO transport, deploy to Railway, and configure lobby API.

### Tasks

1. **Install server dependencies:**
   ```bash
   bun add koa @koa/cors @koa/router
   bun add -D @types/koa @types/koa__cors @types/koa__router
   ```

2. **Create server:**
   Create `server/index.ts`:
   ```typescript
   import { Server, Origins } from 'boardgame.io/server';
   import { SenGame } from '../src/game/sen-game';
   import Koa from 'koa';
   import cors from '@koa/cors';

   const PORT = process.env.PORT || 8000;
   const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

   const server = Server({
     games: [SenGame],
     origins: [FRONTEND_URL, Origins.LOCALHOST_IN_DEVELOPMENT],
   });

   const app = server.app as Koa;

   app.use(cors({
     origin: FRONTEND_URL,
     credentials: true,
   }));

   server.run(PORT, () => {
     console.log(`Boardgame.io server running on port ${PORT}`);
   });
   ```

3. **Add npm scripts:**
   Update `package.json`:
   ```json
   {
     "scripts": {
       "server": "bun run server/index.ts",
       "server:dev": "bun --watch server/index.ts"
     }
   }
   ```

4. **Configure Railway deployment:**
   Create `railway.json`:
   ```json
   {
     "build": {
       "builder": "NIXPACKS"
     },
     "deploy": {
       "startCommand": "bun run server/index.ts",
       "restartPolicyType": "ON_FAILURE",
       "restartPolicyMaxRetries": 10
     }
   }
   ```

5. **Set environment variables:**
   Create `.env.production`:
   ```
   NODE_ENV=production
   PORT=8000
   FRONTEND_URL=https://sen-web.vercel.app
   ```

6. **Deploy to Railway:**
   ```bash
   npm i -g @railway/cli
   railway login
   railway init
   railway up
   railway domain
   ```

7. **Test server health:**
   Add health endpoint in `server/index.ts`:
   ```typescript
   import Router from '@koa/router';

   const router = new Router();
   router.get('/health', (ctx) => {
     ctx.body = { status: 'ok', timestamp: new Date().toISOString() };
   });
   app.use(router.routes());
   ```

### Result
- Server running on Railway
- Lobby API accessible at `https://[your-app].railway.app/games/sen`
- Health endpoint responding
- CORS configured for frontend

### Acceptance Criteria
- Server starts: `bun run server:dev`
- Health check: `curl https://[your-app].railway.app/health` returns 200
- Lobby API accessible: `curl https://[your-app].railway.app/games/sen`

### Dependencies
- Phase 4 complete

### Risks
- CORS misconfiguration
- Port conflicts
- Railway resource limits

---

## Phase 6: Frontend Integration - Direct Boardgame.io Hooks

### Goal
Replace Convex client with Boardgame.io React client, remove Zustand game state, and use direct hooks.

### Tasks

1. **Install React client:**
   ```bash
   bun add boardgame.io/react
   ```

2. **Create client wrapper:**
   Create `src/game/Client.tsx`:
   ```typescript
   import { Client } from 'boardgame.io/react';
   import { SocketIO } from 'boardgame.io/multiplayer';
   import { SenGame } from './sen-game';

   const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:8000';

   export const SenClient = Client({
     game: SenGame,
     multiplayer: SocketIO({ server: SERVER_URL }),
     debug: import.meta.env.DEV,
   });

   // Local mode for hotseat
   export const SenClientLocal = Client({
     game: SenGame,
     debug: import.meta.env.DEV,
   });
   ```

3. **Update App component:**
   Update `src/App.tsx`:
   ```typescript
   import { SenClient } from '@/game/Client';
   import { Gameboard } from '@/components/Gameboard';

   function App() {
     const matchID = useAppStore(state => state.roomId);
     const playerID = useAppStore(state => state.playerId);

     if (!matchID) {
       return <LandingPage />;
     }

     return (
       <SenClient matchID={matchID} playerID={playerID}>
         {({ G, ctx, moves }) => (
           <Gameboard G={G} ctx={ctx} moves={moves} />
         )}
       </SenClient>
     );
   }
   ```

4. **Refactor Gameboard to use Boardgame.io state:**
   Update `src/components/Gameboard.tsx`:
   ```typescript
   interface Props {
     G: SenGameState;
     ctx: Ctx;
     moves: any;
   }

   export const Gameboard: React.FC<Props> = ({ G, ctx, moves }) => {
     const currentPlayer = G.players[ctx.currentPlayer];
     const myPlayer = G.players[ctx.playerID || '0'];

     return (
       <div>
         <h2>Phase: {ctx.phase}</h2>
         <PlayerHand cards={myPlayer.dream} />
         <GameActions moves={moves} phase={ctx.phase} />
         <DiscardPile cards={G.discardPile} />
       </div>
     );
   };
   ```

5. **Update GameActions to call moves:**
   Update `src/components/GameActions.tsx`:
   ```typescript
   interface Props {
     moves: any;
     phase: string;
   }

   export const GameActions: React.FC<Props> = ({ moves, phase }) => {
     if (phase === 'playing') {
       return (
         <>
           <Button onClick={() => moves.drawDeck()}>Draw from Deck</Button>
           <Button onClick={() => moves.drawDiscard()}>Draw from Discard</Button>
           <Button onClick={() => moves.callPobudka()}>Call POBUDKA!</Button>
         </>
       );
     }

     if (phase === 'holding_card') {
       return (
         <>
           <Button onClick={() => moves.discardDrawn()}>Discard Card</Button>
           <Button onClick={(idx) => moves.swapDream(idx)}>Swap with Dream</Button>
         </>
       );
     }

     // ... other phases
   };
   ```

6. **Implement room creation/joining via lobby API:**
   Create `src/lib/lobby.ts`:
   ```typescript
   const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:8000';

   export async function createMatch(numPlayers: number): Promise<string> {
     const response = await fetch(`${SERVER_URL}/games/sen/create`, {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ numPlayers }),
     });

     const { matchID } = await response.json();
     return matchID;
   }

   export async function joinMatch(matchID: string, playerName: string): Promise<{ playerID: string; credentials: string }> {
     const response = await fetch(`${SERVER_URL}/games/sen/${matchID}/join`, {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ playerName }),
     });

     const { playerID, playerCredentials } = await response.json();
     return { playerID, credentials: playerCredentials };
   }
   ```

7. **Update LandingPage:**
   Update `src/components/LandingPage.tsx`:
   ```typescript
   import { createMatch, joinMatch } from '@/lib/lobby';

   const handleCreateRoom = async () => {
     const matchID = await createMatch(4);
     const { playerID, credentials } = await joinMatch(matchID, playerName);

     updateSession({ roomId: matchID, playerId: playerID, credentials });
   };
   ```

8. **Update Zustand to only store session data:**
   Update `src/state/sessionSlice.ts` (remove game state, keep only session):
   ```typescript
   export interface SessionSlice {
     playerId: string | null;
     roomId: string | null;
     credentials: string | null;
     playerName: string | null;
     locale: string;
     theme: string;
   }
   ```

9. **Remove ConvexSync and game slice:**
   - Delete `src/state/ConvexSync.tsx`
   - Delete `src/state/gameSlice.ts`
   - Update `src/state/store.ts` to remove game slice

### Result
- Boardgame.io client integrated
- Components use G, ctx, moves directly
- Zustand only for session/UI state
- No Convex dependencies in frontend

### Acceptance Criteria
- App renders without errors
- Can create and join matches
- Moves update state in real-time
- No Convex imports remain

### Dependencies
- Phase 5 complete

### Risks
- State sync timing issues
- Move arguments not matching signatures
- Credentials not persisting
- WebSocket connection failures

---

## Phase 7: Testing & Validation

### Goal
Comprehensive testing of all game mechanics, multiplayer scenarios, and UI flows.

### Tasks

1. **Create comprehensive move tests:**
   Expand `src/game/__tests__/moves.test.ts`:
   - Test all 11 moves with valid/invalid inputs
   - Test special card flows (take_2, peek_1, swap_2)
   - Test scoring and caller penalty
   - Test deck exhaustion

2. **Create phase transition tests:**
   Create `src/game/__tests__/phases.test.ts`:
   - Test lobby → peeking → playing transitions
   - Test round_end → playing (next round)
   - Test round_end → game_over (>= 100 points)

3. **Create multiplayer tests:**
   Create `src/game/__tests__/multiplayer.test.ts`:
   - Test state sync between 2-4 players
   - Test hidden card filtering per player
   - Test turn order

4. **Create UI component tests:**
   Update component tests to use Boardgame.io client:
   - `src/components/__tests__/GameActions.test.tsx`
   - `src/components/__tests__/Gameboard.test.tsx`

5. **Manual QA checklist:**
   Create `QA_CHECKLIST.md`:
   - Room creation and joining
   - Peeking phase (2 cards)
   - All 11 actions work correctly
   - Special cards trigger multi-step flows
   - Scoring accurate (including +5 caller penalty)
   - Round transitions
   - Game over at 100 points
   - Hidden information security

6. **Load testing:**
   - Create 5 concurrent matches
   - Verify server stability
   - Check WebSocket connection health

### Result
- All unit tests passing
- Manual QA checklist 100% complete
- No regressions from Convex version
- Server stable under load

### Acceptance Criteria
- `bun run test` - all tests green
- Manual QA with 2 human testers
- 5 concurrent games without crashes

### Dependencies
- Phase 6 complete

### Risks
- Missing edge cases from Convex
- Timing issues in multiplayer tests
- Incomplete QA coverage

---

## Phase 8: Deployment & Production Setup

### Goal
Deploy to production, configure monitoring, and establish rollback plan.

### Tasks

1. **Update frontend environment:**
   Update `.env.production`:
   ```
   VITE_SERVER_URL=https://sen-server.railway.app
   ```

2. **Update Vercel config:**
   Update `vercel.json`:
   ```json
   {
     "buildCommand": "bun run build",
     "outputDirectory": "dist",
     "env": {
       "VITE_SERVER_URL": "https://sen-server.railway.app"
     }
   }
   ```

3. **Deploy frontend to Vercel:**
   ```bash
   git push origin main
   ```

4. **Set up health monitoring:**
   - Use UptimeRobot or similar
   - Ping `/health` every 5 minutes
   - Alert on failures

5. **Create rollback plan:**
   Create `ROLLBACK.md`:
   - Steps to revert to Convex
   - Data backup procedures
   - Known issues and fixes

6. **Production smoke test:**
   - Create room in production
   - Join with 2 players
   - Play full game to completion
   - Verify scores and winner

### Result
- Server deployed to Railway
- Frontend deployed to Vercel
- Health monitoring active
- Rollback plan documented

### Acceptance Criteria
- Production app accessible
- End-to-end game playable
- Health endpoint returns 200
- Monitoring alerts configured

### Dependencies
- Phase 7 complete

### Risks
- CORS issues in production
- WebSocket failures (firewall/proxy)
- Server crashes under real load

---

## Phase 9: Convex Deprecation & Cleanup

### Goal
Remove all Convex code and dependencies after 7 days of stable Boardgame.io production.

**IMPORTANT**: Only proceed AFTER 1 week of successful production deployment.

### Tasks

1. **Verify stability:**
   - Check uptime metrics (>99%)
   - Verify no critical bugs
   - Get stakeholder approval

2. **Remove Convex dependencies:**
   ```bash
   bun remove convex
   ```

3. **Delete Convex code:**
   - Delete `convex/` directory
   - Delete `src/state/ConvexSync.tsx`
   - Delete Convex test files

4. **Remove Convex config:**
   - Delete `CONVEX_DEPLOYMENT` from `.env.local`
   - Delete `convex.json`

5. **Update documentation:**
   - Update `README.md` (remove Convex setup)
   - Update `CLAUDE.md` (replace Convex architecture with Boardgame.io)

6. **Clean up imports:**
   - Search for `import.*convex` (regex)
   - Remove all Convex imports

7. **Git tag milestone:**
   ```bash
   git tag -a convex-deprecation -m "Fully migrated to Boardgame.io"
   git push origin convex-deprecation
   ```

8. **Final verification:**
   - `bun run build` succeeds
   - `bun run test` all pass
   - Search `rg -i "convex"` returns 0 code results

### Result
- Zero Convex code or dependencies
- Documentation updated
- Build and tests pass

### Acceptance Criteria
- No `convex` in package.json
- No `convex/` directory
- Build succeeds
- Production app still works

### Dependencies
- Phase 8 complete + 7 days stable

### Risks
- Accidentally removing shared utilities
- Missing Convex references

---

## Phase 10: Hotseat Mode Re-enablement

### Goal
Enable local pass-and-play mode using Boardgame.io Local multiplayer.

### Tasks

1. **Update App for hotseat mode:**
   Update `src/App.tsx`:
   ```typescript
   if (gameMode === 'hotseat') {
     return (
       <SenClientLocal matchID="local" numPlayers={numPlayers}>
         {({ G, ctx, moves }) => (
           <>
             <HotseatPlayerIndicator currentPlayer={ctx.currentPlayer} />
             <Gameboard G={G} ctx={ctx} moves={moves} />
           </>
         )}
       </SenClientLocal>
     );
   }
   ```

2. **Create hotseat indicator:**
   Create `src/components/HotseatPlayerIndicator.tsx`:
   ```typescript
   export const HotseatPlayerIndicator: React.FC<{ currentPlayer: string }> = ({ currentPlayer }) => {
     return (
       <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-primary px-4 py-2 rounded-lg">
         <p>Player {parseInt(currentPlayer) + 1}'s Turn</p>
         <p className="text-sm">Pass device after your turn</p>
       </div>
     );
   };
   ```

3. **Add hotseat option to LandingPage:**
   Update `src/components/LandingPage.tsx`:
   ```typescript
   const handleStartHotseat = () => {
     updateSession({
       gameMode: 'hotseat',
       roomId: 'local',
       playerId: '0',
       numPlayers: 2, // or let user select
     });
   };
   ```

4. **Create hotseat tests:**
   Create `src/game/__tests__/hotseat.test.tsx`:
   - Test local multiplayer without server
   - Test turn switching
   - Test card visibility per player

### Result
- Hotseat mode functional
- Local game without server
- Player switching UI

### Acceptance Criteria
- Can start local game
- No network requests
- Turn switching works

### Dependencies
- Phase 6 complete

### Risks
- Card visibility leaking between players
- Confusion around "pass device" flow

---

## Critical Files for Implementation

| File | Purpose | Phase |
|------|---------|-------|
| `src/game/sen-game.ts` | Core game definition (setup, moves, phases, playerView) | 1-4 |
| `src/game/deck.ts` | Deck creation and shuffling | 2 |
| `src/game/types.ts` | TypeScript interfaces | 1-2 |
| `server/index.ts` | Boardgame.io server | 5 |
| `src/game/Client.tsx` | React client wrapper | 6 |
| `src/App.tsx` | App entry point with client | 6 |
| `src/components/Gameboard.tsx` | Main game UI | 6 |
| `src/components/GameActions.tsx` | Action buttons | 6 |
| `src/lib/lobby.ts` | Lobby API helpers | 6 |
| `MIGRATION.md` | Architecture mapping | 1 |

---

## Timeline Estimate (Balanced - 4-6 weeks)

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| 1. Architecture & Setup | 2-3 days | None |
| 2. Game State | 3-4 days | Phase 1 |
| 3. Moves & Phases | 5-7 days | Phase 2 |
| 4. Hidden Information | 2-3 days | Phase 3 |
| 5. Server Setup | 2-3 days | Phase 4 |
| 6. Frontend Integration | 5-7 days | Phase 5 |
| 7. Testing | 4-5 days | Phase 6 |
| 8. Deployment | 2-3 days | Phase 7 |
| 9. Convex Cleanup | 1-2 days | Phase 8 + 7 days |
| 10. Hotseat Mode | 2-3 days | Phase 6 |

**Total**: 28-40 days (4-6 weeks)

---

## Success Metrics

- [ ] 100% feature parity with Convex version
- [ ] All 11 actions work correctly
- [ ] Hidden information secure (no card leaks)
- [ ] Scoring accurate (including caller penalty)
- [ ] Multiplayer sync < 100ms latency
- [ ] Server uptime > 99%
- [ ] Zero Convex dependencies
- [ ] All tests passing
- [ ] Production deployment stable

---

## Rollback Strategy

If critical issues arise during migration:

1. **Immediate rollback (< 5 min):**
   - Revert frontend Vercel deployment
   - Re-enable Convex environment variables
   - No data loss (Convex DB unchanged)

2. **Criteria for rollback:**
   - Game-breaking bugs
   - Security vulnerabilities (card visibility leaks)
   - Server instability (crashes, high latency)
   - Data corruption

3. **Prevention:**
   - Thorough testing (Phase 7)
   - Gradual rollout (soft launch to small user group)
   - 7-day stabilization before Convex cleanup

---

## Next Steps

1. Review this plan with stakeholders
2. Get approval for 4-6 week timeline
3. Begin Phase 1: Architecture Analysis
4. Set up project tracking (GitHub Projects or similar)
5. Schedule weekly progress reviews

---

**Plan created**: 2025-11-30
**Target completion**: 2026-01-15 (6 weeks)
**Primary contact**: Project lead

*This plan assumes a single developer working full-time. Adjust timeline accordingly for part-time or team scenarios.*

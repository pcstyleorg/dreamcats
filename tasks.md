# Convex to Boardgame.io Migration To-Do List

This document organizes the 10-phase migration plan into actionable tasks. (`PLAN.MD`)

### Marking Instructions
- [ ] Not started or incomplete  
- [x] Completed and verified  
- [?] Requires clarification or external input  
- [!] Blocked by an issue  

---

# Phase 1: Architecture Analysis & Boardgame.io Setup

### Core Setup
1. [ ] Install dependencies:
   - [ ] `bun add boardgame.io`
   - [ ] `bun add -D @types/node`
2. [ ] Analyze existing Convex code:
   - [ ] Review `GameState` interface (`src/types/index.ts`, `convex/types.ts`)
   - [ ] Review game logic (`src/lib/game-logic.ts`)
   - [ ] Review server-side filtering (`convex/games.ts`)
   - [ ] Review 11 action handlers (`convex/actions.ts`)
3. [ ] Create architecture mapping (`MIGRATION.md`):
   - [ ] Document Convex → Boardgame.io equivalents (`G`, `moves`, `phases`, `playerView`)
4. [ ] Create base game definition (`src/game/sen-game.ts`):
   - [ ] Define `SenGame` object structure
   - [ ] List all 9 phases in `phases`
   - [ ] Add placeholders for all 11 moves in `moves`
5. [ ] Create type definitions (`src/game/types.ts`):
   - [ ] Define `Card`, `Player`, and move argument types

### Verification (1.0)
- [ ] Build succeeds (`bun run build`)
- [ ] All actions & phases documented in `MIGRATION.md`
- [ ] Skeleton created in `sen-game.ts`

---

# Phase 2: Core Game State Migration

### State Structure & Setup Logic
1. [ ] Define `SenGameState` (`src/game/types.ts`):
   - [ ] Include `deck`, `discardPile`, `players`
   - [ ] Include `currentRound`, `dealerSeat`
   - [ ] Include phase/turn fields (`drawnCard`, `actionContext`)
   - [ ] Include round results (`roundScores`, `callerPlayer`)
2. [ ] Port deck utilities (`src/game/deck.ts`):
   - [ ] `createDeck()` (54-card spec)
   - [ ] `shuffleDeck(deck, ctx)`
   - [ ] `dealCards(deck, count)`
3. [ ] Implement `setup()` in `sen-game.ts`:
   - [ ] Initialize deck/discard pile
   - [ ] Deal cards to each player (4 each)
   - [ ] Set initial round + dealer
4. [ ] Create setup tests:
   - [ ] Deck composition test
   - [ ] Player hand distribution test

### Verification (2.0)
- [ ] Tests pass: `bun run test src/game/__tests__/setup.test.ts`
- [ ] Deck = 54 cards
- [ ] Each player has 4 cards

---

# Phase 3: Game Logic Porting — Moves & Phases

### Moves
1. [ ] Implement all 11 moves:
   - [ ] `drawDeck`
   - [ ] `drawDiscard`
   - [ ] `swapDream`
   - [ ] `discardDrawn`
   - [ ] `peek`
   - [ ] `callPobudka`
   - [ ] `actionTake2`
   - [ ] `actionPeek1`
   - [ ] `actionSwap2Select1`
   - [ ] `actionSwap2Select2`
   - [ ] `nextRound`

### Phases
2. [ ] Define all 9 phases:
   - [ ] `lobby`
   - [ ] `peeking`
   - [ ] `playing`
   - [ ] `holding_card`
   - [ ] `action_take_2`
   - [ ] `action_peek_1`
   - [ ] `action_swap_2_select_1`
   - [ ] `action_swap_2_select_2`
   - [ ] `round_end`
   - [ ] `game_over`

### Tests
3. [ ] Create move and phase tests:
   - [ ] Valid/invalid input tests for all 11 moves
   - [ ] Multi-step action tests
   - [ ] Scoring tests (+5 caller penalty)

### Verification (3.0)
- [ ] All tests pass: `moves.test.ts`

---

# Phase 4: Hidden Information Implementation

### Player View
1. [ ] Implement `playerView` in `sen-game.ts`:
   - [ ] Deep clone the state
   - [ ] Reveal all cards at `round_end` + `game_over`
   - [ ] Current player sees their peeked cards
   - [ ] Opponents’ cards hidden
   - [ ] Hide entire deck
2. [ ] Add hidden card type:
   - [ ] `{ id: -1, value: -1, isSpecial: false }`
3. [ ] Write `playerView` tests:
   - [ ] Opponent card concealment
   - [ ] Peeked card visibility
   - [ ] Full reveal at round end

### Verification (4.0)
- [ ] Tests pass: `playerView.test.ts`
- [ ] Manual verification of hidden info in UI

---

# Phase 5: Multiplayer Server (Railway)

### Server Setup
1. [ ] Install dependencies:
   - [ ] `bun add koa @koa/cors @koa/router`
   - [ ] `bun add -D @types/koa @types/koa__cors @types/koa__router`
2. [ ] Create Boardgame.io server (`server/index.ts`):
   - [ ] Configure with `SenGame`
   - [ ] SocketIO multiplayer
   - [ ] CORS config (local + production)
   - [ ] `/health` endpoint
3. [ ] Add package.json scripts:
   - [ ] `server`
   - [ ] `server:dev`
4. [ ] Configure Railway deployment:
   - [ ] `railway.json`
   - [ ] `.env.production`

### Verification (5.0)
- [ ] Local server starts (`bun run server:dev`)
- [ ] Railway deploy succeeds
- [ ] `curl /health` returns 200 OK

---

# Phase 6: Frontend Integration

1. [ ] Install:
   - [ ] `bun add boardgame.io/react`
2. [ ] Build client wrapper:
   - [ ] `SenClient` (multiplayer)
   - [ ] `SenClientLocal` (hotseat)
3. [ ] Update `App.tsx`:
   - [ ] Replace Convex with Boardgame.io clients
4. [ ] Refactor components:
   - [ ] `Gameboard` → use `G`, `ctx`, `moves`
   - [ ] `GameActions` → use Boardgame.io moves
5. [ ] Implement lobby helpers:
   - [ ] `createMatch`
   - [ ] `joinMatch`
6. [ ] Update `LandingPage`:
   - [ ] Match creation/joining UI
7. [ ] Update Zustand:
   - [ ] Remove all game state
   - [ ] Keep only session/UI state
8. [ ] Remove Convex:
   - [ ] Delete `ConvexSync.tsx`
   - [ ] Delete `gameSlice.ts`
   - [ ] Remove all Convex imports

### Verification (6.0)
- [ ] No console errors
- [ ] Match creation works
- [ ] Moves sync across clients
- [ ] No Convex imports remain

---

# Phase 7: Testing & Validation

1. [ ] Expand tests:
   - [ ] Move edge cases
   - [ ] Phase transitions
   - [ ] Multiplayer sync
2. [ ] Update UI tests
3. [ ] Manual QA (`QA_CHECKLIST.md`)
4. [ ] Load testing:
   - [ ] 5 concurrent matches

### Verification (7.0)
- [ ] All tests pass (`bun run test`)
- [ ] QA complete
- [ ] Server stable under load

---

# Phase 8: Deployment & Production Setup

1. [ ] Update env vars:
   - [ ] `VITE_SERVER_URL=https://sen-server.railway.app`
2. [ ] Deploy frontend (Vercel)
3. [ ] Deploy server (Railway)
4. [ ] Monitoring:
   - [ ] UptimeRobot for `/health`
5. [ ] Rollback plan (`ROLLBACK.md`)
6. [ ] Full end-to-end playtest

### Verification (8.0)
- [ ] Production playable
- [ ] Monitoring green
- [ ] End-to-end match validated

---

# Phase 9: Convex Deprecation & Cleanup

1. [ ] Confirm 7-day production stability
2. [ ] Remove Convex:
   - [ ] `bun remove convex`
3. [ ] Delete all Convex code:
   - [ ] Delete `convex/`
4. [ ] Remove Convex env/config files
5. [ ] Update documentation
6. [ ] Search & remove all:
   - [ ] `import ... convex`
7. [ ] Tag release:
   - [ ] `git tag -a convex-deprecation -m "Fully migrated to Boardgame.io"`

### Verification (9.0)
- [ ] Build succeeds
- [ ] Zero Convex references (`rg -i "convex"`)
- [ ] Production stable

---

# Phase 10: Hotseat Mode Re-enablement

1. [ ] Update `App.tsx`:
   - [ ] Switch to `SenClientLocal` in hotseat mode
   - [ ] Show player indicator
2. [ ] Create `HotseatPlayerIndicator` component
3. [ ] Add hotseat option to `LandingPage`
4. [ ] Add hotseat tests

### Verification (10.0)
- [ ] Hotseat works
- [ ] No network requests
- [ ] Hidden info handled per player ID
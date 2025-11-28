# State & Backend Architecture (Draft)

## Motion & Layout Guardrails
- Gameplay viewport locked to `min-height: 100dvh`, `overflow: hidden` on the main shell; body uses `overscroll-behavior: none`.
- Transform/opacity-only motion; no width/height/top/left transitions. Default: motion disabled unless a component opts into `.motion-default`.
- Respect `prefers-reduced-motion`; timers/loops fall back to static state.
- Safe-area aware padding for bottom dock/notches; HUD uses sticky positioning instead of fixed when possible.

## Client State (Zustand v5)
- Store lives in `/src/state`; slices are combined with `create`:
  - `sessionSlice`: playerId, name, auth token, roomId, locale, theme, persisted via `persist`.
  - `gameSlice`: canonical `GameState` (deck/discard, hands, turn index, peek/swap/take2 phases, chat, lastMove), plus `roomStatus` and version marker.
  - `uiSlice`: dialogs/sheets, toasts, safeArea insets, reduced-motion flag.
  - `netSlice`: ws status, latency, reconnect attempts.
- Middlewares: `devtools` (last), `persist` (selective), `subscribeWithSelector` for fine-grained updates.
- `ConvexSync` component (mounted in `App`) owns live queries for game/chat/players, pushes updates into the store, and heartbeats presence. Old `GameContext` is removed; components read via selectors/hooks (`useGame`, `usePlayersView`).

## Data Model & DTOs (client/server contract)
- `Room`: id, code, mode ("online" | "hotseat"), hostId, status ("lobby" | "playing" | "round_end" | "game_over"), createdAt, updatedAt.
- `Player`: id, roomId, name, seat, connected, score, lastSeen, isHost.
- `Card`: { id, value, isSpecial, specialAction? ("peek_1" | "swap_2" | "take_2"), sprite }.
- `HandCard`: { cardId, isFaceUp, hasBeenPeeked, slot }.
- `Move`: { id, roomId, playerId, action, payload, createdAt, idempotencyKey }.
- `ChatMessage`: { id, roomId, playerId, body, createdAt } with pagination.
- `Presence`: { playerId, roomId, status ("online" | "away"), lastPing }.
- `RoomState` DTO: { room, players, deckCount, discardTop, hands[], turnIndex, drawnCard?, drawSource?, lastMove?, timers?, actionMessage }.
- `PresenceSnapshot` DTO: { roomId, playersOnline, lastUpdated }.

## Backend Stack Decision
- Keep Convex, rebuild from scratch:
  - Schema tables: rooms, players, hands, deck, discard, moves, chat, presence.
  - Queries: `roomState(roomId)`, `chatLatest(roomId, cursor?)`, `presence(roomId)`.
  - Mutations: createRoom, joinRoom, startGame, drawFromDeck/Discard, swap, peek, take2, discardHeld, callPobudka, endRound, rematch, updatePresence.
  - Actions: shuffleDeck, rematchSetup; enforce idempotency via `idempotencyKey`.
  - Server invariants: validate turn, card availability, hand limits; all gameplay authority on server.
- Justification: fits realtime turn updates, free tier adequate; avoids auth/realtime rewrite required by Supabase/Liveblocks.

## Integration Notes
- Service layer at `/src/lib/api/gameClient.ts` wraps Convex queries/mutations with DTO typing.
- UI consumes selectors (no global context) via `useGameStore`.
- Primary CTA derived selector maps to a single button component to avoid duplicates.

## Testing & Mocks (Convex)
- Use `convex-test` to run mutations/queries in-memory for fast, deterministic checks (deck integrity, idempotency, seat assignment, presence updates).
- Mocks let us validate invariants without hitting the hosted Convex deployment, and prevent flaky tests when offline.
- Add unit specs for: `startGame` (deck size, 4-card hands, discard empty, version set), `setGameState` (stale/idempotent protection), `joinRoom` (seat uniqueness), and chat pagination cursor logic.

## Acceptance for Task 1
- Policies defined, data contract outlined, backend choice made; ready to scaffold store and Convex schema in subsequent tasks.

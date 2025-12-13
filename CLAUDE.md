# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Dreamcats is a multiplayer card game built with React 19, TypeScript, Vite, and Convex for real-time backend. Players compete to build the lowest-scoring 4-card hand. Game supports both online multiplayer and local hotseat modes.

## Development Commands

### Core Commands
- **Install dependencies**: `bun install`
- **Dev server (full stack)**: `bun run dev` (runs Convex + Vite concurrently)
  - **Frontend only**: `bun run dev:ui` (Vite on default port, assumes Convex is running separately)
  - **Convex only**: `bun run dev:convex` (useful if debugging backend in isolation)
- **Build**: `bun run build` (runs `tsc -b && vite build`)
- **Lint**: `bun run lint`
- **Preview production build**: `bun run preview`

### Testing
- **Run tests** (watch mode): `bun run test`
- **Run tests once**: `bun run test:run`
- **Run specific test file**: `bun run test:run convex/__tests__/path/to/file.test.ts`
- Tests are configured for Convex functions only (see `vitest.config.mts`)
- Test files should live in `convex/__tests__/**/*.test.ts`

### Convex Backend
- **Start Convex dev**: `bunx convex dev` (generates types, deploys functions, watches for changes)
- **Deploy to production**: `npx convex deploy` (requires `CONVEX_DEPLOYMENT` env var)
- **Verify deployed functions**: Check Convex dashboard at https://dashboard.convex.dev
- Convex generates types to `convex/_generated/` - never edit these manually

## Architecture

### State Management (Critical)

The app uses a **unidirectional Zustand store** with specialized slices. State flows one way:

**Client (Online Mode)**:
1. User action → Local optimistic update (optional) → Convex mutation
2. Convex mutation → Updates authoritative DB state
3. Convex query subscription → `ConvexSync` component → Updates Zustand store
4. Zustand store → React components re-render

**Store Structure** (`src/state/store.ts`):
- **SessionSlice**: Player identity, room ID, locale, theme (persisted to localStorage)
- **GameSlice**: Game state, room status, version tracking
- **UISlice**: UI state (menu open, safe area, reduced motion)
- **NetSlice**: Network status, latency, reconnect attempts

**Key State Files**:
- `src/state/store.ts` - Main Zustand store with persistence
- `src/state/ConvexSync.tsx` - Bridge component that syncs Convex queries → Zustand
- `src/state/gameSlice.ts` - Game state slice with immutable updates
- `src/state/selectors.ts` - Memoized selectors for derived state
- `src/state/types.ts` - TypeScript interfaces for all slices

### Convex Backend Architecture

**Database Schema** (`convex/schema.ts`):
- `rooms` - Room metadata (roomId code, host, status, mode)
- `players` - Player roster per room (seat, score, connection status)
- `games` - Authoritative game state snapshots with version counter and idempotency keys
- `moves` - Move history log (for debugging/replay)
- `messages` - Chat messages per room
- `presence` - Player online/offline heartbeat tracking

**Key Convex Files**:
- `convex/rooms.ts` - Room creation, joining, player management
- `convex/games.ts` - Game state queries with **server-side card visibility filtering**
- `convex/actions.ts` - Game action mutations (draw, swap, call, etc.)
- `convex/chat.ts` - Chat message handling
- `convex/cleanup.ts` - Cleanup logic for stale rooms
- `convex/crons.ts` - Scheduled jobs (runs cleanup every hour for rooms inactive >1hr)

**Important**: The server filters card visibility per player. Clients never see hidden opponent cards. The `getGameState` query in `convex/games.ts` handles this filtering based on game phase and player ID.

### Game Logic

**Core Logic** (`src/lib/game-logic.ts`):
- Deck creation (54 cards: 0-8 values, nine 9s, special cards)
- Game state reducers (immutable state transitions)
- Action handlers (draw, swap, peek, call, etc.)
- Special card effects (take_2, peek_1, swap_2)

**Game Flow**:
1. Lobby → Players join → Host starts
2. Setup → Each player gets 4 face-down cards, peek at 2
3. Turn Loop → Draw from deck/discard, swap/discard/use special
4. Round End → Player calls "POBUDKA", all reveal, score
5. Next Round or Game Over (first to 100 points)

### Component Structure

**UI Components** (`src/components/ui/`):
- Built with shadcn/ui (Radix UI primitives + Tailwind)
- Use `cn()` helper from `src/lib/utils.ts` for conditional classes

**Game Components**:
- `LandingPage.tsx` - Entry point, room creation/joining
- `LobbyScreen.tsx` - Pre-game lobby with player roster
- `Gameboard.tsx` - Main game view
- `PlayerHand.tsx` - Player's 4-card hand
- `GameActions.tsx` - Action buttons (draw, swap, call)
- `ChatBox.tsx` - In-game chat
- `Scoreboard.tsx` - Score tracking

**Special Components**:
- `ConvexSync.tsx` - Invisible component that syncs Convex → Zustand
- `Tutorial.tsx` - Tutorial overlay for new players
- `ActionModal.tsx` - Modal for special card actions (peek, swap)

### Styling & Motion

**Tailwind Configuration** (`tailwind.config.js`):
- Custom theme extends default Tailwind
- CSS variables for theming (light/dark mode via next-themes)
- Custom animations in `tailwindcss-animate`

**Animation Guidelines** (from README):
- Transform/opacity only (no width/height transitions to avoid reflow)
- Honors `prefers-reduced-motion`
- Core durations capped at ~200ms ease-out
- Gameplay locks scroll via `game-scroll-lock` class and uses `min-h-dvh`
- Compact mode for viewports <1100px width or <860px height

### i18n (Internationalization)

**Setup** (`src/i18n/config.ts`):
- Uses `i18next` with `react-i18next`
- Supported languages: English (`en`), Polish (`pl`)
- Translations in `public/locales/{lng}/{ns}.json`
- Detection order: localStorage → browser navigator
- Lazy-loaded via HTTP backend

**Usage**:
- Access via `useTranslation()` hook
- Store locale in Zustand `SessionSlice`
- `<LanguageSwitcher />` component for switching

### Import Aliases

TypeScript is configured with `@/` alias for `./src/*`:
```typescript
import { GameState } from "@/types";
import { cn } from "@/lib/utils";
```

## Code Style Conventions

### TypeScript
- Use `React.FC` for component type annotations
- Define shared types in `src/types/index.ts` and `convex/types.ts`
- Avoid `any` - use proper types or `unknown`
- Use strict TypeScript config

### Components
- PascalCase for component files and names
- Named exports (not default exports)
- Functional components with hooks
- Group imports: React → external libs → internal modules

### Naming
- camelCase for variables/functions
- PascalCase for components/types
- React hooks follow `use*` convention
- Convex functions use descriptive names (e.g., `getGameState`, `performAction`)

### Error Handling
- Use `toast` from `sonner` for user feedback
- Handle loading states explicitly
- Catch Convex mutation errors gracefully (network failures, stale versions)

### Comments
- Natural language, minimal punctuation
- Only comment non-obvious logic
- No redundant comments

## Common Patterns

### Convex Mutations
When calling Convex mutations from client:
```typescript
const mutateFn = useMutation(api.actions.performAction);
await mutateFn({ roomId, playerId, action: { type: "draw_deck" } });
```

### Zustand Selectors
Use selectors for derived state:
```typescript
const currentPlayer = useAppStore(selectCurrentPlayer);
```

### Optimistic Updates
For hotseat mode, update local state immediately. For online mode, let ConvexSync handle remote updates.

## Development & Debugging

### Testing Convex Functions
- Write tests in `convex/__tests__/**/*.test.ts` using the `convex-test` library
- Import mutations/queries from `convex/index.ts`
- Use `ConvexTestingHelper` to simulate client calls
- Run specific test: `bun run test:run convex/__tests__/games.test.ts`

### Checking Store State
- Use React DevTools to inspect Zustand store (component props section)
- Add temporary `console.log` in selectors to trace state updates
- Check localStorage for persisted SessionSlice state

### Debugging Convex Queries
- Enable verbose logging: `bunx convex dev --verbose`
- Check Convex dashboard logs at https://dashboard.convex.dev
- Review move history in `moves` table for game action tracing
- Use `listMessages` queries to inspect chat/game events

### Network Issues
- Check NetSlice state (reconnection status, latency) in component tree
- Monitor ConvexSync subscription by adding console logs in component
- Verify `VITE_CONVEX_URL` is set correctly in `.env.local`

## Deployment

### Vercel
- Config in `vercel.json`
- Build command: `npx convex deploy --cmd 'bun run build'` (auto-configured; deploys Convex functions before frontend)
- Important: Set environment variables in Vercel dashboard (not in `.env.local` which is gitignored)

### Environment Variables
- `VITE_CONVEX_URL` - Convex deployment URL (for client); if not set, uses `CONVEX_URL`
- `CONVEX_DEPLOYMENT` - Convex deployment name in format `prod:project-name` (for server/CI)
- Both are required for production deployment

## Game Rules Reference

See `RULES.md` for complete game specification. Key mechanics:
- 54-card deck with values 0-9 and special cards
- 4-card hand, peek at 2 during setup
- Draw from deck or discard pile
- Special cards only activate when drawn from deck
- Round ends when player calls POBUDKA
- Caller gets +5 penalty if not lowest score
- Game ends at 100 points, lowest wins

## Additional Files

- `AGENTS.md` - Agent/MCP configuration and code style guide (legacy/supplemental)
- `RULES.md` - Full game rules and design spec
- `.env.local` - Local environment variables (gitignored)

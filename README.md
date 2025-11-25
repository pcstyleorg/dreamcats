# sen-web

A multiplayer card game built with React 19, TypeScript, Vite, and Convex. Based on the Polish card game "Sen" (also known as "Rat-a-Tat Cat").

## Setup

1. Install dependencies:
```bash
bun install
```

2. Set up Convex:
```bash
bun x convex dev
```
This will:
- Create a Convex project (if needed)
- Generate TypeScript types
- Deploy your functions

3. Configure environment variables:
Create a `.env` file with:
```
VITE_CONVEX_URL=<your-convex-deployment-url>
```
The Convex URL will be provided when you run `bun x convex dev`.

4. Run the development server:
```bash
bun run dev
```

## Development

- **Dev**: `bun run dev` - Vite development server
- **Build**: `bun run build` - TypeScript check + Vite build
- **Lint**: `bun run lint` - ESLint
- **Test**: `bun run test` - Vitest watch mode
- **Test Run**: `bun run test:run` - Single test run
- **Preview**: `bun run preview` - Preview production build

## Architecture

### State Management
- **Zustand Store** (`src/state/`) - Unified client state with slices:
  - `sessionSlice` - Player identity, room, locale, theme
  - `gameSlice` - Game phase, players, cards, moves
  - `uiSlice` - UI state, safe areas, reduced motion
  - `netSlice` - Connection status, latency
- **GameContext** - Handles Convex integration and game actions
- **GameStateBridge** - Syncs GameContext state to Zustand store

### UI/Motion Policy
- Gameplay viewport locked to `min-height: 100dvh` with `overflow: hidden`
- Transform/opacity-only animations (no width/height/top/left transitions)
- Respects `prefers-reduced-motion` media query
- Safe-area aware padding for notches and bottom bars

### Project Structure
- `src/components/` - React components (UI primitives in `ui/`)
- `src/context/` - React context providers
- `src/state/` - Zustand store and hooks
- `src/lib/` - Game logic and utilities
- `src/types/` - TypeScript interfaces
- `convex/` - Backend functions and schema

## Convex Backend

The game uses Convex for:
- Real-time game state synchronization
- Room management
- Chat messages
- Player presence tracking

### Convex Functions

- `convex/rooms.ts` - Room creation and player management
- `convex/games.ts` - Game state synchronization with idempotency
- `convex/chat.ts` - Chat message handling with pagination
- `convex/cleanup.ts` - Automatic cleanup of old/abandoned rooms
- `convex/crons.ts` - Scheduled cron jobs for maintenance

### Testing

Backend tests use `convex-test` for in-memory mocks:
```bash
bun run test:run
```

Tests validate:
- Room creation and seat uniqueness
- Deck integrity (54 cards with correct distribution)
- Idempotent game state updates
- Chat pagination

### Automatic Room Cleanup

Rooms inactive for more than 1 hour are automatically cleaned up via scheduled cron jobs.
 
## Deployment
 
### Vercel
 
1. Import your repository into Vercel
2. Add environment variables:
   - `CONVEX_DEPLOYMENT` - Your Convex deployment name
   - `CONVEX_URL` - Your Convex deployment URL
3. The `vercel.json` configures the build to deploy Convex functions before building the frontend

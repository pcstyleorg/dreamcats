# AGENTS.md

## Project Overview
**Sen** is a multiplayer card game (based on the Polish card game "Sen" / "Rat-a-Tat Cat") built with React 19, TypeScript, Vite, and Convex for real-time backend. Players build a "Dream" of 4 cards aiming for the lowest total value.

## Commands
- **Dev**: `bun run dev` (Vite development server)
- **Build**: `bun run build` (TypeScript check then Vite build)
- **Lint**: `bun x eslint .` (ESLint for TypeScript/React files)
- **Test**: `bun run test` (Vitest watch mode)
- **Test Run**: `bun run test:run` (single test run)
- **Preview**: `bun run preview` (preview production build)
- **Convex Dev**: `bun x convex dev` (start Convex backend)

## Tech Stack
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS
- **UI Components**: shadcn/ui (Radix primitives)
- **State**: Zustand v4 (slices: session, game, ui, net) + GameStateBridge for sync
- **Backend**: Convex (real-time sync, rooms, chat, presence)
- **Animation**: Framer Motion (transform/opacity only)
- **i18n**: i18next (English/Polish)
- **Testing**: Vitest + convex-test for backend mocks

## Architecture
- `src/state/` - Zustand store with slices and unified hooks
  - `store.ts` - Combined store with devtools/persist/subscribeWithSelector
  - `hooks.ts` - Unified hooks (usePlayersView, useIsMyTurn, useGamePhase, etc.)
  - `bridge/GameStateBridge.tsx` - Syncs GameContext → Zustand store
- `src/context/` - React contexts (GameContext for Convex integration, TutorialContext)
- `src/components/` - React components; `ui/` contains shadcn/ui primitives
- `src/lib/` - Game logic (`game-logic.ts`), utilities, card assets
- `src/types/` - TypeScript interfaces (Card, Player, GameState, GamePhase, etc.)
- `convex/` - Backend functions (rooms, games, chat, presence, cleanup, crons)

## Code Style Guidelines

### Imports & Structure
- Use absolute imports with `@/` prefix for src files (configured in tsconfig)
- Group imports: React first, then external libraries, then internal modules
- Use named exports for components and utilities

### TypeScript & Types
- All components use `React.FC` type annotation
- Define interfaces in `src/types/index.ts`
- Use strict TypeScript configuration with proper typing
- Key types: `Card`, `Player`, `GameState`, `GamePhase`, `GameAction`

### Component Conventions
- Use PascalCase for component names and files
- Follow shadcn/ui patterns for UI components in `src/components/ui/`
- Use Tailwind CSS classes with responsive design (sm:, md:, lg:)
- Animations: transform/opacity only; respect `prefers-reduced-motion`

### State Management
- Zustand store is the primary state source (feature flag enabled by default)
- Use hooks from `src/state/hooks.ts` for state access in components
- GameContext handles Convex integration; GameStateBridge syncs to Zustand
- Convex handles authoritative game state for multiplayer

### UI/Motion Policy
- Gameplay viewport: `min-height: 100dvh`, `overflow: hidden`
- Transform/opacity-only animations (no layout-triggering transitions)
- Safe-area aware padding for notches and bottom bars
- Respect `prefers-reduced-motion` media query

### Error Handling
- Use toast notifications from `sonner` for user feedback
- Handle loading states and edge cases in components

### Naming
- Use camelCase for variables and functions
- Use descriptive names for game logic functions
- Follow React hooks naming conventions (use*)

## Testing
- Convex tests in `convex/__tests__/` using `convex-test` for in-memory mocks
- Tests validate: room creation, seat uniqueness, deck integrity, idempotency
- Run with `bun run test:run`

## Deployment
- Vercel deployment with `npx convex deploy --cmd 'npm run build'`
- Env vars: `CONVEX_DEPLOYMENT`, `CONVEX_URL`

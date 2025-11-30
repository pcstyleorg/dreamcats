# AGENTS.md

## Commands
- **Install dependencies**: `bun install`
- **Convex dev environment**: `bunx convex dev` (creates/updates the Convex project, generates `convex/_generated/` types, and launches the backend watcher)
- **Dev**: `bun run dev` (runs `bun run dev:convex` and `bun run dev:ui` in parallel); `bun run dev:convex` and `bun run dev:ui` are also available individually
- **Build**: `bun run build` (runs `tsc -b` followed by `vite build`)
- **Lint**: `bun run lint` (ESLint for TypeScript/React files)
- **Test (watch)**: `bun run test`
- **Test (once)**: `bun run test:run`
- **Preview production build**: `bun run preview`
- **Convex deploy**: `npx convex deploy` (requires `CONVEX_DEPLOYMENT` env var); Vercel runs `npx convex deploy --cmd 'bun run build'` per `vercel.json`

## Agent/MCP Notes
- Subagent MCP server is disabled; do not rely on parallel Claude subagents.
- Use Context7 whenever correctness depends on third-party docs (React, Convex, Vite, etc.); otherwise work directly in the repo.
- Use Voice Codex MCP only when the `.use-voice` file exists and contains `true`; if missing or different, avoid Voice Codex unless explicitly requested.
- If Voice MCP becomes enabled, read `agent-voice.md` before using it.
- `CLAUDE.md` holds a deep dive on architecture, Convex state flow, and common patterns—consult it before making major design or state changes.
- `RULES.md` is the authoritative game specification (deck composition, turn flow, scoring)—use it for gameplay logic work.
- The repo does not currently ship `tasks.md`; proceed with one major task at a time and capture progress verbally instead of checking boxes.
- Convex generates types under `convex/_generated/`; never edit them manually.
- `VITE_CONVEX_URL` (client) and `CONVEX_DEPLOYMENT` (deploy scripts) must be set in `.env`/CI before running dev or deploy tasks.

## Code Style Guidelines

### Imports & Structure
- Use absolute imports with the `@/` prefix for files under `src/`.
- Group imports with React first, external libraries second, and internal modules last.
- Prefer named exports for components, hooks, utilities, and stores.

### TypeScript & Types
- Annotate all components with `React.FC`.
- Define shared interfaces in `src/types/index.ts`; augment with `convex/types.ts` for backend contracts when needed.
- Keep the strict TypeScript config happy—avoid `any`, prefer precise typings, and run `tsc -b` when troubleshooting type issues.

### Component Conventions
- Use PascalCase for component files and names.
- Follow shadcn/ui patterns in `src/components/ui/` and reuse existing primitives like Button, Dialog, etc.
- Lean on Tailwind CSS with responsive variants (`sm:`, `md:`, `lg:`) and helper `cn` utilities.

### State & Convex Patterns
- State flows through Zustand slices in `src/state/`; prefer selectors in `src/state/selectors.ts` and `ConvexSync.tsx` for syncing.
- Convex backend files live in `convex/`; mutations and queries should respect per-player card visibility.
- Local `bunx convex dev` must be running when working on state flows that depend on live Convex data.

### Error Handling & UX
- Surface errors via `sonner` toast notifications and guard loading/empty states.
- Gracefully handle Convex mutation failures (stale versions, network glitches) with fallback UI.

### Naming
- Use camelCase for variables and functions, PascalCase for components/types.
- Follow React hook naming (`use*`) and keep game-logic functions descriptive (e.g., `drawDeck`, `handleSwap`).

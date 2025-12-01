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

## Graphite CLI (gt)
- `gt create [name]` stacks a new branch on the current one and commits staged changes; use `-am "<message>"` (alias of `gt c -am`) to stage-all and commit in one step.
- `gt log short` (alias `gt ls`) shows tracked stacks/branches in compact form; `gt log` is more verbose and `gt log long` prints full ancestry.
- `gt submit --stack` (alias `gt ss`) submits/updates PRs for all branches in the current stack; add `--update-only` (`-u`) to skip creating new PRs.
- `gt sync` restacks and syncs tracked branches with remote; `gt move`, `gt up`, `gt down`, and `gt checkout` help navigate and rebase stacks.
- Get command help via `gt --help`, `gt <command> --help`, or `gt --help --all` for the full list; enable shell completion with `gt completion`.

## Agent/MCP Notes
- Use Context7 whenever correctness depends on third-party docs (React, Convex, Vite, etc.); otherwise work directly in the repo.
- Use Claude-Contex (semantic code search) when available for searching files—index the codebase first with `index_codebase`, then use `search_code` for natural language queries across the project.
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

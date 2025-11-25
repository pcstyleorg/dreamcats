# AGENTS.md

## Commands
- **Build**: `bun run build` (preferred) or `npm run build` (runs TypeScript check then Vite build)
- **Lint**: `bun run lint` (preferred) or `npm run lint` (ESLint for TypeScript/React files)
- **Dev**: `npm run dev` (Vite development server)
- **Preview**: `npm run preview` (preview production build)

## Agent/MCP Notes
- Subagent MCP server is disabled; do not rely on parallel Claude subagents.
- Use Context7 for library/framework docs when needed; otherwise work directly in the repo.
- Use Voice Codex MCP only when the `.use-voice` file exists with content set to `true`; if the file is missing or has any other content, avoid Voice Codex unless explicitly asked.
- If Voice MCP is enabled (via `.use-voice` or explicit request), first read `agent-voice.md` for voice tool usage and follow it.
- Follow `tasks.md`: tackle only one major task at a time in order, mark checkboxes as you complete them, and proceed step-by-step.

## Code Style Guidelines

### Imports & Structure
- Use absolute imports with `@/` prefix for src files (configured in tsconfig)
- Group imports: React first, then external libraries, then internal modules
- Use named exports for components and utilities

### TypeScript & Types
- All components use `React.FC` type annotation
- Define interfaces in `src/types/index.ts`
- Use strict TypeScript configuration with proper typing

### Component Conventions
- Use PascalCase for component names and files
- Follow shadcn/ui patterns for UI components in `src/components/ui/`
- Use Tailwind CSS classes with responsive design (sm:, md:, lg:)

### Error Handling
- Use toast notifications from `sonner` for user feedback
- Handle loading states and edge cases in components

### Naming
- Use camelCase for variables and functions
- Use descriptive names for game logic functions
- Follow React hooks naming conventions (use*)

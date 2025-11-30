# AGENTS.md

This file provides guidance to Qoder (qoder.com) when working with code in this repository.

## Commands
- **Build**: `bun run build` (preferred) (runs TypeScript check then Vite build)
- **Lint**: `bun lint` (preferred) (ESLint for TypeScript/React files)
- **Dev**: `bun dev` (Vite development server)

## Task Management
- **Always follow tasks.md**: If `tasks.md` exists (planmd format), it tracks the active migration/implementation plan
- **Always read PLAN.MD**: When following `tasks.md` you should grep or read only a set amount of lines of the `PLAN.MD` unless you have trouble finding something then and only then you can read the whole file
- Work on tasks sequentially: tackle only one major phase/task at a time
- Update task checkboxes as you complete work: `[ ]` → `[x]`
- When a task is complete, verify against the "Verification" checklist at the end of each phase
- Never skip ahead or work out of order unless explicitly instructed

## Agent/MCP Notes
- Subagent MCP server is disabled; do not rely on parallel Claude subagents
- Use Context7 for library/framework docs when working with any frameworks/libs; otherwise work directly in the repo
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
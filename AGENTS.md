# AGENTS.md

## Commands
- **Build**: `npm run build` (runs TypeScript check then Vite build)
- **Lint**: `npm run lint` (ESLint for TypeScript/React files)
- **Dev**: `npm run dev` (Vite development server)
- **Preview**: `npm run preview` (preview production build)

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
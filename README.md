# DreamCats

A multiplayer card game built with React, TypeScript, and Convex.

## Features

- **Multiplayer Gameplay**: Real-time card action with multiple players.
- **Robust Backend**: Powered by [Convex](https://convex.dev) for real-time state synchronization, presence, and chat.
- **Immersive Audio**: Sound effects for game actions and interactions using [Howler.js](https://howlerjs.com/).
- **Smooth Animations**: Game state transitions and card movements powered by [GSAP](https://gsap.com/).
- **Responsive Design**: A scalable N-W-E-S table layout that works across devices, with specific "scale-to-fit" logic.
- **Internationalization**: Fully localized interface with support for **English** and **Polish**.
- **Tutorial Mode**: Interactive tutorial to learn the game rules.

## Tech Stack

- **Frontend**: React, TypeScript, Vite
- **Styling**: Tailwind CSS v4, Radix UI, Shadcn/ui
- **State Management**: Zustand
- **Backend**: Convex (Real-time DB, Functions)
- **Animation**: GSAP (GreenSock Animation Platform)
- **Audio**: Howler.js
- **Testing**: Vitest, Convex Test

## Setup

1. Install dependencies:

```bash
bun install
```

2. Set up Convex:

```bash
bunx convex dev
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

The Convex URL will be provided when you run `bunx convex dev`.

4. Run the development server:

```bash
bun run dev
```

## Development

- **Dev Server**: `bun run dev` (Runs both Convex and Vite)
- **Build**: `bun run build`
- **Lint**: `bun run lint`
- **Test**: `bun run test`

## Project Structure

- `src/components/` - React components (Gameboard, PlayerHand, etc.)
- `src/hooks/` - Custom hooks (Audio, Scaling, User Preferences)
- `src/state/` - Zustand store and game state management
- `src/lib/` - Game logic and utilities
- `src/locales/` - i18n translation files (en, pl)
- `convex/` - Convex backend functions and schema

## Deployment

### Vercel

To deploy this project to Vercel:

1.  **Import Project**: Import your repository into Vercel.
2.  **Environment Variables**: Add the following environment variables in your Vercel project settings:
    - `CONVEX_DEPLOYMENT`: Your Convex deployment name (e.g., `dev:your-project-name`).
    - `CONVEX_URL`: Your Convex deployment URL (e.g., `https://your-project-name.convex.cloud`).
    - You can find these in your `.env.local` file or the Convex dashboard.
3.  **Build Command**: The project includes a `vercel.json` file that automatically configures the build command to:
    ```bash
    npx convex deploy --cmd 'npm run build'
    ```
    This ensures your Convex functions are deployed before the frontend is built.

### Convex Deploy (manual)

Set your deployment and run:

```bash
export CONVEX_DEPLOYMENT=dev:your-project-name
npx convex deploy
```

This pushes the updated functions (including `idempotencyKey/version` support) before serving the app.

## Motion & Layout Guardrails

- **GSAP**: Used for complex card animations and state transitions. Replaced Framer Motion for better performance and stability.
- **Layout**: The game uses a dedicated `useScaleToFit` hook to ensure the game board fits perfectly within the viewport, maintaining aspect ratio and visibility.
- **Scroll Locking**: Gameplay locks scroll via `game-scroll-lock` and uses `min-h/100dvh`.
- **Reduced Motion**: Honors `prefers-reduced-motion`.

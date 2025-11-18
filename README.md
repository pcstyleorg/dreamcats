# sen-web

A multiplayer card game built with React, TypeScript, and Convex.

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

- **Build**: `bun run build`
- **Lint**: `bun run lint`
- **Preview**: `bun run preview`

## Convex Backend

The game uses Convex for:
- Real-time game state synchronization
- Room management
- Chat messages
- Player presence tracking

### Convex Functions

- `convex/rooms.ts` - Room creation and player management
- `convex/games.ts` - Game state synchronization
- `convex/chat.ts` - Chat message handling
- `convex/cleanup.ts` - Automatic cleanup of old/abandoned rooms
- `convex/crons.ts` - Scheduled cron jobs for maintenance

### Automatic Room Cleanup

Rooms that have been inactive for more than 1 hour are automatically cleaned up:
- Old rooms and their associated data (players, games, messages) are deleted
- Cleanup runs every hour via a scheduled cron job
- This prevents database bloat from abandoned game sessions

### Using Convex MCP

You can inspect your Convex deployment using the Convex MCP:
- View tables and schema
- Check function metadata
- Read logs
- Query data

## Project Structure

- `src/components/` - React components
- `src/context/` - React context providers (GameContext, TutorialContext)
- `src/lib/` - Game logic and utilities
- `convex/` - Convex backend functions and schema

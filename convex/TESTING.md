# Convex Testing & Mocks

Why mocks
- Running Convex functions in-memory (via `convex-test`) lets us verify game invariants (deck integrity, seat uniqueness, idempotent writes) without hitting the deployed backend.
- It keeps tests deterministic/offline and avoids flakiness from network or deployment state.
- We can exercise mutations/queries exactly as the client does, but faster, and gate CI before deploying schema changes.

Planned checks
- `rooms.createRoom` / `joinRoom`: duplicate-room guard, seat assignment uniqueness, presence row creation.
- `games.startGame`: deck size (including specials), 4 cards per player, discard empty, draw pile sized correctly, version/idempotencyKey set.
- `games.setGameState`: rejects stale versions, accepts idempotent retry.
- `chat.getMessages`: cursor/limit pagination returns chronological order.

Current setup
- Vitest configured via `vitest.config.mts` (tests under `convex/__tests__`).
- Use `convexTest(schema, import.meta.glob(["../*.ts", "../_generated/**/*.{ts,js}"]))` to load all functions and generated API.
- Run with `bun run test:run` (or `bun run test` for watch).

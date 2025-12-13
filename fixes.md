# Fixes / Follow-ups (handoff)

This file is a prioritized TODO list of known issues + improvements, with concrete instructions and file locations so work can continue in a fresh chat.

## P0 — User-visible bugs

- [ ] **Card special actions sometimes can’t target opponent cards (hotseat/solo UX)**
  - **Symptom:** When using `peek_1` / `swap_2`, clicks on opponent cards are ignored or feel inconsistent.
  - **Where to inspect:**
    - `src/components/PlayerHand.tsx` (`handleCardClick`, `canActNow`/`activePlayerId`, opponent click gating)
    - `src/state/gameReducer.ts` (special phases: `ACTION_PEEK_1_SELECT`, `ACTION_SWAP_2_SELECT`)
  - **Fix approach:**
    - Ensure the UI click-gate for special phases uses “active actor” logic, not “this hand’s owner”.
    - Make invalid interactions explicit (tooltip/toast) instead of silently returning.
    - Add a small UI test or unit test around the gating logic (see “Tests” below).
  - **Notes:** We recently updated gating with `canActNow` in `PlayerHand`, but if it’s still reproducible, re-check:
    - whether `activePlayerId` is computed correctly for all phases (peeking uses `peekingState.playerIndex`)
    - whether any other component blocks pointer events (e.g. overlays in `src/components/Card.tsx` / `src/components/Gameboard.tsx`)

- [ ] **Auth popover still shows “Upgrade to Full Account” after login (edge case)**
  - **Symptom:** After signing in with email/password, banner persists.
  - **Where to inspect:**
    - `src/components/AuthDialog.tsx` (`AuthButton` section)
    - `convex/userPreferences.ts` (`currentUser` query)
  - **Root cause (common):**
    - `users.isAnonymous` may be `undefined` for non-anonymous users; UI must treat missing as `false`.
    - Loading state: `useQuery` returns `undefined` while loading → avoid flicker/misclassification.
  - **Fix approach:**
    - Ensure anonymous detection is: `currentUser?.isAnonymous === true` (strict).
    - If `currentUser === undefined` but `isAuthenticated === true`, show a “loading user” state instead of assuming guest/full.
  - **Localization:** strings live in `src/locales/*/common.json` under `auth.upgradeAccount`/`auth.upgradeDescription` (and also duplicated in `public/locales/*/common.json`).

## P1 — UX quality / polish

- [ ] **Card-related sounds are unpleasant (too stretched / harsh)**
  - **Symptom:** “Flip/draw/shuffle” sound fast/low but still “horrible” on-device.
  - **Where to inspect:**
    - `src/hooks/use-sounds.ts` (`SOUND_SETTINGS`, Howler init, `rate`, detune logic)
  - **Why this happens:**
    - Extreme playback `rate` stretches transients; pitch shifting via WebAudio internals is brittle across browsers.
  - **Fix approach (recommended):**
    - Replace assets with short, punchy samples designed for fast playback (or add separate `flip_fast.mp3`, `draw_fast.mp3`, `shuffle_fast.mp3`).
    - Avoid WebAudio-internal detune hacks; prefer:
      - a “low” recorded/pitched sample, or
      - a subtle `rate` only (e.g. 1.2–1.6) with better source audio.
    - Consider per-sound volume normalization; current defaults are global-ish.
  - **Localizations:** none.
  - **Acceptance check:**
    - Validate on at least Safari + Chrome; listen for clipping/warble.
    - Add a simple “SFX test page” toggle if helpful (dev-only).

- [ ] **Special-action phases need clearer affordances**
  - **Symptom:** Players don’t know what is clickable during `peek_1` / `swap_2`.
  - **Where to inspect:**
    - `src/components/GameActions.tsx` (phase helper text)
    - `src/components/PlayerHand.tsx` (highlight/pulsing, cursor styles)
    - `src/components/Gameboard.tsx` (focus-phase overlay logic)
  - **Fix approach:**
    - Visually highlight valid target hands/cards (e.g. glow only valid cards).
    - Disable invalid targets with a tooltip like “Not selectable right now”.
  - **Localization:** add keys in `src/locales/*/translation.json` (and keep `public/locales/*/translation.json` in sync until consolidation happens).

## P1 — Architecture / correctness

- [ ] **i18n duplication drift: `src/locales/*` vs `public/locales/*`**
  - **Symptom:** translations get updated in one place but not the other.
  - **Where to inspect:**
    - `src/i18n/config.ts` (currently imports from `src/locales/*`)
    - `public/locales/*/*.json` (extra copies)
  - **Fix approach (pick one):**
    - Option A: **Source-of-truth = `src/locales/`**; delete `public/locales/` duplicates and remove any backend loader usage.
    - Option B: **Source-of-truth = `public/locales/`**; switch config to `i18next-http-backend` and remove direct imports.
    - If you must keep both short-term: add a script `bun run i18n:sync` to copy/validate keys.
  - **Acceptance check:** `bun run build` and spot-check language switching.

- [ ] **Solo bot runner: timeout loop risks + testability**
  - **Symptom:** bots may stall, double-act, or keep running after leaving/restarting (rare).
  - **Where to inspect:**
    - `src/state/useGame.ts` (`processBotTurns`, token/cancel logic, `useEffect` trigger)
  - **Fix approach:**
    - Replace recursive timeouts with a single “scheduler” that triggers exactly when:
      - solo mode is active AND
      - the active actor is a bot AND
      - the reducer is in a bot-playable phase.
    - Keep a hard step cap per tick (still) but make it deterministic.
    - Consider moving the pure “bot step” into a testable function:
      - `stepBot(state) -> { nextState, memoryUpdates } | null`
  - **Localization:** none.

## P2 — Gameplay/balance

- [ ] **Bot difficulty levels need better balance**
  - **Symptom:** “unbeatable” at current logic; difficulty changes should be meaningful.
  - **Where to inspect:**
    - `src/lib/bot-logic.ts` (difficulty settings + decision policies)
    - `src/components/LobbyScreen.tsx` (difficulty UI)
    - `src/state/useGame.ts` (`botDifficulty` stored in `GameState`)
    - Types: `convex/types.ts` / `src/types/index.ts`
  - **Fix approach:**
    - Make difficulty affect:
      - special usage frequency,
      - discard-pick thresholds,
      - pobudka timing,
      - “mistake” rate (intentional suboptimal choices).
    - Add per-difficulty tooltips or descriptions in Lobby.
  - **Localization:** `lobby.solo.difficulty*` keys in both `src/locales/*/translation.json` and `public/locales/*/translation.json` (until i18n consolidation).

## P2 — Performance / maintainability

- [ ] **Reduce expensive animations on low-power devices**
  - **Where to inspect:**
    - `src/components/PlayerHand.tsx` (GSAP pulses, glow filters)
    - `src/components/Gameboard.tsx` (GSAP, aura)
  - **Fix approach:**
    - Respect `prefers-reduced-motion`.
    - Prefer CSS transitions over heavy `filter`/shadow animations where possible.
    - Debounce high-frequency polling (tutorial highlight interval, etc.).

## Tests (regression coverage)

- [ ] **Add/extend tests for interaction gating**
  - **Goal:** ensure `peek_1` and `swap_2` allow selecting opponent cards in hotseat/solo and only allow the active actor to act in online/solo.
  - **Where to add:**
    - Unit-level: factor out “can click card?” logic into a pure helper and test in `src/__tests__/`.
    - Reducer-level: add state transition tests in `src/__tests__/game-reducer.test.ts` if appropriate.
  - **Current related tests:**
    - `src/__tests__/bot-logic.test.ts`
    - `src/__tests__/game-reducer.test.ts`

## Validation commands

- [ ] Run `bun run lint`
- [ ] Run `bun run test:run`
- [ ] Run `bun run build`


<!-- TODO.md format per https://github.com/todomd/todo.md -->

# Tasks

- [x] 1 Define architecture & state plan
  - [x] 1.a Confirm motion/scroll policy and layout guardrails (100dvh, overflow-hidden, safe areas)
  - [x] 1.b Finalize data model + DTOs for game, room, player, chat
  - [x] 1.c Choose backend stack (Convex rebuild vs alternative) and persistence rules

- [x] 2 Scaffold new client state (Zustand)
  - [x] 2.a Create `/src/state` slices: session, game, ui, net
  - [x] 2.b Wire devtools/persist/selectors and reduced-motion flag
  - [x] 2.c Replace GameContext consumers with store selectors behind a feature flag

- [x] 3 Rebuild backend (Convex or alternative)
  - [x] 3.a Redesign schema/tables for rooms, players, hands, moves, chat, presence
  - [x] 3.b Implement mutations/actions with invariants + idempotency keys
  - [x] 3.c Add queries for roomState, chatLatest, presence; include pagination/limits
  - [x] 3.d Provide local mocks/tests (convex-test or equivalent) — see convex/TESTING.md

- [x] 4 UI integration & layout hardening
  - [x] 4.a Swap UI to new store/actions; remove old context (feature flag enabled by default, unified hooks created)
  - [x] 4.b Fix HUD/top bar + CTA consolidation; room info tray for mobile, pill for desktop
  - [x] 4.c Remove reflow-causing animations; enforce transform-only cues; ensure no vertical scroll in gameplay (container overflow lock added)

- [x] 5 QA and cleanup
  - [x] 5.a Lint/build/test; responsive sweep at 360/768/1024/1440 (lint+build+test pass)
  - [x] 5.b Update docs (README/proposal) with new flow and motion policy
  - [x] 5.c Remove deprecated code and feature flags (feature flag enabled by default, deprecated selectors.ts)

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

- [ ] 4 UI integration & layout hardening
  - [x] 4.a Swap UI to new store/actions; remove old context
  - [x] 4.b Fix HUD/top bar + CTA consolidation; room info tray for mobile, pill for desktop
  - [x] 4.c Remove reflow-causing animations; enforce transform-only cues; ensure no vertical scroll in gameplay (container overflow lock added)
  - [x] 4.d Guard Convex sync when idempotency/version not yet accepted server-side (fallback payload)

- [ ] 5 QA and cleanup
  - [ ] 5.a Lint/build/test; responsive sweep at 360/768/1024/1440 _(lint/build/tests done; responsive sweep pending)_
    - [ ] 5.a.i Confirm no vertical scroll in gameplay at 360/768 split-view and 1024/1440 full width
    - [ ] 5.a.ii Verify room pill/tray does not overlap CTAs; single primary CTA per view
    - [ ] 5.a.iii Check piles/action bar sizing in compact mode (<=1100px width or <=860px height)
  - [x] 5.b Update docs (README/proposal) with new flow and motion policy
  - [x] 5.c Remove deprecated code and feature flags (legacy GameContext removed)

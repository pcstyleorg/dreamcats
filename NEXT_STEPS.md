# NEXT_STEPS

This checklist consolidates the remaining work from CODE_ANALYSIS.md and REFACTORING_SUMMARY.md so improvements, test gaps, and production-readiness follow-ups live in one accurate place.

## Testing & Quality Assurance
- [x] Automate the documented guardrail scenarios (card visibility, state sync, special actions, edge cases) instead of relying on manual runs only; initial reducer guardrails are now covered in Vitest.【F:src/context/GameContext.test.ts†L1-L102】
- [x] Replace the "0% coverage" metric with automated guardrail runs and coverage reporting; guardrail coverage now runs via Vitest with V8 reporting, while broader suites remain TODO.【F:package.json†L10-L18】【F:CODE_ANALYSIS.md†L566-L578】
- [ ] Build integration tests for online game flow, reconnection handling, concurrent actions, and state recovery after network issues.【F:CODE_ANALYSIS.md†L542-L557】
- [ ] Add a broader unit/integration suite plus error boundaries to align the production-ready claim with regression protection.【F:CODE_ANALYSIS.md†L562-L573】【F:REFACTORING_SUMMARY.md†L162-L179】

## Performance & Architecture
- [ ] Reduce unnecessary re-renders with memoization/shallow comparisons and evaluate consolidating the mixed Context/Zustand pattern.【F:CODE_ANALYSIS.md†L569-L573】【F:CODE_ANALYSIS.md†L615-L618】【F:REFACTORING_SUMMARY.md†L162-L166】
- [ ] Optimize bundle size (e.g., code splitting) and improve loading states to keep UX responsive.【F:CODE_ANALYSIS.md†L573-L580】

## Reliability, CI, and Observability
- [x] Establish CI for lint/type/build plus the new guardrail tests to reconcile the production-ready statement with automation coverage.【F:.github/workflows/ci.yml†L1-L40】【F:REFACTORING_SUMMARY.md†L170-L179】
- [ ] Add error tracking/analytics (e.g., Sentry) to catch client issues in the field and complement manual QA.【F:CODE_ANALYSIS.md†L575-L580】【F:REFACTORING_SUMMARY.md†L175-L179】
- [ ] Consider performance monitoring and WebSocket/server-side enhancements for long-term stability in multiplayer sessions.【F:CODE_ANALYSIS.md†L575-L580】【F:REFACTORING_SUMMARY.md†L175-L183】

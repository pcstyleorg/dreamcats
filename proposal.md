# Scaling Rework Proposal

Context on the current approach (as of 2025-12-01):
- `src/App.tsx` measures `scrollHeight/scrollWidth`, then sets a `zoom` style on the entire app and compensates `min-height` with `100/scale d`vh. A `MutationObserver` plus viewport listeners keep recalculating.
- `zoom` is non-standard (unsupported in Firefox, quirky in Safari), degrades text rendering, and forces full-page reflow on every recalculation. Pointer math, focus rings, and browser zoom all get harder to reason about.
- We already have partial responsive hooks (`game-compact` class, clamp() sizes on cards), but they’re layered on top of the global zoom, so we pay the perf cost without fully solving small-screen layout issues.

Below are three alternative approaches to completely rework scaling. Each can be pursued independently; pick one direction.

## 1) CSS-First, No-JS Scaling (container queries + fluid tokens)
- Replace the global `zoom` with pure CSS fluid sizing: clamp() for typography and card sizes, `max()` for gutters, and container queries to step down density when the game area shrinks.
- Let the page scroll when space truly runs out; anchor the game board in a `min-height: 100svh` wrapper with safe-area padding instead of trying to force-fit everything.
- Consolidate sizing tokens: define `--card-size`, `--pile-size`, `--panel-gap`, `--font-base` in `index.css`, and switch their values via `@container` or `@media (max-height/width)` breakpoints.
- Simplify `game-compact`: turn it into a tiered density system (e.g., spacious/compact/ultra-compact) driven purely by CSS classes.
- Impacted files: `src/App.tsx` (remove zoom/min-height compensation), `src/index.css` (new tokens, container queries), `src/components/Gameboard.tsx` + `PlayerHand.tsx` (use tokens instead of hard-coded clamp()s).
- Pros: zero runtime layout work, works in all browsers, respects user zoom/OS accessibility, fewer reflows.
- Cons: requires careful CSS tuning across breakpoints; extremely small devices may still need some scrolling.

## 2) Targeted Scale-To-Fit Hook on the Board Only ✅ IMPLEMENTED
- Keep the rest of the UI native size; only scale the central game board when it would overflow its allocated viewport box.
- Implement a `useScaleToFit(ref, { maxScale: 1, minScale: 0.65 })` hook backed by `ResizeObserver` + `requestAnimationFrame`. Measure the board’s natural size once per layout change (player count, sidebar open/closed) and apply `transform: scale(...)` on an inner wrapper with `transform-origin: top center`.
- Remove the global MutationObserver. Tie recalcs to: window resize/visualViewport resize, sidebar toggle, player count change, and hotseat/online mode changes.
- Allow vertical scroll as a fallback when scale hits the floor; don’t compensate `dvh` manually.
- Impacted files: `src/App.tsx` (drop zoom), new hook in `src/hooks/useScaleToFit.ts`, wrapping div inside `src/components/Gameboard.tsx` (apply scale & translate), small CSS for transform containment.
- Pros: minimizes repaints (only one element scales), keeps typography crisp elsewhere, still achieves “fit-to-screen” feel for the play area.
- Cons: transform scaling can slightly blur the board on some devices; still a JS measurement path (though cheaper than today).

### Implementation Details (Completed 2025-12-01)
- Created `src/hooks/useScaleToFit.ts` - a reusable hook with ResizeObserver + RAF for smooth scale calculations
- Removed global zoom logic from `src/App.tsx` (dropped scale state, MutationObserver, compensatedHeight)
- Updated `src/components/Gameboard.tsx` to use the hook on a content wrapper with `transform: scale()`
- Removed `compensatedHeight` prop from `LandingPage` and `LobbyScreen` components
- Added CSS utility classes for transform containment in `src/index.css`
- All components now use native `100dvh` layout without compensated height calculations

## 3) Deterministic Layout Tiers + User Density Toggle
- Instead of continuous scaling, define discrete layout modes: `spacious` (desktop ≥1440×900), `compact` (tablet/low-height), `stacked` (mobile portrait).
- Each mode maps to a token set (`--card-scale`, `--pile-size`, `--grid-template`, `--sidebar-visibility`). Switch modes via simple viewport checks plus a user-accessible “Density” toggle in settings for manual override.
- In `stacked`, move sidebar content under the board; in `compact`, shrink gutters and typography; in `spacious`, keep today’s layout.
- Impacted files: `src/state/uiSlice` (persist density override), `src/components/Gameboard.tsx` (read density and apply mode classes), `src/index.css` (token tables per mode), settings UI (maybe in header sheet).
- Pros: predictable, testable breakpoints; avoids runtime measuring; gives users agency if they prefer tighter or looser layouts.
- Cons: Jumps between tiers can feel abrupt; more design work to make each tier polished.

Recommendation: start with Approach 1 if we want the simplest, accessible-by-default solution; choose Approach 2 if “always fit without scroll” is a hard requirement; choose Approach 3 if we want explicit, user-controlled density with minimal runtime cost.

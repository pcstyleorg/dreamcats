# Sen Game Board Redesign (Proposal)

## Objectives
- Deliver a clean, legible board that stays readable on mobile and desktop.
- Define a consistent motion system (cards, turns, specials) with purposeful timing.
- Remove visual noise on cards (white borders) and introduce dark-friendly vignettes.
- Prepare for `/beta` rollout with routed entry points: `/beta/create`, `/beta/lobby`, `/beta/game/:id`.

## Visual Direction
- **Palette:** Deep midnight base with soft plum and periwinkle accents; subtle grain + bloom for depth.
- **Cards:** Edge vignettes (soft-light blend), colored glows for specials, no visible white borders.
- **Typography:** Space Grotesk body, DM Serif Display for headings; all-caps micro-labels for status.
- **Surfaces:** Glassy cards/panels with low-contrast borders; layered gradients for hierarchy.

## Layout (beta)
- **Top rail:** Turn banner left; room code + actions (copy, theme, language, menu) right.
- **Opponents rail:** Horizontal scroll on mobile, grid on desktop; each with inline status and last action pill.
- **Center stack:** Draw/Discard stacks flanking a dynamic “action well” that spotlights drawn/special cards and shows contextual CTA.
- **My hand:** Anchored bottom; action bar sticky; cards spaced with responsive widths; affordances for tap targets.
- **Overlays:** Tutorial/hints float in defined corners; toast stack moved to avoid nav/buttons on mobile.

## Motion System (Framer Motion)
- **Cards (base):** Flip spring `stiffness: 380, damping: 30`; hover/tap micro-tilt; layout-safe transitions.
- **Draw:** Card lifts from draw pile, scales 1 → 1.06, fades into action well.
- **Discard:** Card slides down/right with slight rotation; settles into discard pile.
- **Turn banner:** Slide/fade with badge; 300ms ease-out.
- **Specials:**
  - **Peek (7 peek_1):** Target cards pulse glow and gain soft cyan aura; reveal uses staggered flip.
  - **Swap 2 (7 swap_2):** Both selected cards get magenta vortex glow; swap uses crossfade + position lerp.
  - **Take 2:** Two drawn options fan out, each with opposing drifts; chosen card snaps with spring, other fades.
- **Action bar:** CTA buttons elevate on availability with 180ms scale/opacity.

## States & Feedback
- **Your turn:** Banner + subtle hand glow; action well aura matches active special.
- **Waiting:** Muted surfaces; reduced motion.
- **Error/blocked:** Shake + amber outline on CTA.
- **Success:** Brief sparkle on completed action (draw/discard/special).

## Mobile Strategy
- Single-column flow; opponent rail scrollable; center well keeps 2-card stacks at readable size.
- Sticky top rail and bottom action bar; avoid viewport jumps by using CSS `dvh/svh`.
- Reduced padding; typography steps down but preserves hierarchy.

## Critical Considerations (mitigations)
- **Glassy blur on mobile:** Avoid broad `backdrop-filter` on mobile; use a mobile-only class to fall back to a semi-transparent fill (no blur) and reserve blur for the Action Well only. Consider feature-detecting `backdrop-filter` and swapping to solid if perf drops.
- **Borderless cards:** Strengthen the soft-light vignette and add a subtle rim-light shadow so cards stay legible against deep backgrounds even on low-contrast screens.
- **Motion vs. game state:** During animated states (e.g., 300ms transitions), disable pointer events on clickable elements via an `isAnimating` flag in motion variants to prevent action spam.

## Tech Plan for `/beta`
1) Create routed entry: `/beta/create`, `/beta/lobby`, `/beta/game/:id` (using Vite router), feature-flagged.
2) New `BetaLayout` shell with top rail and responsive rails.
3) Motion primitives file (variants & transitions) reused by cards, banners, rails.
4) Card component v2 with vignette, blended borders, and defined animation states.
5) QA: mobile snapshots, interaction tests for specials (peek, swap_2, take_2), dark/light parity.

## Migration Notes
- Keep existing logic; wrap new UI as alternate surfaces/components.
- Run `bun run build` + `bun run lint`; add Playwright-like smoke only if already present.
- Toggle via route guard or feature flag so legacy flow remains intact.

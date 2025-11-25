# Robustness & Responsiveness Fix Plan

Goal: remove layout-breaking animations, stop overlaps, and consolidate duplicate buttons while keeping the site responsive and stable.

## 1) Baseline & Issue Capture
- Run `bun run dev` and click through all routes; list pages/components that show jumps, overlaps, or duplicate CTAs.
- For each page, note viewport(s) where it breaks: 360px, 768px, 1024px, 1440px. Save quick screenshots or notes in `proposal.md`.
- Confirm current build passes: `bun run build` and `bun run lint`. Capture any failing files as starting points.

## 2) Animation Cleanup (stop layout shifts)
- Identify elements that animate size/position (e.g., width/height/scale on cards, buttons, nav). Replace with opacity/translate/box-shadow transitions only.
- Remove or reduce animations on layout containers; keep motion on non-structural parts (icons, backgrounds).
- Add a small motion policy: `prefers-reduced-motion` support and max duration 200–250ms, easing `ease-out`.
- Ensure all animations avoid reflow: no `top/left/width/height` transitions; prefer `transform` + `opacity`.

## 3) Layout & Overlap Fixes
- Standardize page shells to a small set of wrappers (e.g., `max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8`, consistent `gap` scale).
- Audit absolute/relative positioning that causes stacking fights; replace with flex/grid where possible and assign z-index tokens (e.g., `z-10`, `z-20`).
- Set consistent image/aspect handling (`aspect-video`, `object-cover`) to prevent intrinsic size jumps.
- Normalize headings/text spacing to avoid content collisions at narrow widths.

## 4) Button & CTA Rationalization
- Inventory every button/CTA; remove duplicates that perform the same action in the same viewport.
- Define a hierarchy: Primary (solid), Secondary (ghost/outline), Tertiary (text). Map each page to one primary CTA per view.
- Replace ad-hoc buttons with shared `Button` component from `src/components/ui` (shadcn) to align sizes/states/focus rings.

## 5) Responsive Rules
- For each problematic section, refactor to grid/flex that degrades gracefully: two-column to single column at `md`, stacked cards at `sm`.
- Lock min widths on controls (e.g., buttons, inputs) and set `w-full` on form rows for mobile.
- Add clamped typography (e.g., `text-[clamp(1rem,2vw,1.25rem)]`) where headings currently overflow.
- Verify nav/header/footer wrap correctly; ensure mobile menus do not overlay content when open.

## 6) Component Hardening
- Add loading/empty/error states to data-driven components; avoid rendering undefined arrays that collapse layout.
- Guard against missing images/media with fallbacks to fixed-aspect placeholders.
- Ensure toasts (sonner) are used for error feedback instead of inline jumps that change layout height.

## 7) QA & Verification
- Re-run `bun run lint` and `bun run build`; fix any new warnings.
- Manual responsive sweep at 360/768/1024/1440 after changes; confirm no layout shifts during interactions.
- Optional: add a lightweight visual regression checklist to `proposal.md` with before/after notes.

## 8) Definition of Done
- No element changes its size/position during hover/click/auto-play animations except via transforms that do not reflow siblings.
- Zero overlapping content at target breakpoints; primary CTA unique per viewport.
- Build and lint clean; pages readable and stable on mobile, tablet, and desktop.

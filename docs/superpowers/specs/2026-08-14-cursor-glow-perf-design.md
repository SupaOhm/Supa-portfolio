# Slice C1 — Cursor Glow Performance

**Date:** 2026-08-14
**Branch:** `perf/cursor-glow`
**Merge base:** `c540558` (main, after B2 merged via PR #7)
**Predecessors:** Slice A (PR #5), B1 (PR #6, reduced motion), B2 (PR #7, keyboard access)

## Goal

Remove the per-frame render and layout cost behind the reported scroll lag at the
projects carousel. Pulled forward out of Slice C because it collides with Slice
B3's carousel contrast fix: both edit `carouselPositionStyles.ts`, and doing perf
first means B3's contrast values get computed against final styling.

## Reported symptom

Scrolling to the carousel lags badly; scrolling elsewhere does not.

## Diagnosis

Read from source on 2026-08-14. **Not profiled** — no browser automation is
connected in this environment. The reasoning below is structural, and the manual
verification section says what would actually confirm it.

### Root cause: unconditional per-frame React state updates

`ProjectCard.tsx:26-39` starts a `requestAnimationFrame` loop with `[]` deps that
calls `setSmoothMousePosition` every frame, with a new object literal, forever:

```ts
const smoothMove = () => {
  setSmoothMousePosition((prev) => ({
    x: prev.x + (mouseRef.current.x - prev.x) * 0.15,
    y: prev.y + (mouseRef.current.y - prev.y) * 0.15,
  }));
  animationFrameId = requestAnimationFrame(smoothMove);
};
```

It never stops on convergence, never stops when the cursor is elsewhere, and never
stops when the card is off-screen. The loop is **per card instance**.

The carousel mounts 5 cards — `slotOf(idx)` returns `null` outside +/-2 and the map
returns `null` for those — so this is roughly **300 React re-renders per second**
for as long as the Projects section is mounted, which is always.

`Hero.tsx:37-50` and `Connect.tsx:93-105` contain the same loop, one instance each.

### Why the carousel specifically

The re-render count alone is not what stalls the frame; it is what each re-render
forces the browser to redo, and the carousel wraps every card in a far more
expensive context than the grid does.

The glow elements are positioned with **`left`/`top`**, not `transform`:
`ProjectCard.tsx:51-52` and `:59-60`, `Hero.tsx:75-76`, `Connect.tsx:178-179` and
`:186-187`. Animating `left`/`top` triggers **layout on every frame**, and each of
those elements carries a large blur (`blur-[60px]`, `blur-[40px]`, `blur-[80px]`,
`blur-[50px]`, `blur-[30px]`) that must then be re-rasterized.

In carousel view each card additionally sits inside `perspective: 2000px` +
`transformStyle: 'preserve-3d'` + `willChange: 'transform, opacity'`
(`Projects.tsx:283-284`) with `filter: brightness(...)` from `POSITION_STYLES`, on
top of the card's own `backdrop-blur-sm` (`ProjectCard.tsx:44`).

So per frame, per card: layout -> re-raster a 60px blur -> re-apply
`backdrop-filter` -> re-composite through a 3D perspective and a brightness filter.

Grid view mounts 12 cards but none of the 3D / filter / will-change wrapper, so
per-frame cost is far lower. Off-screen, paint is skipped, so the loops keep
burning CPU without a visible symptom. This matches the reported asymmetry.

### The glows are only visible on hover

In all three components the glow is already hidden unless hovered:

- `ProjectCard.tsx:48`, `:56` — `opacity-0 group-hover:opacity-100`
- `Connect.tsx:173` — mounted only when `hoveredLink === link.name`
- Hero — tracks the section pointer

The loops nonetheless run from mount to unmount. Stopping them when nothing is
visible is therefore a pure win with **zero visual change**.

## Scope note — a fourth glow system

The approved design described "three duplicated loops". While collecting exact
line references, a fourth cursor-tracking system was found in the same file:
`Connect.tsx` `fullHover` (`:239-241`, glow spans at `:249` and `:256`).

It has no rAF loop. It writes `setFullHover({name, x, y})` directly from every
`mousemove` event, so it re-renders `Connect` per event rather than per frame, and
its two glow spans also animate `left`/`top` over blurs.

**It is included in this slice.** It is the same defect class in the same file, and
leaving it would leave `Connect.tsx` with two different glow mechanisms after this
work.

**One behavioural change results:** `fullHover` currently positions its glows
instantly, with no smoothing. Routed through the shared hook it gains the same
easing as every other glow. This is a deliberate, visible consistency change, not
a regression.

## Design

### `src/hooks/useCursorGlow.ts` (new)

Holds **no React state**. Target position, current position, and the frame handle
live in refs. Each frame it writes two CSS custom properties onto the element the
pointer is over:

```
el.style.setProperty('--glow-x', `${x}px`)
el.style.setProperty('--glow-y', `${y}px`)
```

Public surface is a single `onMouseMove` handler.

**No enter/leave handlers.** The loop starts on `mousemove` and stops itself once
the lerp converges (delta < `CONVERGENCE_EPSILON` on both axes; it then snaps to
target, writes once more, and cancels). When the pointer leaves, mousemove stops
firing, the loop converges within roughly 30 frames at smoothing 0.15, and cancels.
Visibility is already handled by the existing CSS and conditional mounts, so
leave-handling would add nothing.

**Writes to `e.currentTarget`, not to a stored ref.** This is what lets one hook
instance serve Connect's many links. A per-link hook would be a hook call inside
`.map()` — the Rules-of-Hooks violation that had to be reverted during B1.

**Reduced motion:** when `usePrefersReducedMotion()` (from B1) is true, the target
is written directly on `mousemove` and **no rAF is ever scheduled**.

**Cleanup:** the effect's teardown cancels any pending frame.

Exported pure helpers, testable without a DOM:

```ts
export const DEFAULT_SMOOTHING = 0.15;
export const CONVERGENCE_EPSILON = 0.5;

export function nextGlowPosition(
  current: GlowPosition, target: GlowPosition, smoothing?: number
): GlowPosition;

export function hasConverged(
  current: GlowPosition, target: GlowPosition, epsilon?: number
): boolean;
```

`nextGlowPosition` reproduces the existing lerp exactly:
`next = current + (target - current) * smoothing`.

Smoothing is a hook parameter defaulting to `DEFAULT_SMOOTHING` (0.15), matching
`ProjectCard` and `Connect`'s `SMOOTHING_FACTOR`. **Hero currently uses 0.1** and
is deliberately moved to 0.15 so one shared default serves every call site; the
difference is a marginally faster follow on a single decorative glow.

### `.cursor-glow` in `src/index.css`

Global keyframes already live here (per CLAUDE.md), so the class joins them.

```css
.cursor-glow {
  position: absolute;
  top: 0;
  left: 0;
  transform: translate3d(var(--glow-x, 0px), var(--glow-y, 0px), 0)
             translate(-50%, -50%);
}
```

`translate(-50%, -50%)` centres each glow on the cursor using **its own** size,
reproducing today's `left: x - size/2` arithmetic for all seven glow elements at
their seven different sizes without repeating any offset.

The `var(..., 0px)` fallbacks are required: an unset custom property makes the
whole `transform` declaration invalid, which would leave the glows unpositioned
until first mousemove.

### Call sites

Each component drops its `mousePosition` state, `smoothMousePosition` state,
`mouseRef`, the ref-sync effect, and the rAF effect, replacing them with one
`useCursorGlow()` call. Every glow element drops its inline `left`/`top`/
`transition: 'none'` style and gains `className="cursor-glow ..."`, keeping its
existing size, gradient, and blur classes and losing its now-redundant `absolute`.

| File | Elements | Notes |
| --- | --- | --- |
| `Hero.tsx` | 1 glow (`:73-78`) | handler stays on the `<section>` (`:69`) |
| `ProjectCard.tsx` | 2 glows (`:47-62`) | handler stays on the `<article>` (`:45`) |
| `Connect.tsx` smooth | 2 glows (`:176-190`) | handler on the `<a>` (`:159`) |
| `Connect.tsx` fullHover | 2 glows (`:247-259`) | handler on the `<a>` (`:241`) |

`Connect`'s `fullHover` keeps its `name` field — it decides which link renders
glows — driven by the existing `onMouseEnter`/`onMouseLeave`. Only `x` and `y`
leave the state. `FullHoverState`, `INITIAL_FULL_HOVER_STATE`, `PointerPosition`,
`INITIAL_POINTER_POSITION`, and `SMOOTHING_FACTOR` are updated or removed to match;
unused ones must go, since `noUnusedLocals` is on.

### `src/lib/carouselPositionStyles.ts`

For slots `1` and `-1` in **both** exported maps: `opacity: 0.7` -> `0.8`, and the
`filter` property removed. For slots `2` and `-2` (`opacity: 0`, invisible) the
`filter` is likewise removed so the two maps keep the same property shape.

This removes a per-frame filter re-raster and simultaneously fixes the contrast
finding Slice B3 was going to address:

| Neighbour styling | In-card body-text contrast | 4.5:1 |
| --- | --- | --- |
| Today: `opacity .7` + `brightness(.7)` | 2.46:1 | FAIL |
| B3's plan: `opacity .85` + `brightness(.9)` | 4.52:1 | PASS |
| **This slice: `opacity .8`, no filter** | **4.86:1** | **PASS** |

Ratios recomputed on 2026-08-14 by WCAG relative luminance, `gray-400 #9ca3af`
body text over a `gray-800/50` card composited on `gray-950 #030712`.

B1's invariant must survive: `REDUCED_POSITION_STYLES` still differs from
`POSITION_STYLES` only in `transform`.

**Consequence for B3:** Group 1.3 of the B3 spec becomes a no-op and must be struck
when that branch is rebased. Its other groups are unaffected.

## Testing

Vitest, `environment: 'node'` globally, per-file jsdom via a
`// @vitest-environment jsdom` docblock. jsdom files need explicit
`afterEach(cleanup)` — `test.globals` is not enabled (established in B2).

**Node unit tests** (`src/hooks/useCursorGlow.test.ts`):

- `nextGlowPosition` moves the current position 15% toward the target by default
- `nextGlowPosition` honours an explicit smoothing factor
- `nextGlowPosition` is a no-op when current equals target
- `hasConverged` is false for a large delta, true within epsilon, and requires
  **both** axes to be within epsilon

**Node unit test** (`src/lib/carouselPositionStyles.test.ts`):

- slots `+/-1` carry `opacity: 0.8` and no `filter` in both maps
- the two maps are identical on every property except `transform`

**jsdom tests** (`src/hooks/useCursorGlow.test.tsx`):

- a `mousemove` on the host element eventually writes `--glow-x` / `--glow-y` to
  that element
- under `prefers-reduced-motion: reduce`, a `mousemove` writes the variables and
  `requestAnimationFrame` is never called

The reduced-motion test drives the `matchMedia` stub in `src/test/setup.ts`, which
returns `matches: false`; the test overrides it for the reduce case.

**What no test proves.** jsdom has no compositor, no layout, and no frame budget.
No test in this slice demonstrates the lag is gone. The evidence for the fix is
structural: React re-renders during cursor motion go from roughly 300/sec to zero,
and `transform` replaces `left`/`top` so layout stops being invalidated per frame.
Confirming the felt result requires the profile below.

## Manual verification checklist

Run against the Vercel preview. Not automatable here — the Chrome extension is not
connected.

1. Scroll to the carousel and move the cursor across a card: the glow still
   follows, with easing, and the section scrolls smoothly.
2. React DevTools Profiler, recording while hovering a carousel card: `ProjectCard`
   shows **no** renders from cursor motion. This is the core claim.
3. DevTools Performance, recording a scroll past the carousel: no per-frame
   "Layout" entries attributable to the glow elements.
4. Move the cursor away from the carousel and leave it still: no ongoing scripting
   activity after roughly half a second.
5. Hero and both Connect glow groups still track the cursor and are still centred
   on it.
6. Connect's contact-panel glows (`fullHover`) now ease rather than snap — expected.
7. With OS reduced-motion enabled, glows jump straight to the cursor and the
   Performance panel shows no animation frames from them.
8. Carousel side cards are visibly lighter than before and still read as receding.

## Out of scope

- `backdrop-blur-sm` on the card (`ProjectCard.tsx:44`) and the permanent
  `willChange: 'transform, opacity'` on slot wrappers (`Projects.tsx:284`). Both
  are plausible secondary costs, but removing either changes appearance or risks
  making the 700ms slide janky, and there is no measurement to justify the trade.
  These are the next things to examine if the carousel still stutters.
- Image payload and lazy loading, GitHub fetch caching (remainder of Slice C).
- All Slice B3 accessibility work except the `carouselPositionStyles.ts` overlap.

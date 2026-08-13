# Motion & Reduced-Motion Support — Design

**Date:** 2026-08-13
**Branch:** `fix/reduced-motion`
**Status:** Approved, ready for implementation planning
**Slice:** B1 of the audit remediation (first of three accessibility sub-slices)

## Context

A seven-agent audit of this repository produced a 15-item queue across five slices.
Slice A (correctness baseline) shipped in PR #5: 34 tests, CI, lint green.

Slice B (accessibility) turned out to hold roughly 20 findings across four unrelated
mechanisms, so it was decomposed further:

| Sub-slice | Contents |
|---|---|
| **B1 · Motion** *(this spec)* | The reveal pattern, `prefers-reduced-motion`, the typewriter, the carousel's 3D sweep |
| B2 · Keyboard | Three focusable-but-invisible containers, focus rings, Escape-to-close, `onClick` on non-interactive elements |
| B3 · Perceivable | Contrast, touch targets, ARIA state, live regions, section labels |

B1 goes first because it removes an ordering hazard the audit flagged: the site's
content rests at `opacity: 0` and is revealed only by an animation's `forwards` fill, so
the standard reduced-motion remedy
(`@media (prefers-reduced-motion: reduce) { * { animation: none !important } }`)
**blanks all 12 project cards, all 4 contact links, every skill chip, and every About
row.** After this slice that remedy is safe, because every revealed state is expressed as
a real declared style value rather than an animation artifact.

### Line numbers

All citations in this spec were re-derived on 2026-08-13 against `main` at `82b1986`.
The original audit's citations into `Hero.tsx`, `Connect.tsx`, and `Projects.tsx` are
stale — Slice A removed roughly 30 lines from `Hero.tsx` and 37 from `Connect.tsx`.

### Out of scope

- Everything in B2 and B3.
- The three `requestAnimationFrame` cursor-glow loops in `Hero.tsx`, `ProjectCard.tsx`,
  and `Connect.tsx`. They are continuous motion, but pointer-driven rather than
  auto-playing, so WCAG 2.2.2 does not reach them. They belong to Slice C, which reworks
  those loops for performance; gating them twice would conflict.

## 1. The reveal pattern is three groups, not one

The audit treated nine sites as one finding. Reading `@keyframes fadeIn` shows they are
not equivalent:

```css
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes slideIn {
  from { width: 0; }
}
```

`fadeIn` already **ends** at `opacity: 1`. `forwards` is therefore only load-bearing
because the element's own base opacity is `0`.

### Group 1 — scroll-triggered, genuinely inverted (6 sites)

`src/components/About.tsx:182, 213, 239, 290` and `src/components/Skills.tsx:35, 46`:

```ts
animation: isVisible ? `fadeIn 0.5s ease-out ${index * 100}ms forwards` : 'none',
opacity: isVisible ? 0 : 1,
```

Before reveal the element is `opacity: 1` — **visible**. On reveal it flips to `0` and
the animation fades it back in. Net effect: visible → blank → fade in, the opposite of
the intent. These convert to transitions via `useRevealStyle` (§2).

### Group 2 — mount-staggered (2 sites)

`src/components/Projects.tsx:302` and `src/components/Connect.tsx:164-165`:

```ts
animation: `fadeIn 0.6s ease-out ${i * 100}ms forwards`,
opacity: 0,
```

These are not driven by `isVisible`; they animate on mount.

**Fix: delete the `opacity: 0` declaration AND change `forwards` to `both`.** Both edits
are required — deleting the opacity alone introduces a flash.

Why `forwards` is not sufficient. These animations carry a staggered
`${i * 100}ms` delay. `animation-fill-mode: forwards` only fills *after* the animation
ends; during the delay the element renders with its **base** style. Today the base is
`opacity: 0`, so the element is correctly invisible while waiting. Delete that and the
base becomes `opacity: 1`, so each card would render fully visible, then snap to `0` the
moment its animation starts, then fade back in — a flash on every card, worse than the
bug being fixed.

`both` = `backwards` + `forwards`. The `backwards` half applies the keyframe's `from`
state during the delay, so the element stays invisible while waiting exactly as it does
now. The `forwards` half fills to `opacity: 1` after, which equals the base and is
therefore inert. Under `animation: none` neither fill applies and the element sits at its
base `opacity: 1` — visible, which is the whole point.

Net: identical rendering to today, but the visible end state is now a real declared value
rather than an animation artifact.

### Group 3 — the width bar (1 site, no change)

`src/components/About.tsx:251`:

```ts
width: `${lang.percentage}%`,
animation: isVisible ? `slideIn 1s ease-out ${index * 200}ms forwards` : 'none',
```

`slideIn` has a `from` but no `to`, so it animates from `width: 0` to the element's
declared width. Under `animation: none` the bar sits at its correct final width
immediately. **This site is already safe from the blanking hazard and is not modified.**
It is affected only by the reduced-motion media query, which stops the 1s animation.

*Observed but deliberately not fixed:* this site has the same delay-flash described in
Group 2 — during its `index * 200ms` delay the bar renders at full width, then snaps to
`0` and grows. Changing `forwards` to `both` here would fix it for one token. It is
excluded because it is a pre-existing cosmetic issue unrelated to motion sensitivity, and
this slice's premise is that only reduced-motion behaviour changes. Worth picking up in
Slice B3 or E.

## 2. Two hooks with a pure core

Follows the pattern Slice A established: a pure function tested under `environment: 'node'`,
with a thin React wrapper around it.

### `src/lib/revealStyle.ts` — pure

```ts
import type { CSSProperties } from 'react';

export const REVEAL_DURATION_MS = 500;
export const REVEAL_OFFSET_PX = 20;

export function revealStyle(
  isVisible: boolean,
  delayMs: number,
  reduced: boolean,
): CSSProperties;
```

Returns exactly two properties:

| Property | Value |
|---|---|
| `opacity` | `isVisible ? 1 : 0` |
| `animation` | `isVisible && !reduced ? \`fadeIn 500ms ease-out ${delayMs}ms both\` : 'none'` |

**It must NOT set any `transition*` property.** This is the critical constraint, and it
is why the design keeps `animation` rather than converting to transitions as originally
sketched.

Five of the six Group 1 elements already declare a CSS transition in their `className`:

| Site | Existing class |
|---|---|
| `About.tsx:182` | `transition-transform duration-200` |
| `About.tsx:213` | `transition-all duration-300` |
| `About.tsx:290` | `transition-transform duration-300` |
| `Skills.tsx:35` | `transition-all duration-300` |
| `Skills.tsx:46` | `transition-all duration-300` |

Inline styles beat Tailwind classes, and `transitionProperty` / `transitionDuration` /
`transitionDelay` are the same longhands those utilities compile to. Setting them inline
would retime every hover on those five elements from 200-300ms to 500ms **and** apply the
reveal's stagger delay to hover — so hovering the fourth fun-fact would lag 300ms before
it moved. There is no way to set an inline transition that does not clobber the class;
the only safe answer is to not set one.

### How the hazard is removed without transitions

The blanking bug is caused by the **base opacity being wrong**, not by the use of
`animation`. Flipping the base is sufficient:

| State | `opacity` (base) | `animation` | Result |
|---|---|---|---|
| Hidden | `0` | `none` | Correctly invisible |
| Revealed, normal motion | `1` | `fadeIn … both` | `backwards` holds `from` during the stagger delay, fades in, fills at 1 |
| Revealed, reduced motion | `1` | `none` | **Appears instantly and visibly** |
| Revealed, `* { animation: none !important }` | `1` | overridden | **Still visible** — the hazard is gone |

`both` is required for the same reason as Group 2: without `backwards`, the element would
render at base `opacity: 1` during its stagger delay, then snap to `0` when the animation
starts. Group 1 and Group 2 therefore receive the same shape of fix, which is why the
constant lives in one place.

**Pre-existing issue, observed and deliberately not fixed:** `fadeIn` animates `transform`
as well as `opacity`, and a `forwards`/`both` fill on `transform` overrides the element's
own hover transform. So `hover:translate-x-1` at `About.tsx:179` and
`hover:translate-x-2` at `About.tsx:287` are already dead today, and remain dead after
this change. Fixing it means either dropping `translateY` from the reveal (losing the
slide-in) or restructuring those elements — both out of scope here. Recorded for Slice E.

### `src/hooks/usePrefersReducedMotion.ts`

```ts
export function usePrefersReducedMotion(): boolean;
```

Reads `window.matchMedia('(prefers-reduced-motion: reduce)')` and **subscribes to
`change`**, so toggling the OS setting updates the page live rather than requiring a
reload. Initial state is read lazily in the `useState` initializer so the first paint is
already correct. Cleanup removes the listener.

### `src/hooks/useRevealStyle.ts`

```ts
export function useRevealStyle(isVisible: boolean, delayMs = 0): CSSProperties;
```

Calls `usePrefersReducedMotion()` and delegates to `revealStyle`.

### Why a hook and not a `<Reveal>` component

A wrapper component was considered and rejected: the reveal styles sit directly on
elements whose type and parent matter.

- `About.tsx:290` is an `<li>` inside `<ul className="space-y-2">`. A wrapper `<div>`
  between them is invalid HTML and destroys the list semantics that Slice B3 exists to
  preserve.
- `About.tsx:213` and `Skills.tsx:46` are `<span>` chips inside
  `flex flex-wrap` containers. A wrapper becomes the flex item and the chips stop
  flowing.

A wrapper would also change observer behaviour. There are exactly **two**
`IntersectionObserver`s today — `About.tsx:67` and `Skills.tsx:11`, one per section — and
section-level `isVisible` drives every child, staggered by delay. A component calling
`useReveal` internally would create six or more observers and change the behaviour from
"the section reveals together" to "each element reveals as it individually enters view".
That is a redesign, not an accessibility fix.

The hook applies to the existing element: no new DOM nodes, no layout change, no
observer change, and the reduced-motion policy still lives in exactly one place.

## 3. The typewriter

`src/hooks/useTypewriter.ts` schedules `setTimeout`s, so CSS cannot stop it. The hook
calls `usePrefersReducedMotion()` internally and, when reduced:

- returns `words[0] ?? ''` instead of `state.text`
- **schedules no timers at all** — the effect returns early, so it is genuinely idle
  rather than animating invisibly

The public signature `useTypewriter(words, speeds?)` does not change. The hook has one
call site (`Hero.tsx:16`), so an `enabled` option would be configurability nobody needs.

Its blinking cursor is the CSS class `.animate-blink` and is handled by the media query
in §4.

**Rationale:** the typewriter is auto-playing motion that runs indefinitely with no
pause, stop, or hide mechanism — **WCAG 2.2.2 Pause, Stop, Hide (Level A)**. It is the
only Level A motion violation on the page.

## 4. CSS and the carousel

### `src/index.css`

Append one block:

```css
@media (prefers-reduced-motion: reduce) {
  html {
    scroll-behavior: auto;
  }

  .animate-blink,
  .animate-pulse {
    animation: none;
  }
}
```

Deliberately **not** a blanket `* { animation: none }`. The agreed policy is to stop
auto-playing and decorative motion while keeping short functional transitions (hover
feedback, menu expand, focus rings) working. WCAG 2.2.2 targets auto-playing content
over five seconds and 2.3.3 targets large motion; neither is about a 200ms hover fade,
and removing those costs usability cues for no accessibility gain.

`scroll-behavior: auto` matters because `src/index.css:6-8` sets `smooth` globally, which
applies to every programmatic scroll including the nav's `scrollIntoView` calls. Full-page
smooth scrolling is a common vestibular trigger.

### The carousel

`POSITION_STYLES` in `src/components/Projects.tsx:25-31` is an inline JS map, so the
media query cannot reach it. Add a second map:

```ts
const REDUCED_POSITION_STYLES: Record<number, React.CSSProperties>
```

Same `translateX` offsets and `opacity`/`zIndex` values, but **no `rotateY` and no
`scale`**. `Projects` selects between the two with `usePrefersReducedMotion()`.

Cards still move horizontally, so position and ordering stay legible; the 45° 3D sweep
that triggers vestibular symptoms does not happen. Both maps are pure data and both are
testable.

**Known judgment call:** a stricter reading of WCAG 2.3.3 (Level AAA) would freeze
position entirely and cross-fade instead. Retaining `translateX` is a deliberate
trade-off — the carousel's spatial metaphor is how a user knows which card is next, and
removing it makes the control harder to understand for everyone. Revisit if a user
reports discomfort.

## 5. Testing

**Runner:** existing Vitest setup, `environment: 'node'`. No jsdom, no Testing Library.

### `src/lib/revealStyle.test.ts`

- Revealed, normal motion: `opacity: 1`, and `animation` contains `fadeIn`, the
  `delayMs` value, and the `both` fill mode
- Hidden: `opacity: 0`, `animation: 'none'`
- Revealed, reduced motion: `opacity: 1` **and `animation: 'none'`** — the element is
  visible without any animation. This is the case that would reintroduce the blanking bug
  if it regressed, so it is asserted explicitly.
- Hidden, reduced motion: `opacity: 0`, `animation: 'none'`
- **The returned object contains no key beginning with `transition`.** Asserted directly
  (`Object.keys(style).every(k => !k.startsWith('transition'))`), because an inline
  transition would silently clobber the hover timing on five of the six call sites.
- The `delayMs` argument appears in the animation string only when not reduced

### `src/components/Projects.test.ts` (or colocated with the map)

- `REDUCED_POSITION_STYLES` has exactly the same keys as `POSITION_STYLES`
- No value's `transform` contains `rotateY` or `scale`
- Every value retains a `translateX`
- `opacity` and `zIndex` match the corresponding full-motion entry

### Not tested, stated plainly

`usePrefersReducedMotion` cannot be tested without jsdom (it needs `window.matchMedia`),
and neither can `useRevealStyle` or the typewriter's reduced branch. Adding jsdom for
three small hooks is not justified here; it belongs with the first component test that
genuinely needs a DOM. **This slice's automated coverage is the two pure units above.**
Everything else is verified by the manual check in §6.

## 6. Done criteria

1. `npm run lint` exits 0
2. `npm test` passes, including the new `revealStyle` and `REDUCED_POSITION_STYLES` tests
3. `npx tsc -b --noEmit` clean
4. `npm run build` succeeds
5. `grep -rn "forwards" src/` returns exactly one hit — `About.tsx:251`, the `slideIn`
   bar, which this slice does not modify. All eight `fadeIn` sites now use `both`:
   six via `revealStyle` (so the literal appears once, in `src/lib/revealStyle.ts`) and
   two inline in `Projects.tsx` and `Connect.tsx`.
   *(There are 9 `forwards` sites today: 5 in About, 2 in Skills, 1 each in Projects and
   Connect.)*
5b. **No inline transition was introduced.** `grep -rn "transitionProperty\|transitionDuration\|transitionDelay" src/`
   returns nothing. The five Group 1 elements that carry `transition-transform` or
   `transition-all` classes must keep their original 200-300ms hover timing.
6. **The hazard check.** With DevTools applying
   `* { animation: none !important; transition: none !important }`, every project card,
   contact link, skill chip, and About row is **visible**. Before this slice the same
   check blanks them.
7. **The manual reduced-motion pass.** With the OS "Reduce motion" setting enabled:
   the typewriter shows a static "Computer Engineering Student"; the cursor does not
   blink; the scroll indicator does not pulse; nav clicks jump instantly rather than
   smooth-scrolling; carousel navigation slides without rotating; reveals land
   immediately; and hover feedback, the mobile menu, and focus rings still animate.
8. With the OS setting **disabled**, the site looks and behaves as it does today — except
   that the six Group 1 sites no longer flash visible-then-blank before fading in.

## 7. Risks

| Risk | Mitigation |
|---|---|
| Transition conversion changes reveal timing perceptibly | Duration matches the current `0.5s` animation; the stagger delays are carried over unchanged. Criterion 8 covers it. |
| Deleting `opacity: 0` makes Group 2 flash visible during its staggered delay | This is a real hazard, caught in spec review — `forwards` does not fill during the delay. Mitigated by changing `forwards` to `both`, whose `backwards` half holds the `from` state while waiting. Criterion 8 covers it: with reduced motion off, no card may flash before fading in. |
| An inline transition clobbers hover timing on 5 of 6 Group 1 sites | Caught in spec review. The design sets no `transition*` property at all; `revealStyle` returns only `opacity` and `animation`. Asserted by a test and by done-criterion 5b. |
| `usePrefersReducedMotion` has no automated test | Acknowledged in §5 rather than papered over. Criterion 7 is the check. |
| Reduced-motion carousel map drifts out of sync with the full map | Tested: same keys, matching `opacity`/`zIndex`. |
| The typewriter's reduced branch strands the component mid-word | The effect returns before scheduling and the return value switches to `words[0]`, so there is no partial state to strand. |

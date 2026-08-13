# Reduced Motion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Honour `prefers-reduced-motion` across the site, and remove the hazard where disabling animations blanks every project card, contact link, skill chip and About row.

**Architecture:** The blanking bug comes from elements whose base `opacity` is `0`, with the visible state existing only as an animation's `forwards` fill. The fix flips the base opacity so the visible state is a real declared value, and changes the fill to `both` so the staggered delay still hides elements while they wait. Reduced-motion detection is a reactive `matchMedia` hook; the parts CSS cannot reach (the JS typewriter, the inline carousel transform map) branch in JavaScript.

**Tech Stack:** React 19.2, TypeScript 5.9 (`strict: true`), Vite 7, Vitest (`environment: 'node'`), Tailwind CSS 3.4, ESLint 9 flat config.

**Spec:** `docs/superpowers/specs/2026-08-13-reduced-motion-design.md`

## Global Constraints

- **Branch:** all work happens on `fix/reduced-motion`. Do not commit to `main`.
- **NEVER set an inline `transition*` property on any reveal site.** Five of the six carry `transition-transform duration-200` or `transition-all duration-300` in their `className`, and inline longhands beat Tailwind classes — an inline transition would retime their hover from 200–300ms to 500ms and apply the reveal's stagger delay to hover. `revealStyle` returns only `opacity` and `animation`.
- **Test imports:** always `import { describe, it, expect } from 'vitest'`. Vitest globals are NOT enabled; `eslint.config.js:20` sets `globals: globals.browser`, so bare `describe` would fail `no-undef`.
- **Test location:** colocated as `src/**/*.test.ts`. `environment: 'node'` — no jsdom, no Testing Library.
- **No `any`, no `@ts-ignore`, no `eslint-disable`.** The repo currently has zero of all three.
- **Preserve every existing delay and duration exactly.** They differ per site (see Task 3). This slice changes reduced-motion behaviour only; normal-motion rendering must be indistinguishable except that the six Group 1 sites no longer flash visible-then-blank.
- **Commit trailer:** every commit message ends with exactly these two lines:

  ```
  Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_018meF4mJ98mDwdbDbVqMe5U
  ```

## Deviation from the spec, and why

The spec sketched `revealStyle(isVisible, delayMs, reduced)` with a single
`REVEAL_DURATION_MS = 500`. Reading the six call sites shows they do not share one
duration: `Skills.tsx:46` uses `0.45s`, every other Group 1 site uses `0.5s`. Hardcoding
500ms would silently retime the skill chips.

`revealStyle` therefore takes an optional fourth parameter:

```ts
revealStyle(isVisible: boolean, delayMs: number, reduced: boolean, durationMs = REVEAL_DURATION_MS)
```

The first three parameters are exactly as specified; the fourth defaults to 500 so only
the one site that needs 450 passes it.

### `useRevealStyle` is NOT built — Rules of Hooks

The spec's §2 proposed a `useRevealStyle(isVisible, delayMs)` hook. It cannot exist as
designed: all six call sites are inside `.map()` callbacks, and a hook called in a loop
violates the Rules of Hooks. `react-hooks/rules-of-hooks` is enabled via
`reactHooks.configs.flat.recommended` in `eslint.config.js:15` and would reject it
immediately, so the error surfaces at lint rather than as a subtle runtime bug.

The correct shape is the one the spec already established for its pure core: each
component calls `usePrefersReducedMotion()` **once** at the top, then passes the boolean
into the pure `revealStyle()` inside the map. This is also simpler — one hook, one pure
function, no glue layer.

## File Structure

**Created:**

| Path | Responsibility |
|---|---|
| `src/lib/revealStyle.ts` | Pure reveal-style calculation. No React runtime import. |
| `src/lib/revealStyle.test.ts` | Tests for the above |
| `src/lib/carouselPositionStyles.ts` | Both carousel slot maps, full-motion and reduced. Pure data. |
| `src/lib/carouselPositionStyles.test.ts` | Tests for the above |
| `src/hooks/usePrefersReducedMotion.ts` | Reactive `matchMedia` subscription |

**Modified:**

| Path | Change |
|---|---|
| `src/components/About.tsx` | 4 Group 1 sites → `revealStyle` |
| `src/components/Skills.tsx` | 2 Group 1 sites → `revealStyle` |
| `src/components/Projects.tsx` | 1 Group 2 site; carousel map selection |
| `src/components/Connect.tsx` | 1 Group 2 site |
| `src/hooks/useTypewriter.ts` | Reduced-motion branch |
| `src/index.css` | `prefers-reduced-motion` media query |

**Not modified:** `src/components/About.tsx:251` (the `slideIn` language bar). It animates
`width` from `0` to the element's declared width, so `animation: none` already leaves it
correct. Its pre-existing delay-flash is out of scope.

---

### Task 1: `revealStyle` pure function

**Files:**
- Create: `src/lib/revealStyle.ts`
- Create: `src/lib/revealStyle.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces:
  - `const REVEAL_DURATION_MS = 500`
  - `function revealStyle(isVisible: boolean, delayMs: number, reduced: boolean, durationMs?: number): CSSProperties`

- [ ] **Step 1: Write the failing test**

Create `src/lib/revealStyle.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { revealStyle, REVEAL_DURATION_MS } from './revealStyle';

describe('revealStyle', () => {
  it('is visible with a fadeIn animation when revealed and motion is allowed', () => {
    const style = revealStyle(true, 300, false);
    expect(style.opacity).toBe(1);
    expect(style.animation).toContain('fadeIn');
    expect(style.animation).toContain('300ms');
    expect(style.animation).toContain('both');
  });

  it('is hidden with no animation when not yet revealed', () => {
    const style = revealStyle(false, 300, false);
    expect(style.opacity).toBe(0);
    expect(style.animation).toBe('none');
  });

  it('is VISIBLE with no animation when revealed under reduced motion', () => {
    // This is the case that would reintroduce the blanking bug if it regressed.
    const style = revealStyle(true, 300, true);
    expect(style.opacity).toBe(1);
    expect(style.animation).toBe('none');
  });

  it('is hidden with no animation when not revealed under reduced motion', () => {
    const style = revealStyle(false, 300, true);
    expect(style.opacity).toBe(0);
    expect(style.animation).toBe('none');
  });

  it('NEVER returns a transition property', () => {
    // Five of the six call sites carry transition-transform / transition-all in
    // their className. An inline transition longhand would clobber the class and
    // retime their hover, so this is asserted rather than assumed.
    for (const isVisible of [true, false]) {
      for (const reduced of [true, false]) {
        const keys = Object.keys(revealStyle(isVisible, 100, reduced));
        expect(keys.filter((k) => k.startsWith('transition'))).toEqual([]);
      }
    }
  });

  it('uses the default duration when none is supplied', () => {
    expect(revealStyle(true, 0, false).animation).toContain(`${REVEAL_DURATION_MS}ms`);
  });

  it('honours a custom duration', () => {
    const style = revealStyle(true, 0, false, 450);
    expect(style.animation).toContain('450ms');
    expect(style.animation).not.toContain('500ms');
  });

  it('carries the delay only when motion is allowed', () => {
    expect(revealStyle(true, 750, false).animation).toContain('750ms');
    expect(revealStyle(true, 750, true).animation).toBe('none');
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module './revealStyle'`. (Vitest v4 phrases module-resolution failures this way.)

- [ ] **Step 3: Write the implementation**

Create `src/lib/revealStyle.ts`:

```ts
import type { CSSProperties } from 'react';

/** Default reveal animation duration, in milliseconds. */
export const REVEAL_DURATION_MS = 500;

/**
 * Style for a scroll-revealed element.
 *
 * Returns ONLY `opacity` and `animation`. It must never return a `transition*`
 * property: five of the six call sites declare `transition-transform` or
 * `transition-all` in their className, and an inline transition longhand beats the
 * Tailwind class — it would retime their hover and apply the reveal's stagger delay
 * to hover as well.
 *
 * `opacity` carries the visible state as a real declared value rather than relying on
 * an animation's `forwards` fill, so disabling animations leaves revealed content
 * visible instead of blank.
 *
 * The `both` fill mode matters because of the stagger delay: its `backwards` half
 * applies the keyframe's `from` state while the element waits, so it stays invisible
 * until its turn instead of flashing at the base opacity.
 */
export function revealStyle(
  isVisible: boolean,
  delayMs: number,
  reduced: boolean,
  durationMs: number = REVEAL_DURATION_MS,
): CSSProperties {
  return {
    opacity: isVisible ? 1 : 0,
    animation:
      isVisible && !reduced
        ? `fadeIn ${durationMs}ms ease-out ${delayMs}ms both`
        : 'none',
  };
}
```

- [ ] **Step 4: Run the tests**

Run: `npm test`
Expected: PASS — 8 new tests, 42 total across 5 files.

- [ ] **Step 5: Commit**

```bash
git add src/lib/revealStyle.ts src/lib/revealStyle.test.ts
git commit -m "$(cat <<'EOF'
feat: add pure revealStyle calculation

Returns only opacity and animation. The visible state is a declared
opacity value rather than an animation forwards fill, so disabling
animations leaves revealed content visible instead of blank.

Asserted to never return a transition property: five of the six call
sites declare transition-transform or transition-all in their className,
and an inline longhand would beat the class and retime their hover.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018meF4mJ98mDwdbDbVqMe5U
EOF
)"
```

---

### Task 2: The reduced-motion hook

**Files:**
- Create: `src/hooks/usePrefersReducedMotion.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `function usePrefersReducedMotion(): boolean`

- [ ] **Step 1: Create the media-query hook**

Create `src/hooks/usePrefersReducedMotion.ts`:

```ts
import { useEffect, useState } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

/**
 * Whether the user has asked the OS to reduce motion.
 *
 * Subscribes to the media query rather than reading it once, so toggling the system
 * setting updates the page live instead of waiting for a reload. The initial value is
 * read in the useState initialiser so the very first paint is already correct.
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(
    () => typeof window !== 'undefined' && window.matchMedia(QUERY).matches,
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia(QUERY);
    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches);

    mediaQuery.addEventListener('change', onChange);
    return () => mediaQuery.removeEventListener('change', onChange);
  }, []);

  return reduced;
}
```

- [ ] **Step 2: Verify nothing regressed**

Run: `npm run lint && npm test && npx tsc -b --noEmit && npm run build`
Expected: lint exit 0, 42 tests pass, no type errors, build succeeds.

Note `noUnusedLocals` is on in `tsconfig.app.json`, so an unused import here fails the
build rather than passing silently.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/usePrefersReducedMotion.ts
git commit -m "$(cat <<'EOF'
feat: add usePrefersReducedMotion

Subscribes to the media query rather than reading it once, so toggling the
OS setting updates the page live.

No automated test: it needs window.matchMedia, which the node test
environment does not provide. Adding jsdom for one small hook is not
justified; its behaviour is covered by the manual reduced-motion pass in
the plan's final task.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018meF4mJ98mDwdbDbVqMe5U
EOF
)"
```

---

### Task 3: Convert the six Group 1 sites

These are the genuinely inverted ones: `opacity: isVisible ? 0 : 1` means the element is
**visible before reveal**, blanks when revealed, then fades back in.

**Files:**
- Modify: `src/components/About.tsx` (4 sites)
- Modify: `src/components/Skills.tsx` (2 sites)

**Interfaces:**
- Consumes: `revealStyle(isVisible, delayMs, reduced, durationMs?)` from Task 1 and
  `usePrefersReducedMotion()` from Task 2.
- Produces: nothing consumed by later tasks.

**CRITICAL — hook placement.** All six sites are inside `.map()` callbacks. Call
`usePrefersReducedMotion()` **once at the top of each component** and pass the resulting
boolean into the pure `revealStyle()` inside the map. Calling a hook inside the map would
violate the Rules of Hooks and fail `react-hooks/rules-of-hooks`.

**Every delay formula and duration below is copied from the current code and must be
preserved exactly.** They are not uniform.

- [ ] **Step 1: Add imports and the hook call to About.tsx**

At the top of `src/components/About.tsx`, directly after
`import { useReveal } from '../hooks/useReveal';`:

```ts
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import { revealStyle } from '../lib/revealStyle';
```

Then inside the `About` component, directly after the existing
`const { ref: sectionRef, isVisible } = useReveal<HTMLElement>();` line, add:

```ts
  const reducedMotion = usePrefersReducedMotion();
```

- [ ] **Step 2: Convert About.tsx site 1 — PERSONAL_INFO**

Replace:

```tsx
                  <div 
                    key={info.label}
                    className="hover:translate-x-1 transition-transform duration-200"
                    style={{
                      animation: isVisible ? `fadeIn 0.5s ease-out ${index * 100}ms forwards` : 'none',
                      opacity: isVisible ? 0 : 1,
                    }}
                  >
```

with:

```tsx
                  <div 
                    key={info.label}
                    className="hover:translate-x-1 transition-transform duration-200"
                    style={revealStyle(isVisible, index * 100, reducedMotion)}
                  >
```

- [ ] **Step 3: Convert About.tsx site 2 — RELEVANT_COURSES**

Replace:

```tsx
                    style={{
                      animation: isVisible ? `fadeIn 0.5s ease-out ${index * 50}ms forwards` : 'none',
                      opacity: isVisible ? 0 : 1,
                    }}
```

with:

```tsx
                    style={revealStyle(isVisible, index * 50, reducedMotion)}
```

- [ ] **Step 4: Convert About.tsx site 3 — LANGUAGES**

Replace:

```tsx
                    style={{
                      animation: isVisible ? `fadeIn 0.5s ease-out ${index * 150}ms forwards` : 'none',
                      opacity: isVisible ? 0 : 1,
                    }}
```

with:

```tsx
                    style={revealStyle(isVisible, index * 150, reducedMotion)}
```

Leave the nested `slideIn` bar inside this block completely alone.

- [ ] **Step 5: Convert About.tsx site 4 — FUN_FACTS**

Replace:

```tsx
                    style={{
                      animation: isVisible ? `fadeIn 0.5s ease-out ${index * 100}ms forwards` : 'none',
                      opacity: isVisible ? 0 : 1,
                    }}
```

with:

```tsx
                    style={revealStyle(isVisible, index * 100, reducedMotion)}
```

This one is on an `<li>` inside a `<ul>`. Do not wrap it.

- [ ] **Step 6: Add imports and the hook call to Skills.tsx**

At the top of `src/components/Skills.tsx`, directly after
`import { useReveal } from '../hooks/useReveal';`:

```ts
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import { revealStyle } from '../lib/revealStyle';
```

Then inside the `Skills` component, directly after
`const { ref: sectionRef, isVisible } = useReveal<HTMLElement>();`, add:

```ts
  const reducedMotion = usePrefersReducedMotion();
```

- [ ] **Step 7: Convert Skills.tsx site 1 — category card**

Replace:

```tsx
              style={{
                animation: isVisible ? `fadeIn 0.5s ease-out ${categoryIndex * 120}ms forwards` : 'none',
                opacity: isVisible ? 0 : 1,
              }}
```

with:

```tsx
              style={revealStyle(isVisible, categoryIndex * 120, reducedMotion)}
```

- [ ] **Step 8: Convert Skills.tsx site 2 — skill chip**

This is the one site with a non-default duration: `0.45s`, so it passes `450` as the
fourth argument.

Replace:

```tsx
                    style={{
                      animation: isVisible ? `fadeIn 0.45s ease-out ${(categoryIndex * 120) + (index * 45)}ms forwards` : 'none',
                      opacity: isVisible ? 0 : 1,
                    }}
```

with:

```tsx
                    style={revealStyle(isVisible, (categoryIndex * 120) + (index * 45), reducedMotion, 450)}
```

- [ ] **Step 9: Verify**

Run: `npm run lint && npm test && npx tsc -b --noEmit && npm run build`
Expected: all pass, 42 tests. Lint passing is meaningful here: it confirms no hook is
being called inside a `.map()` callback.

Run: `grep -n "opacity: isVisible ? 0 : 1" src/components/About.tsx src/components/Skills.tsx`
Expected: no output — all six inverted sites are gone.

Run: `grep -rn "transitionProperty\|transitionDuration\|transitionDelay" src/`
Expected: no output — no inline transition was introduced.

- [ ] **Step 10: Commit**

```bash
git add src/components/About.tsx src/components/Skills.tsx
git commit -m "$(cat <<'EOF'
fix: correct the inverted reveal on six scroll-triggered sites

These read `opacity: isVisible ? 0 : 1`, so the element was VISIBLE before
reveal, blanked the moment it was revealed, then faded back in - the
opposite of the intent. The visible state also existed only as an
animation forwards fill, so disabling animations blanked the content.

Now driven by the pure revealStyle(): opacity carries the visible state as
a real declared value and the fill mode is `both`, whose backwards half
keeps the element hidden during its stagger delay.

usePrefersReducedMotion is called once per component rather than inside
the maps - all six sites are inside .map() callbacks, where a hook call
would violate the Rules of Hooks.

Every delay formula and duration is preserved exactly, including the
0.45s on skill chips, the only site not using the 500ms default.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018meF4mJ98mDwdbDbVqMe5U
EOF
)"
```

---

### Task 4: Fix the two Group 2 sites

These are mount-staggered rather than scroll-triggered, so they do not use
`revealStyle`. **Both edits are required at each site** — deleting `opacity: 0` alone
would make every card flash fully visible during its stagger delay, then snap to
transparent when its animation starts.

**Files:**
- Modify: `src/components/Projects.tsx`
- Modify: `src/components/Connect.tsx`

**Interfaces:**
- Consumes: nothing. Produces: nothing.

- [ ] **Step 1: Fix the Projects grid cards**

In `src/components/Projects.tsx`, replace:

```tsx
                  <div key={project.id} style={{ animation: `fadeIn 0.6s ease-out ${i * 100}ms forwards`, opacity: 0 }}>
```

with:

```tsx
                  <div key={project.id} style={{ animation: `fadeIn 0.6s ease-out ${i * 100}ms both` }}>
```

The `0.6s` duration is unchanged.

- [ ] **Step 2: Fix the Connect contact cards**

In `src/components/Connect.tsx`, replace:

```tsx
                  animation: `fadeIn 0.5s ease-out ${index * 100}ms forwards`,
                  opacity: 0,
```

with:

```tsx
                  animation: `fadeIn 0.5s ease-out ${index * 100}ms both`,
```

Leave the `width`, `height` and `padding` entries in that same style object untouched —
they drive the hover expansion and are unrelated.

- [ ] **Step 3: Verify**

Run: `npm run lint && npm test && npx tsc -b --noEmit && npm run build`
Expected: all pass.

Run: `grep -rn "forwards" src/`
Expected: exactly TWO hits, and only these two —
1. `src/components/About.tsx` — the `slideIn` language bar. Real code, deliberately not
   modified by this slice.
2. `src/lib/revealStyle.ts` — the word inside that file's docstring, which explains why
   the `forwards` pattern was abandoned. Documentation, not code.

Neither `src/components/Projects.tsx` nor `src/components/Connect.tsx` may appear. That
absence is what this check actually exists to prove.

- [ ] **Step 4: Commit**

```bash
git add src/components/Projects.tsx src/components/Connect.tsx
git commit -m "$(cat <<'EOF'
fix: make mount-staggered reveals survive disabled animations

These carried `opacity: 0` with a forwards fill, so the visible state
existed only as an animation artifact and disabling animations left the
cards blank.

Deleting the opacity alone would have been worse: forwards does not fill
during the animation-delay, so each card would render at the new base
opacity of 1, then snap to 0 when its staggered animation began. Changing
the fill to `both` fixes that - its backwards half applies the keyframe's
from state while the card waits.

Rendering under normal motion is identical to before.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018meF4mJ98mDwdbDbVqMe5U
EOF
)"
```

---

### Task 5: Typewriter reduced-motion branch

**Files:**
- Modify: `src/hooks/useTypewriter.ts` (the `useTypewriter` hook only)

**Interfaces:**
- Consumes: `usePrefersReducedMotion()` from Task 2.
- Produces: no signature change. `useTypewriter(words, speeds?)` is unchanged.

The `nextTypewriterState` reducer above the hook must remain **byte-identical** — it has 9
tests and a hand-verified equivalence proof behind it.

- [ ] **Step 1: Add the import**

At the top of `src/hooks/useTypewriter.ts`, after the existing React import:

```ts
import { usePrefersReducedMotion } from './usePrefersReducedMotion';
```

- [ ] **Step 2: Add the reduced branch to the hook**

Replace the whole `useTypewriter` function body with:

```ts
export function useTypewriter(
  words: readonly string[],
  speeds: TypewriterSpeeds = DEFAULT_TYPEWRITER_SPEEDS,
): string {
  const [state, setState] = useState<TypewriterState>(INITIAL_TYPEWRITER_STATE);
  const { typingMs, deletingMs, pauseMs } = speeds;
  const reduced = usePrefersReducedMotion();

  const wordsRef = useRef(words);
  useEffect(() => {
    wordsRef.current = words;
  }, [words]);

  useEffect(() => {
    // Under reduced motion the animation is replaced by static text, so no timer is
    // scheduled at all - the hook is genuinely idle rather than animating invisibly.
    if (reduced || wordsRef.current.length === 0) {
      return;
    }

    const { state: next, delayMs } = nextTypewriterState(state, wordsRef.current, {
      typingMs,
      deletingMs,
      pauseMs,
    });

    const timeout = setTimeout(() => setState(next), delayMs);
    return () => clearTimeout(timeout);
  }, [state, reduced, typingMs, deletingMs, pauseMs]);

  return reduced ? (words[0] ?? '') : state.text;
}
```

Three changes: `reduced` is read from the hook, the effect returns early and lists
`reduced` in its dependency array, and the return value switches to the first word.

- [ ] **Step 3: Verify the reducer is untouched and nothing regressed**

Run: `git diff src/hooks/useTypewriter.ts | grep -E "^[-+]" | grep -v "^[-+][-+]" | grep -c "nextTypewriterState(\s*state:"`
Expected: `0` — no line inside the reducer changed.

Run: `npm run lint && npm test && npx tsc -b --noEmit && npm run build`
Expected: lint exit 0, **34 typewriter-suite tests still pass** (42 total), no type errors,
build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useTypewriter.ts
git commit -m "$(cat <<'EOF'
feat: render the hero typewriter statically under reduced motion

The typewriter is auto-playing motion that runs indefinitely with no
pause, stop or hide control - WCAG 2.2.2 Pause Stop Hide, Level A, and the
only Level A motion violation on the page.

CSS cannot stop it because it schedules setTimeouts, so the hook branches
in JS: it returns words[0] and schedules no timer at all, rather than
animating invisibly. The reducer is unchanged.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018meF4mJ98mDwdbDbVqMe5U
EOF
)"
```

---

### Task 6: The CSS media query

**Files:**
- Modify: `src/index.css`

**Interfaces:**
- Consumes: nothing. Produces: nothing.

- [ ] **Step 1: Append the media query**

Add at the very end of `src/index.css`, after the closing `}` of the final
`@layer utilities` block:

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

Deliberately **not** a blanket `* { animation: none }`. The agreed policy stops
auto-playing and decorative motion while keeping short functional transitions — hover
feedback, the mobile menu expand, focus rings — working. WCAG 2.2.2 targets auto-playing
content over five seconds and 2.3.3 targets large motion; neither is about a 200ms hover
fade, and removing those costs usability cues for no accessibility gain.

`scroll-behavior: auto` overrides `src/index.css:6-8`, which sets `smooth` globally and
therefore applies to every nav `scrollIntoView` call. Full-page smooth scrolling is a
common vestibular trigger.

- [ ] **Step 2: Verify the rule reaches the build**

Run: `npm run build && grep -c "prefers-reduced-motion" dist/assets/*.css`
Expected: `1` — the media query survives into the production bundle.

Note this counts matching **lines**, and the built CSS is minified onto one line, so `1`
here means "present", not "exactly one occurrence".

Run: `npm run lint && npm test && npx tsc -b --noEmit`
Expected: all pass.

- [ ] **Step 3: Commit**

```bash
git add src/index.css
git commit -m "$(cat <<'EOF'
feat: honour prefers-reduced-motion in CSS

Stops the infinite cursor blink and the pulsing scroll indicator, and
disables global smooth scrolling, which applies to every nav
scrollIntoView call and is a common vestibular trigger.

Deliberately not a blanket `* { animation: none }`: short functional
transitions - hover feedback, menu expand, focus rings - keep working.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018meF4mJ98mDwdbDbVqMe5U
EOF
)"
```

---

### Task 7: Reduced-motion carousel slot map

`POSITION_STYLES` is an inline JS map, so the media query cannot reach it. Extract both
maps to a leaf module — following the precedent set by `src/lib/filterProjects.ts`, so the
test imports a leaf rather than the whole component tree.

**Files:**
- Create: `src/lib/carouselPositionStyles.ts`
- Create: `src/lib/carouselPositionStyles.test.ts`
- Modify: `src/components/Projects.tsx`

**Interfaces:**
- Consumes: `usePrefersReducedMotion()` from Task 2.
- Produces:
  - `const POSITION_STYLES: Record<number, CSSProperties>`
  - `const REDUCED_POSITION_STYLES: Record<number, CSSProperties>`

- [ ] **Step 1: Write the failing test**

Create `src/lib/carouselPositionStyles.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { POSITION_STYLES, REDUCED_POSITION_STYLES } from './carouselPositionStyles';

describe('carousel position styles', () => {
  it('defines the same slots in both maps', () => {
    expect(Object.keys(REDUCED_POSITION_STYLES).sort()).toEqual(
      Object.keys(POSITION_STYLES).sort(),
    );
  });

  it('covers slots -2 through 2', () => {
    expect(Object.keys(POSITION_STYLES).map(Number).sort((a, b) => a - b)).toEqual([
      -2, -1, 0, 1, 2,
    ]);
  });

  it('drops rotateY and scale from every reduced slot', () => {
    for (const [slot, style] of Object.entries(REDUCED_POSITION_STYLES)) {
      const transform = String(style.transform);
      expect(transform, `slot ${slot} must not rotate`).not.toContain('rotateY');
      expect(transform, `slot ${slot} must not scale`).not.toContain('scale');
    }
  });

  it('keeps translateX in every reduced slot so position stays legible', () => {
    for (const [slot, style] of Object.entries(REDUCED_POSITION_STYLES)) {
      expect(String(style.transform), `slot ${slot}`).toContain('translateX');
    }
  });

  it('keeps opacity and zIndex identical between the two maps', () => {
    for (const key of Object.keys(POSITION_STYLES)) {
      const slot = Number(key);
      expect(REDUCED_POSITION_STYLES[slot].opacity).toBe(POSITION_STYLES[slot].opacity);
      expect(REDUCED_POSITION_STYLES[slot].zIndex).toBe(POSITION_STYLES[slot].zIndex);
    }
  });

  it('keeps the full-motion map rotating, so the two are genuinely different', () => {
    expect(String(POSITION_STYLES[1].transform)).toContain('rotateY');
    expect(String(POSITION_STYLES[-1].transform)).toContain('rotateY');
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module './carouselPositionStyles'`.

- [ ] **Step 3: Create the module**

Create `src/lib/carouselPositionStyles.ts`:

```ts
import type { CSSProperties } from 'react';

/** Full-motion carousel slot styles. Moved verbatim from Projects.tsx. */
export const POSITION_STYLES: Record<number, CSSProperties> = {
  0:  { transform: 'translateX(0) scale(1) rotateY(0deg)',        opacity: 1,   zIndex: 30, filter: 'brightness(1.2)' },
  1:  { transform: 'translateX(110%) scale(0.85) rotateY(-35deg)', opacity: 0.7, zIndex: 20, filter: 'brightness(0.7)' },
  [-1]: { transform: 'translateX(-110%) scale(0.85) rotateY(35deg)',  opacity: 0.7, zIndex: 20, filter: 'brightness(0.7)' },
  2:  { transform: 'translateX(220%) scale(0.7) rotateY(-45deg)',  opacity: 0,   zIndex: 10, filter: 'brightness(0.5)' },
  [-2]: { transform: 'translateX(-220%) scale(0.7) rotateY(45deg)',   opacity: 0,   zIndex: 10, filter: 'brightness(0.5)' },
};

/**
 * Reduced-motion carousel slot styles.
 *
 * Same horizontal offsets, opacity and stacking, but no rotateY and no scale. Cards
 * still move sideways so position and ordering stay legible; the 45-degree 3D sweep
 * that triggers vestibular symptoms does not happen.
 */
export const REDUCED_POSITION_STYLES: Record<number, CSSProperties> = {
  0:  { transform: 'translateX(0)',     opacity: 1,   zIndex: 30, filter: 'brightness(1.2)' },
  1:  { transform: 'translateX(110%)',  opacity: 0.7, zIndex: 20, filter: 'brightness(0.7)' },
  [-1]: { transform: 'translateX(-110%)', opacity: 0.7, zIndex: 20, filter: 'brightness(0.7)' },
  2:  { transform: 'translateX(220%)',  opacity: 0,   zIndex: 10, filter: 'brightness(0.5)' },
  [-2]: { transform: 'translateX(-220%)', opacity: 0,   zIndex: 10, filter: 'brightness(0.5)' },
};
```

- [ ] **Step 4: Run the tests**

Run: `npm test`
Expected: PASS — 6 new tests, 48 total across 6 files.

- [ ] **Step 5: Wire it into Projects.tsx**

Delete the whole `const POSITION_STYLES: Record<number, React.CSSProperties> = { … };`
block from `src/components/Projects.tsx`.

Add these imports after the existing `import { filterProjects } from '../lib/filterProjects';`:

```ts
import { POSITION_STYLES, REDUCED_POSITION_STYLES } from '../lib/carouselPositionStyles';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
```

Inside the `Projects` component, directly after the existing
`const filterDropdownRef = useRef<HTMLDivElement>(null);` line, add:

```ts
  const reducedMotion = usePrefersReducedMotion();
  const positionStyles = reducedMotion ? REDUCED_POSITION_STYLES : POSITION_STYLES;
```

Then replace the consumer:

```tsx
                        style={{ ...POSITION_STYLES[pos], transformStyle: 'preserve-3d', willChange: 'transform, opacity', pointerEvents: Math.abs(pos) <= 1 ? 'auto' : 'none' }}
```

with:

```tsx
                        style={{ ...positionStyles[pos], transformStyle: 'preserve-3d', willChange: 'transform, opacity', pointerEvents: Math.abs(pos) <= 1 ? 'auto' : 'none' }}
```

- [ ] **Step 6: Verify**

Run: `npm run lint && npm test && npx tsc -b --noEmit && npm run build`
Expected: lint exit 0, 48 tests pass, no type errors, build succeeds.

`noUnusedLocals` will catch it if the old `POSITION_STYLES` constant was left behind
unused, and `tsc` will catch a missed rename at the consumer.

- [ ] **Step 7: Commit**

```bash
git add src/lib/carouselPositionStyles.ts src/lib/carouselPositionStyles.test.ts src/components/Projects.tsx
git commit -m "$(cat <<'EOF'
feat: flatten the carousel's 3D sweep under reduced motion

POSITION_STYLES is an inline JS map, so the media query cannot reach it.
Both maps move to a leaf module - following the filterProjects precedent -
so the test imports a leaf rather than the component tree, and Projects
selects between them.

The reduced map keeps the same translateX offsets, opacity and stacking
but drops rotateY and scale: cards still move sideways so position and
ordering stay legible, without the 45-degree rotation that triggers
vestibular symptoms.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018meF4mJ98mDwdbDbVqMe5U
EOF
)"
```

---

### Task 8: Final verification

No code changes. Confirms every done criterion from spec §6.

**Files:** none modified.

- [ ] **Step 1: Run the automated criteria**

```bash
rm -rf dist
npm run lint       && echo "1. lint exit 0 PASS"
npm test
npx tsc -b --noEmit && echo "3. typecheck PASS"
npm run build      && echo "4. build PASS"
```

Expected: lint silent with exit 0; **48 tests passed across 6 files**; no type errors;
build succeeds.

- [ ] **Step 2: Confirm the reveal fixes landed everywhere**

```bash
echo "--- 5. only the slideIn bar keeps `forwards` ---"
grep -rn "forwards" src/
echo "--- 5b. no inline transition was introduced ---"
grep -rn "transitionProperty\|transitionDuration\|transitionDelay" src/ | wc -l
echo "--- no inverted opacity remains ---"
grep -rn "opacity: isVisible ? 0 : 1" src/ | wc -l
```

Expected: criterion 5 prints exactly TWO lines — `src/components/About.tsx` (the
`slideIn` language bar, real code, out of scope) and `src/lib/revealStyle.ts` (the word
inside a docstring, not code). Neither `Projects.tsx` nor `Connect.tsx` may appear; that
absence is the property being checked. Criterion 5b prints `0`. The inverted-opacity
check prints `0`.

- [ ] **Step 3: The hazard check — the reason this slice exists**

Run `npm run dev` and open the printed URL. In DevTools, add this rule to the page:

```css
* { animation: none !important; transition: none !important; }
```

Scroll the whole page and confirm **every** project card, contact link, skill chip and
About row is **visible**. Before this slice the same rule blanked all of them.

Stop the dev server afterwards.

- [ ] **Step 4: The manual reduced-motion pass**

Enable the OS setting — on macOS, System Settings → Accessibility → Display → Reduce
motion. Reload the site and confirm each of these:

1. The hero types nothing; it shows a static "Computer Engineering Student"
2. The cursor after it does not blink
3. The scroll indicator near the bottom of the hero does not pulse
4. Clicking a nav item jumps instantly rather than smooth-scrolling
5. Scrolling to About and Skills reveals content immediately, with no stagger
6. Carousel next/prev slides cards sideways **without** the 3D rotation
7. Still working: hovering a nav item, a skill chip and a project card still animates;
   the mobile menu still expands smoothly; focus rings still appear on Tab

- [ ] **Step 5: The normal-motion regression pass**

Disable the OS setting, reload, and confirm the site behaves as before:

1. The typewriter types, pauses, deletes and advances
2. Scroll reveals still stagger in About and Skills
3. **No element flashes visible before fading in** — this is the regression the `both`
   fill mode prevents, and the single most important thing to watch for
4. The carousel still rotates in 3D
5. Project cards still stagger in when the grid view is toggled

- [ ] **Step 6: Report**

Summarise: lint/test/typecheck/build status, the criterion 5 and 5b greps, the result of
the hazard check, and the outcome of both manual passes. Note explicitly that
`usePrefersReducedMotion` and the typewriter's reduced branch have **no automated
coverage** — steps 4 and 5 are the only verification they receive.

---

## Notes for the implementer

**Do not add jsdom or Testing Library.** Three hooks in this slice are untestable without
a DOM, and that is accepted and documented. Adding a DOM environment belongs with the
first component test that genuinely needs one, not here.

**Do not touch** the three `requestAnimationFrame` cursor-glow loops in `Hero.tsx`,
`ProjectCard.tsx` and `Connect.tsx`. They are continuous motion, but pointer-driven rather
than auto-playing, so WCAG 2.2.2 does not reach them, and Slice C reworks them for
performance. Gating them here would conflict.

**Do not touch** `src/components/About.tsx:251`, the `slideIn` language bar. `slideIn` has
a `from` but no `to`, so it animates to the element's declared width and is already safe
under `animation: none`. It has the same delay-flash as the Group 2 sites, which is
recorded as out of scope.

**Do not "fix" the dead hover transforms.** `hover:translate-x-1` at `About.tsx:179` and
`hover:translate-x-2` at `About.tsx:287` do not work, because a `forwards`/`both` fill on
`transform` overrides them. That is pre-existing, unchanged by this slice, and recorded
for Slice E.

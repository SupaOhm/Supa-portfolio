# Cursor Glow Performance (Slice C1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the per-frame React re-render and layout cost behind the reported scroll lag at the projects carousel.

**Architecture:** Four duplicated cursor-tracking systems (three rAF loops plus one per-event system) collapse into one `useCursorGlow` hook that holds no React state. It writes `--glow-x` / `--glow-y` CSS custom properties directly onto the hovered element via a ref-driven rAF loop that stops itself on convergence. Glow elements move from `left`/`top` (layout every frame) to a `transform` on a shared `.cursor-glow` class (compositor only).

**Tech Stack:** React 19.2, TypeScript 5.9 (`strict`, `noUnusedLocals`), Tailwind CSS 3.4, Vitest 4.1, @testing-library/react 16.3, jsdom 29.

**Spec:** `docs/superpowers/specs/2026-08-14-cursor-glow-perf-design.md`

## Global Constraints

- Branch is `perf/cursor-glow`, already created off `main` at `c540558`. Do not create another branch.
- `DEFAULT_SMOOTHING = 0.15` and `CONVERGENCE_EPSILON = 0.5`. Use these exact names and values.
- CSS custom property names are exactly `--glow-x` and `--glow-y`.
- The hook must hold **no React state**. No `useState` anywhere in `useCursorGlow.ts`.
- Under reduced motion, `requestAnimationFrame` must **never** be called.
- `REDUCED_POSITION_STYLES` must keep differing from `POSITION_STYLES` **only** in `transform` (invariant established in Slice B1).
- `noUnusedLocals` is on: every declaration left without references must be deleted, or `npm run build` fails.
- Vitest runs `environment: 'node'` globally. A test file needing a DOM must start with the docblock `// @vitest-environment jsdom` on line 1.
- jsdom test files must call `afterEach(cleanup)` explicitly — `test.globals` is not enabled, so @testing-library/react's auto-cleanup never registers.
- Do not touch `backdrop-blur-sm` on `ProjectCard`, or `willChange` on the `Projects` slot wrappers. Both are explicitly out of scope.
- Run `npm test`, `npm run lint`, and `npm run build` before each commit. Baseline before this plan: 58 tests passing, lint exit 0.

---

### Task 1: Pure glow maths

Two pure functions with no DOM and no React, unit tested in the default `node`
environment. This mirrors `nextTypewriterState` in `src/hooks/useTypewriter.ts`,
which is the established pattern in this repo for making hook logic testable.

**Files:**
- Create: `src/hooks/useCursorGlow.ts`
- Test: `src/hooks/useCursorGlow.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `type GlowPosition = { x: number; y: number }`;
  `DEFAULT_SMOOTHING: number` (0.15); `CONVERGENCE_EPSILON: number` (0.5);
  `nextGlowPosition(current: GlowPosition, target: GlowPosition, smoothing?: number): GlowPosition`;
  `hasConverged(current: GlowPosition, target: GlowPosition, epsilon?: number): boolean`.
  Task 2 adds the `useCursorGlow` hook to this same file.

- [ ] **Step 1: Write the failing test**

Create `src/hooks/useCursorGlow.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  nextGlowPosition,
  hasConverged,
  DEFAULT_SMOOTHING,
  CONVERGENCE_EPSILON,
} from './useCursorGlow';

describe('nextGlowPosition', () => {
  it('moves 15% of the way toward the target by default', () => {
    expect(nextGlowPosition({ x: 0, y: 0 }, { x: 100, y: 40 })).toEqual({ x: 15, y: 6 });
  });

  it('honours an explicit smoothing factor', () => {
    expect(nextGlowPosition({ x: 0, y: 0 }, { x: 100, y: 0 }, 0.5)).toEqual({ x: 50, y: 0 });
  });

  it('is a no-op when current already equals target', () => {
    expect(nextGlowPosition({ x: 12, y: 34 }, { x: 12, y: 34 })).toEqual({ x: 12, y: 34 });
  });

  it('closes the gap from either direction', () => {
    expect(nextGlowPosition({ x: 100, y: 0 }, { x: 0, y: 0 })).toEqual({ x: 85, y: 0 });
  });

  it('exposes 0.15 as the default smoothing', () => {
    expect(DEFAULT_SMOOTHING).toBe(0.15);
  });
});

describe('hasConverged', () => {
  it('is false while the gap is large', () => {
    expect(hasConverged({ x: 0, y: 0 }, { x: 100, y: 0 })).toBe(false);
  });

  it('is true once both axes are inside epsilon', () => {
    expect(hasConverged({ x: 99.6, y: 10.2 }, { x: 100, y: 10 })).toBe(true);
  });

  it('requires BOTH axes to be inside epsilon', () => {
    expect(hasConverged({ x: 99.6, y: 0 }, { x: 100, y: 50 })).toBe(false);
    expect(hasConverged({ x: 0, y: 49.9 }, { x: 50, y: 50 })).toBe(false);
  });

  it('honours an explicit epsilon', () => {
    expect(hasConverged({ x: 0, y: 0 }, { x: 3, y: 0 }, 5)).toBe(true);
  });

  it('exposes 0.5 as the default epsilon', () => {
    expect(CONVERGENCE_EPSILON).toBe(0.5);
  });
});
```

All arithmetic above is float-exact in IEEE 754 (verified: `100 * 0.15 === 15`,
`40 * 0.15 === 6`, `100 * 0.5 === 50`, `Math.abs(100 - 99.6) === 0.4000000000000057`,
which is below 0.5). Use `toEqual`, not `toBeCloseTo`.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/hooks/useCursorGlow.test.ts`
Expected: FAIL — cannot resolve `./useCursorGlow`.

- [ ] **Step 3: Write the implementation**

Create `src/hooks/useCursorGlow.ts`:

```ts
export type GlowPosition = { x: number; y: number };

/** Fraction of the remaining gap closed per frame. Matches the value the three
 *  hand-rolled loops used before they were unified. */
export const DEFAULT_SMOOTHING = 0.15;

/** Distance in px below which the glow is treated as having arrived, so the
 *  animation loop can stop instead of easing forever. */
export const CONVERGENCE_EPSILON = 0.5;

/** One easing step: move `current` a fraction of the way toward `target`. */
export function nextGlowPosition(
  current: GlowPosition,
  target: GlowPosition,
  smoothing: number = DEFAULT_SMOOTHING,
): GlowPosition {
  return {
    x: current.x + (target.x - current.x) * smoothing,
    y: current.y + (target.y - current.y) * smoothing,
  };
}

/** Whether the glow is close enough to the pointer to stop animating. Both axes
 *  must be inside epsilon — a glow that has arrived horizontally but not
 *  vertically is still moving. */
export function hasConverged(
  current: GlowPosition,
  target: GlowPosition,
  epsilon: number = CONVERGENCE_EPSILON,
): boolean {
  return (
    Math.abs(target.x - current.x) < epsilon && Math.abs(target.y - current.y) < epsilon
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/hooks/useCursorGlow.test.ts`
Expected: PASS, 10 tests.

- [ ] **Step 5: Run the full suite, lint, and build**

Run: `npm test && npm run lint && npm run build`
Expected: 68 tests passing (58 baseline + 10), lint exit 0, build succeeds.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useCursorGlow.ts src/hooks/useCursorGlow.test.ts
git commit -m "feat: add pure glow easing helpers"
```

---

### Task 2: The useCursorGlow hook

Adds the hook itself to the file Task 1 created. No React state: target, current
position, host element, and frame handle all live in refs.

**Files:**
- Modify: `src/hooks/useCursorGlow.ts` (append to what Task 1 created)
- Test: `src/hooks/useCursorGlow.dom.test.tsx` (create)

**Interfaces:**
- Consumes: `nextGlowPosition`, `hasConverged`, `DEFAULT_SMOOTHING`,
  `CONVERGENCE_EPSILON`, `GlowPosition` from Task 1;
  `usePrefersReducedMotion(): boolean` from `src/hooks/usePrefersReducedMotion.ts`.
- Produces: `useCursorGlow(smoothing?: number): (event: React.MouseEvent<HTMLElement>) => void`.
  Tasks 3-5 attach the returned function directly to an `onMouseMove` prop.

**Behavioural contract that the tests below pin down:**

1. The **first** move onto an element snaps — it writes the pointer position with
   no easing and schedules no frame. This prevents the glow sweeping in from the
   element's top-left corner on entry, and prevents it sweeping *between*
   elements when one hook instance serves many (Connect's link lists).
2. Subsequent moves on the **same** element ease via `requestAnimationFrame`.
3. The loop cancels itself once `hasConverged` is true, so a still cursor costs
   nothing.
4. Under reduced motion, every move snaps and `requestAnimationFrame` is never
   called at all.

- [ ] **Step 1: Write the failing test**

Create `src/hooks/useCursorGlow.dom.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { useCursorGlow } from './useCursorGlow';

// @testing-library/react only auto-registers cleanup when vitest's
// `test.globals` is on, which this project does not enable. Clean up explicitly.
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function GlowHost() {
  const handleMouseMove = useCursorGlow();
  return <div data-testid="host" onMouseMove={handleMouseMove} />;
}

/** Replaces window.matchMedia so usePrefersReducedMotion sees `reduce`. */
function stubReducedMotion(matches: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

/** Captures rAF callbacks so frames can be advanced deterministically. */
function captureFrames() {
  const frames: FrameRequestCallback[] = [];
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    frames.push(cb);
    return frames.length;
  });
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  return frames;
}

describe('useCursorGlow', () => {
  // jsdom's getBoundingClientRect returns all zeros, so clientX/clientY pass
  // through the `clientX - rect.left` arithmetic unchanged.

  it('snaps to the pointer on the first move onto an element', () => {
    const frames = captureFrames();
    render(<GlowHost />);
    const host = screen.getByTestId('host');

    fireEvent.mouseMove(host, { clientX: 100, clientY: 50 });

    expect(host.style.getPropertyValue('--glow-x')).toBe('100px');
    expect(host.style.getPropertyValue('--glow-y')).toBe('50px');
    expect(frames).toHaveLength(0);
  });

  it('eases toward the target on subsequent moves', () => {
    const frames = captureFrames();
    render(<GlowHost />);
    const host = screen.getByTestId('host');

    fireEvent.mouseMove(host, { clientX: 0, clientY: 0 });
    fireEvent.mouseMove(host, { clientX: 100, clientY: 40 });
    expect(frames).toHaveLength(1);

    frames[0](0);

    expect(host.style.getPropertyValue('--glow-x')).toBe('15px');
    expect(host.style.getPropertyValue('--glow-y')).toBe('6px');
  });

  it('stops scheduling frames once the glow converges', () => {
    const frames = captureFrames();
    render(<GlowHost />);
    const host = screen.getByTestId('host');

    fireEvent.mouseMove(host, { clientX: 0, clientY: 0 });
    fireEvent.mouseMove(host, { clientX: 1, clientY: 0 });

    // 0 -> 0.15 leaves a gap of 0.85; the frame after that leaves 0.7225, and so
    // on. Run frames until the loop declines to schedule another.
    let guard = 0;
    while (guard < 100 && frames.length > guard) {
      frames[guard](0);
      guard += 1;
    }

    // Gap 1 -> 0.85 -> 0.7225 -> 0.6141 -> 0.5221 -> 0.4438, which is the first
    // value under CONVERGENCE_EPSILON, so the 5th frame snaps and stops.
    expect(frames).toHaveLength(5);
    expect(host.style.getPropertyValue('--glow-x')).toBe('1px');
  });

  it('snaps and never schedules a frame under reduced motion', () => {
    stubReducedMotion(true);
    const frames = captureFrames();
    render(<GlowHost />);
    const host = screen.getByTestId('host');

    fireEvent.mouseMove(host, { clientX: 0, clientY: 0 });
    fireEvent.mouseMove(host, { clientX: 100, clientY: 40 });

    expect(host.style.getPropertyValue('--glow-x')).toBe('100px');
    expect(host.style.getPropertyValue('--glow-y')).toBe('40px');
    expect(frames).toHaveLength(0);
  });
});
```

Note the filename is `useCursorGlow.dom.test.tsx`, distinct from Task 1's
`useCursorGlow.test.ts`. Vitest's `include` glob is
`src/**/*.test.{ts,tsx}`, which matches both. They must be separate files
because the environment docblock applies per file and Task 1's tests must stay
in `node`.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/hooks/useCursorGlow.dom.test.tsx`
Expected: FAIL — `useCursorGlow` is not exported.

- [ ] **Step 3: Write the implementation**

Append to `src/hooks/useCursorGlow.ts`, and add the imports at the top of the
file:

```ts
import { useCallback, useEffect, useRef } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';
```

```ts
function writeGlow(element: HTMLElement, position: GlowPosition): void {
  element.style.setProperty('--glow-x', `${position.x}px`);
  element.style.setProperty('--glow-y', `${position.y}px`);
}

/**
 * Drives a cursor-following glow without any React state.
 *
 * Returns a single `onMouseMove` handler. Each frame writes `--glow-x` and
 * `--glow-y` onto the element the pointer is over, so nothing re-renders and the
 * glow elements can move with a compositor-only `transform` instead of `left`
 * and `top`.
 *
 * The loop starts on mousemove and cancels itself on convergence, so a still or
 * absent cursor costs nothing. There are deliberately no enter/leave handlers:
 * when the pointer leaves, mousemove stops firing and the loop winds down on its
 * own, and glow visibility is already handled by CSS and conditional rendering
 * at the call sites.
 *
 * Writing to `event.currentTarget` rather than a stored ref lets ONE instance
 * serve many elements — Connect shares a single hook across every contact link.
 * A per-link hook would be a hook call inside `.map()`, which the Rules of Hooks
 * forbid.
 */
export function useCursorGlow(
  smoothing: number = DEFAULT_SMOOTHING,
): (event: ReactMouseEvent<HTMLElement>) => void {
  const targetRef = useRef<GlowPosition>({ x: 0, y: 0 });
  const currentRef = useRef<GlowPosition>({ x: 0, y: 0 });
  const elementRef = useRef<HTMLElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(
    () => () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    },
    [],
  );

  const step = useCallback(() => {
    const element = elementRef.current;
    if (element === null) {
      frameRef.current = null;
      return;
    }

    const next = nextGlowPosition(currentRef.current, targetRef.current, smoothing);

    if (hasConverged(next, targetRef.current)) {
      currentRef.current = targetRef.current;
      writeGlow(element, targetRef.current);
      frameRef.current = null;
      return;
    }

    currentRef.current = next;
    writeGlow(element, next);
    frameRef.current = requestAnimationFrame(step);
  }, [smoothing]);

  return useCallback(
    (event: ReactMouseEvent<HTMLElement>) => {
      const element = event.currentTarget;
      const rect = element.getBoundingClientRect();
      targetRef.current = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };

      // First move onto this element (or onto a different one): snap, so the
      // glow does not sweep in from the corner or across from a sibling.
      if (element !== elementRef.current) {
        elementRef.current = element;
        currentRef.current = targetRef.current;
        writeGlow(element, targetRef.current);
        return;
      }

      if (reducedMotion) {
        currentRef.current = targetRef.current;
        writeGlow(element, targetRef.current);
        return;
      }

      if (frameRef.current === null) {
        frameRef.current = requestAnimationFrame(step);
      }
    },
    [reducedMotion, step],
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/hooks/useCursorGlow.dom.test.tsx`
Expected: PASS, 4 tests.

- [ ] **Step 5: Run the full suite, lint, and build**

Run: `npm test && npm run lint && npm run build`
Expected: 72 tests passing, lint exit 0, build succeeds.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useCursorGlow.ts src/hooks/useCursorGlow.dom.test.tsx
git commit -m "feat: add useCursorGlow hook with no React state"
```

---

### Task 3: The .cursor-glow class and the Hero call site

Adds the shared CSS class, then converts the simplest call site (one glow) to
prove the pattern end to end.

**Files:**
- Modify: `src/index.css` (inside the existing `@layer utilities` block)
- Modify: `src/components/Hero.tsx:1`, `:18-20`, `:24-50`, `:71-79`

**Interfaces:**
- Consumes: `useCursorGlow()` from Task 2.
- Produces: the `.cursor-glow` class, used by Tasks 4 and 5.

- [ ] **Step 1: Add the CSS class**

In `src/index.css`, inside the existing `@layer utilities { ... }` block (it
opens at line 16, right after `@layer base`), add:

```css
  /* Cursor-following glow. Position comes from --glow-x / --glow-y, written by
     the useCursorGlow hook on the hovered ancestor; custom properties inherit,
     so any number of glows can share one writer.

     translate(-50%, -50%) is relative to the element's OWN size, which centres
     each glow on the cursor regardless of its dimensions — this replaces the
     per-element `left: x - width/2` arithmetic the inline styles used.

     The var() fallbacks are required: an unset custom property makes the whole
     transform declaration invalid, leaving the glow unpositioned until the
     first mousemove. */
  .cursor-glow {
    position: absolute;
    top: 0;
    left: 0;
    transform: translate3d(var(--glow-x, 0px), var(--glow-y, 0px), 0)
               translate(-50%, -50%);
  }
```

No entry is needed in the `@media (prefers-reduced-motion: reduce)` block at the
bottom of the file: the class has no transition or animation of its own, and the
hook already stops easing under reduced motion.

- [ ] **Step 2: Rewrite the Hero component body**

In `src/components/Hero.tsx`, replace line 1:

```ts
import { useLocation, useNavigate } from 'react-router-dom';
```

(`useEffect`, `useRef`, and `useState` all become unused once the loop is gone,
so the entire `react` import goes. React 19's JSX transform needs no React
import.)

Add to the import block, after the `useTypewriter` import on line 3:

```ts
import { useCursorGlow } from '../hooks/useCursorGlow';
```

Replace lines 18-20:

```ts
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [smoothMousePosition, setSmoothMousePosition] = useState({ x: 0, y: 0 });
  const mouseRef = useRef(mousePosition);
```

with:

```ts
  const handleMouseMove = useCursorGlow();
```

Delete lines 24-50 entirely — the old `handleMouseMove`, the `mouseRef` sync
effect, and the rAF effect. Keep `const location = useLocation();` and
`const navigate = useNavigate();`, and keep `handleSectionClick` intact.

- [ ] **Step 3: Convert the Hero glow element**

Replace the glow block (lines 71-79 — the comment, the `<div>`, its inline
`style`, and the closing `/>`):

```tsx
      {/* Primary cursor-following glow - scaled down for structural feel */}
      <div className="cursor-glow w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-[80px] pointer-events-none mix-blend-screen" />
```

The `absolute` class is dropped because `.cursor-glow` sets `position: absolute`,
and the inline `left`, `top`, and `transition: 'none'` are gone entirely.

The `onMouseMove={handleMouseMove}` on the `<section>` at line 69 is unchanged —
the handler keeps its name so the JSX does not move.

**Note:** Hero's loop used a smoothing of `0.1`; it now uses the shared default
of `0.15`. This is intentional (one shared default across all call sites) and
means the Hero glow follows the cursor marginally faster.

- [ ] **Step 4: Verify**

Run: `npm test && npm run lint && npm run build`
Expected: 72 tests passing, lint exit 0, build succeeds.

There is no automated test for this task. jsdom applies no stylesheet and has no
layout engine, so nothing can assert that the glow renders in the right place —
that is covered by the manual checklist in Task 6.

- [ ] **Step 5: Commit**

```bash
git add src/index.css src/components/Hero.tsx
git commit -m "perf: move the Hero glow to CSS custom properties"
```

---

### Task 4: The ProjectCard call site

This is the carousel-critical one: `ProjectCard` is instantiated five times
inside the carousel, so its loop was the largest single cost.

**Files:**
- Modify: `src/components/ProjectCard.tsx:1`, `:9-11`, `:13-39`, `:47-63`

**Interfaces:**
- Consumes: `useCursorGlow()` from Task 2, `.cursor-glow` from Task 3.
- Produces: nothing consumed later.

- [ ] **Step 1: Replace the state and loop**

In `src/components/ProjectCard.tsx`, replace line 1:

```ts
import type { Project } from '../types/project';
import { useCursorGlow } from '../hooks/useCursorGlow';
```

(Line 2 currently already imports `Project`; the result must import `Project`
exactly once. `useEffect`, `useRef`, and `useState` all become unused.)

Replace lines 9-11:

```ts
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [smoothMousePosition, setSmoothMousePosition] = useState({ x: 0, y: 0 });
  const mouseRef = useRef(mousePosition);
```

with:

```ts
  const handleMouseMove = useCursorGlow();
```

Delete lines 13-39 — the old `handleMouseMove`, the `mouseRef` sync effect, and
the rAF effect.

- [ ] **Step 2: Convert both glow elements**

Replace lines 47-63 (the comment plus both glow `<div>`s) with:

```tsx
      {/* Cursor-following gradient effects */}
      <div className="cursor-glow w-[250px] h-[250px] bg-gradient-to-r from-blue-500/20 via-purple-500/15 to-transparent rounded-full blur-[60px] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="cursor-glow w-[150px] h-[150px] bg-gradient-to-r from-blue-400/15 to-transparent rounded-full blur-[40px] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
```

Each keeps its size, gradient, blur, `pointer-events-none`, and the
`opacity-0 group-hover:opacity-100 transition-opacity duration-300` visibility
behaviour. Each drops `absolute` and its inline `left`/`top`/`transition`.

`transition-opacity` is deliberately narrower than a bare `transition`: it
animates opacity only, so the `transform` written every frame is never
transitioned. This is what the old inline `transition: 'none'` was defending
against.

The `onMouseMove={handleMouseMove}` on the `<article>` at line 45 is unchanged.

Do **not** touch `backdrop-blur-sm` in the `<article>` className on line 44.

- [ ] **Step 3: Verify**

Run: `npm test && npm run lint && npm run build`
Expected: 72 tests passing, lint exit 0, build succeeds.

`src/components/Projects.test.tsx` renders the carousel and therefore mounts
`ProjectCard`. It must still pass; if it fails, the cause is a real regression
in this task, not a stale expectation.

- [ ] **Step 4: Commit**

```bash
git add src/components/ProjectCard.tsx
git commit -m "perf: remove the per-card rAF loop from ProjectCard"
```

---

### Task 5: The Connect call sites

`Connect` has **two** cursor systems: the smoothed one on the compact link grid,
and `fullHover` on the expanded contact panel. Both are replaced by a **single**
`useCursorGlow()` instance, because only one element is hovered at a time and the
hook writes to whichever element the pointer is over.

**Files:**
- Modify: `src/components/Connect.tsx:1`, `:8-14`, `:23-25`, `:79-105`, `:108-131`, `:159`, `:172-190`, `:239-241`, `:244-259`

**Interfaces:**
- Consumes: `useCursorGlow()` from Task 2, `.cursor-glow` from Task 3.
- Produces: nothing consumed later.

- [ ] **Step 1: Update imports and delete dead types**

Replace line 1:

```ts
import { useState, type ReactElement } from 'react';
```

(`useRef` and `useEffect` become unused; `useState` is still needed for
`hoveredLink`, `showAllDetails`, and `fullHoverName`.)

Add after the `usePrefersReducedMotion` import on line 3:

```ts
import { useCursorGlow } from '../hooks/useCursorGlow';
```

Delete these declarations — every reference to them is removed in this task, and
`noUnusedLocals` will fail the build if any survive:

- `type PointerPosition` (line 8)
- `type FullHoverState` (lines 10-14)
- `const INITIAL_POINTER_POSITION` (line 23)
- `const INITIAL_FULL_HOVER_STATE` (line 24)
- `const SMOOTHING_FACTOR` (line 25)

Keep `type ContactLink` (lines 16-21) — it is used by the link data.

- [ ] **Step 2: Replace the state and both loops**

Replace lines 79-80:

```ts
  const [mousePosition, setMousePosition] = useState<PointerPosition>(INITIAL_POINTER_POSITION);
  const [smoothMousePosition, setSmoothMousePosition] = useState<PointerPosition>(INITIAL_POINTER_POSITION);
```

with nothing (delete both lines).

Replace line 82:

```ts
  const [fullHover, setFullHover] = useState<FullHoverState>(INITIAL_FULL_HOVER_STATE);
```

with:

```ts
  const [fullHoverName, setFullHoverName] = useState<string | null>(null);
```

Once `x` and `y` live in CSS variables, this state only records which link is
hovered — the same shape as the `hoveredLink` state already declared on line 78.

Replace line 85 (`const mouseRef = useRef(mousePosition);`) and both effects
(lines 87-105, the `mouseRef` sync effect and the rAF effect) with:

```ts
  const handleMouseMove = useCursorGlow();
```

Delete the old `handleMouseMove` function (lines 108-114, the one that called
`setMousePosition`).

Replace `resetFullHover` (lines 120-122) with:

```ts
  const resetFullHover = () => {
    setFullHoverName(null);
  };
```

Delete `handleFullMouseMove` entirely (lines 124-131) — the shared hook replaces
it.

Keep `handleLinkHover` (lines 116-118) — it drives the compact-link hover state
and is unrelated to the glow.

- [ ] **Step 3: Convert the compact-link glows**

Line 159's `onMouseMove={handleMouseMove}` is unchanged — the name is reused.

Replace the two glow `<div>`s (lines 175-190, inside
`{hoveredLink === link.name && (` ... `)}`) with:

```tsx
                    <div className="cursor-glow w-[160px] h-[160px] bg-gradient-to-r from-blue-400/30 via-purple-400/25 to-transparent rounded-full blur-[50px] pointer-events-none opacity-100" />
                    <div className="cursor-glow w-[100px] h-[100px] bg-gradient-to-r from-blue-300/25 to-transparent rounded-full blur-[30px] pointer-events-none opacity-100" />
```

- [ ] **Step 4: Convert the expanded-panel glows**

On the `<a>` in the expanded panel, replace line 239:

```tsx
                onMouseEnter={() => setFullHoverName(link.name)}
```

and replace line 241:

```tsx
                onMouseMove={handleMouseMove}
```

`onMouseLeave={resetFullHover}` on line 240 is unchanged.

Replace line 244's guard:

```tsx
                {fullHoverName === link.name && (
```

Replace the two glow `<span>`s (lines 246-259) with:

```tsx
                    <span className="cursor-glow pointer-events-none w-[140px] h-[140px] bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-transparent rounded-full blur-[40px] opacity-80" />
                    <span className="cursor-glow pointer-events-none w-[80px] h-[80px] bg-gradient-to-r from-blue-300/25 to-transparent rounded-full blur-[24px] opacity-80" />
```

**Expected behaviour change:** these two glows previously tracked the cursor
instantly, because `fullHover` had no easing. Routed through the shared hook they
now ease like every other glow. This is the deliberate consistency change
recorded in the spec, not a regression.

- [ ] **Step 5: Verify**

Run: `npm test && npm run lint && npm run build`
Expected: 72 tests passing, lint exit 0, build succeeds.

Then confirm no reference to the deleted identifiers survives:

```bash
grep -n "smoothMousePosition\|mousePosition\|mouseRef\|SMOOTHING_FACTOR\|INITIAL_POINTER_POSITION\|INITIAL_FULL_HOVER_STATE\|FullHoverState\|PointerPosition\|handleFullMouseMove\|fullHover\." src/components/Connect.tsx
```

Expected: no output. (`fullHoverName` is the new name; the grep's `fullHover\.`
pattern deliberately matches only the old property access.)

- [ ] **Step 6: Commit**

```bash
git add src/components/Connect.tsx
git commit -m "perf: unify both Connect cursor systems on useCursorGlow"
```

---

### Task 6: Carousel neighbour styling

Removes the per-frame `filter` re-raster from the carousel neighbours and, in the
same change, fixes the contrast finding Slice B3 was going to address.

**Files:**
- Modify: `src/lib/carouselPositionStyles.ts`
- Modify: `src/lib/carouselPositionStyles.test.ts` (extend the existing file)

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: nothing consumed later.

- [ ] **Step 1: Write the failing test**

Append these two cases inside the existing
`describe('carousel position styles', ...)` block in
`src/lib/carouselPositionStyles.test.ts`:

```ts
  it('dims the neighbour slots with opacity alone, never a filter', () => {
    for (const map of [POSITION_STYLES, REDUCED_POSITION_STYLES]) {
      for (const slot of [1, -1]) {
        // 0.8 keeps in-card body text at 4.86:1 against the card's own
        // background, clearing the 4.5:1 needed by WCAG 1.4.3. A brightness()
        // filter would dim text and background together and collapse it to
        // 2.46:1, as well as forcing a re-raster on every frame.
        expect(map[slot].opacity, `slot ${slot}`).toBe(0.8);
      }
    }
  });

  it('sets no filter on any slot in either map', () => {
    for (const map of [POSITION_STYLES, REDUCED_POSITION_STYLES]) {
      for (const [slot, style] of Object.entries(map)) {
        expect(style.filter, `slot ${slot}`).toBeUndefined();
      }
    }
  });
```

The existing test `keeps opacity and zIndex identical between the two maps`
already enforces the B1 invariant across both maps and must keep passing
unchanged.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/carouselPositionStyles.test.ts`
Expected: FAIL — the neighbour slots are `opacity: 0.7` and every slot still
carries a `filter`.

- [ ] **Step 3: Write the implementation**

Replace the whole of `src/lib/carouselPositionStyles.ts` with:

```ts
import type { CSSProperties } from 'react';

/**
 * Full-motion carousel slot styles.
 *
 * Neighbours are dimmed with opacity alone. An earlier `filter: brightness()`
 * was removed for two reasons: it dimmed each card's background along with its
 * text, collapsing in-card contrast to 2.46:1, and a CSS filter forces a
 * separate rendering context that must be re-rasterized every frame.
 */
export const POSITION_STYLES: Record<number, CSSProperties> = {
  0:  { transform: 'translateX(0) scale(1) rotateY(0deg)',           opacity: 1,   zIndex: 30 },
  1:  { transform: 'translateX(110%) scale(0.85) rotateY(-35deg)',   opacity: 0.8, zIndex: 20 },
  [-1]: { transform: 'translateX(-110%) scale(0.85) rotateY(35deg)', opacity: 0.8, zIndex: 20 },
  2:  { transform: 'translateX(220%) scale(0.7) rotateY(-45deg)',    opacity: 0,   zIndex: 10 },
  [-2]: { transform: 'translateX(-220%) scale(0.7) rotateY(45deg)',  opacity: 0,   zIndex: 10 },
};

/**
 * Reduced-motion carousel slot styles.
 *
 * Same horizontal offsets, opacity and stacking, but no rotateY and no scale.
 * Cards still move sideways so position and ordering stay legible; the
 * 45-degree 3D sweep that triggers vestibular symptoms does not happen.
 *
 * This map must differ from POSITION_STYLES only in `transform`.
 */
export const REDUCED_POSITION_STYLES: Record<number, CSSProperties> = {
  0:  { transform: 'translateX(0)',       opacity: 1,   zIndex: 30 },
  1:  { transform: 'translateX(110%)',    opacity: 0.8, zIndex: 20 },
  [-1]: { transform: 'translateX(-110%)', opacity: 0.8, zIndex: 20 },
  2:  { transform: 'translateX(220%)',    opacity: 0,   zIndex: 10 },
  [-2]: { transform: 'translateX(-220%)', opacity: 0,   zIndex: 10 },
};
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/carouselPositionStyles.test.ts`
Expected: PASS, 8 tests (6 existing + 2 new).

- [ ] **Step 5: Run the full suite, lint, and build**

Run: `npm test && npm run lint && npm run build`
Expected: 74 tests passing, lint exit 0, build succeeds.

- [ ] **Step 6: Commit**

```bash
git add src/lib/carouselPositionStyles.ts src/lib/carouselPositionStyles.test.ts
git commit -m "perf: dim carousel neighbours with opacity instead of a filter"
```

- [ ] **Step 7: Record what remains unverified**

Append to the PR description when the branch is opened. **Do not** claim the lag
is fixed — no test in this branch demonstrates it. jsdom has no compositor, no
layout engine, and no frame budget.

Manual checklist, to be run against the Vercel preview:

1. Scroll to the carousel and move the cursor across a card: the glow still
   follows, with easing, and the section scrolls smoothly.
2. React DevTools Profiler while hovering a carousel card: `ProjectCard` shows
   **no** renders from cursor motion. This is the core claim of the branch.
3. DevTools Performance while scrolling past the carousel: no per-frame "Layout"
   entries attributable to the glow elements.
4. Move the cursor away and leave it still: no ongoing scripting after ~0.5s.
5. Hero and both Connect glow groups still track the cursor and stay centred on
   it.
6. Connect's contact-panel glows now ease rather than snap — expected.
7. With OS reduced-motion on, glows jump straight to the cursor and no animation
   frames are scheduled.
8. Carousel side cards are visibly lighter than before and still read as
   receding.

---

## Follow-up outside this plan

Slice B3's spec (`docs/superpowers/specs/2026-08-14-remaining-a11y-design.md`,
committed on branch `fix/a11y-polish`) has a Group 1.3 that changes these same
neighbour styles to `opacity 0.85` + `brightness(0.9)`. Task 6 supersedes it.
When `fix/a11y-polish` is rebased onto this work, strike Group 1.3 from that
spec. Its other groups are unaffected.

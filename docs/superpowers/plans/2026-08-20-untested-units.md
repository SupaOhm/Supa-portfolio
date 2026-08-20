# Slice F — Untested Units Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Put real, sabotage-verified assertions under the seven source files that currently have none.

**Architecture:** One new module, `src/test/doubles.ts`, provides controllable replacements for the three browser globals that `src/test/setup.ts` deliberately stubs inert. Seven new test files import it. `src/test/setup.ts` is never modified. No production source changes unless a test exposes a real bug, in which case the fix is its own commit with the failing test first.

**Tech Stack:** Vitest 4.1, @testing-library/react 16.3, jsdom 29 (opt-in per file), TypeScript 5.9.

## Global Constraints

- **Never modify `src/test/setup.ts`.** 242 existing tests depend on its current inert stubs.
- **`MediaQueryListEvent` and `IntersectionObserverEntry` are `undefined` in this jsdom.** Never call `new MediaQueryListEvent(...)` or `new IntersectionObserverEntry(...)` — it throws `ReferenceError`. Build object literals and cast with `as unknown as T`.
- **Global test environment is `node`.** Any file needing a DOM must start with the exact line `// @vitest-environment jsdom` as its first line.
- **`test.globals` is off.** Always `import { describe, it, expect } from 'vitest'` explicitly, and always call `afterEach(cleanup)` in files that render.
- **Nothing under `src/` may import a `node:` module.** It passes `npm test` and fails `npm run typecheck` with TS2307.
- **Every new assertion must be sabotage-verified**: break the thing it guards, confirm the test fails, revert. Each task has an explicit step for this.
- Test command: `npx vitest run <path>`. Full gate: `npx vitest run && npm run lint && npm run typecheck && npm run build`.
- Branch: `feat/untested-units`.

## File Structure

| File | Responsibility |
|---|---|
| `src/test/doubles.ts` | Controllable `matchMedia` and `IntersectionObserver` fakes, plus a `getBoundingClientRect` stubber. No tests of its own; proven by its consumers. |
| `src/lib/scrollBehavior.test.ts` | node env. The reduced-motion decision function, including its no-`window` branch. |
| `src/hooks/usePrefersReducedMotion.dom.test.tsx` | jsdom. First-render correctness, live update, unsubscribe. |
| `src/hooks/useReveal.dom.test.tsx` | jsdom. Reveal-once semantics and observer lifecycle. |
| `src/hooks/useActiveSection.dom.test.tsx` | jsdom. Occupancy math, threshold hold, listener lifecycle, `scrollToSection`. |
| `src/components/Footer.test.tsx` | jsdom. Email and year render from `profile.ts`. |
| `src/components/Hero.test.tsx` | jsdom. Profile constants render; CTA behaviour. |
| `src/components/Connect.test.tsx` | jsdom. Null-profile resilience; link schemes and constants. |

**32 tests across 6 tasks.**

---

## Correction to the spec

The spec's `Hero` test 3 reads *"Call-to-action links have accessible names and non-empty `href`s."* This is wrong: Hero's CTAs are `<button type="button" onClick={...}>` (`Hero.tsx:82-96`), not anchors. There are no hrefs to assert. Task 5 replaces it with a behavioural test — clicking "View Projects" scrolls to `#projects` — which is what the buttons are actually for.

---

### Task 1: Test doubles module and `scrollBehavior`

**Files:**
- Create: `src/test/doubles.ts`
- Create: `src/lib/scrollBehavior.test.ts`
- Read for context: `src/lib/scrollBehavior.ts`, `src/test/setup.ts`

**Interfaces:**
- Consumes: nothing.
- Produces, from `src/test/doubles.ts`:
  - `createMatchMedia(options?: { reduced?: boolean }): MatchMediaDouble`
  - `interface MatchMediaDouble { matchMedia(query: string): MediaQueryList; install(): () => void; setMatches(matches: boolean): void; queries(): string[]; removeListenerCount(): number; }`
  - `createIntersectionObserver(): IntersectionObserverDouble`
  - `interface IntersectionObserverDouble { install(): () => void; lastOptions(): IntersectionObserverInit | undefined; observed(): Element[]; disconnectCount(): number; trigger(entries: Array<{ isIntersecting: boolean; target?: Element }>): void; }`
  - `stubRect(element: Element, rect: { top: number; bottom: number }): void`

- [ ] **Step 1: Create the branch**

```bash
git checkout -b feat/untested-units
```

- [ ] **Step 2: Write `src/test/doubles.ts`**

```ts
/**
 * Controllable replacements for the browser globals that src/test/setup.ts
 * stubs inert.
 *
 * setup.ts stubs matchMedia to a fixed `matches: false` whose addEventListener
 * is a vi.fn() that never fires, and stubs IntersectionObserver to a class that
 * records nothing. Those stubs exist so component tests do not throw on mount,
 * and they are correct for that job. But they mean a test for
 * usePrefersReducedMotion or useReveal written against the default environment
 * PASSES WHILE ASSERTING NOTHING.
 *
 * This module is imported explicitly, only by the files that need to drive
 * those globals. setup.ts is left untouched so the other 242 tests keep the
 * environment they were written against.
 *
 * Every install() returns a restore function that puts the PREVIOUS value back
 * rather than deleting the global — deleting it would break any later test in
 * the same file that renders a component.
 */

export interface MatchMediaDouble {
  /** Use directly when there is no `window` to install onto (node environment). */
  matchMedia(query: string): MediaQueryList;
  /** Install as `window.matchMedia`. Returns a restore function. */
  install(): () => void;
  /** Flip the result and notify every registered `change` listener. */
  setMatches(matches: boolean): void;
  /** Every query string passed to matchMedia, in call order. */
  queries(): string[];
  /** How many times removeEventListener('change', …) was called. */
  removeListenerCount(): number;
}

export function createMatchMedia(options: { reduced?: boolean } = {}): MatchMediaDouble {
  let matches = options.reduced ?? false;
  const listeners = new Set<(event: MediaQueryListEvent) => void>();
  const queries: string[] = [];
  let removeCount = 0;

  const matchMedia = (query: string): MediaQueryList => {
    queries.push(query);
    return {
      get matches() {
        return matches;
      },
      media: query,
      onchange: null,
      addEventListener: (type: string, listener: EventListenerOrEventListenerObject) => {
        if (type === 'change') {
          listeners.add(listener as (event: MediaQueryListEvent) => void);
        }
      },
      removeEventListener: (type: string, listener: EventListenerOrEventListenerObject) => {
        if (type === 'change') {
          removeCount += 1;
          listeners.delete(listener as (event: MediaQueryListEvent) => void);
        }
      },
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    } as unknown as MediaQueryList;
  };

  return {
    matchMedia,
    install() {
      const previous = Object.getOwnPropertyDescriptor(window, 'matchMedia');
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        configurable: true,
        value: matchMedia,
      });
      return () => {
        if (previous) {
          Object.defineProperty(window, 'matchMedia', previous);
        }
      };
    },
    setMatches(next: boolean) {
      matches = next;
      // MediaQueryListEvent does not exist in this jsdom (probed: `typeof` is
      // 'undefined'), so there is no event to construct and dispatch. Call the
      // listeners directly with the two fields the handler reads.
      const event = { matches: next, media: queries[queries.length - 1] ?? '' } as MediaQueryListEvent;
      for (const listener of [...listeners]) {
        listener(event);
      }
    },
    queries: () => [...queries],
    removeListenerCount: () => removeCount,
  };
}

export interface IntersectionObserverDouble {
  /** Install as both `window.IntersectionObserver` and the global. Returns a restore function. */
  install(): () => void;
  /** Options passed to the most recently constructed observer. */
  lastOptions(): IntersectionObserverInit | undefined;
  /** Elements passed to observe(), in call order. */
  observed(): Element[];
  /** How many times disconnect() was called, across all instances. */
  disconnectCount(): number;
  /** Invoke the most recently constructed observer's callback. */
  trigger(entries: Array<{ isIntersecting: boolean; target?: Element }>): void;
}

export function createIntersectionObserver(): IntersectionObserverDouble {
  type Callback = (entries: IntersectionObserverEntry[], observer: IntersectionObserver) => void;

  let lastCallback: Callback | undefined;
  let lastOptions: IntersectionObserverInit | undefined;
  let lastInstance: IntersectionObserver | undefined;
  const observed: Element[] = [];
  let disconnects = 0;

  class Stub {
    constructor(callback: Callback, init?: IntersectionObserverInit) {
      lastCallback = callback;
      lastOptions = init;
      lastInstance = this as unknown as IntersectionObserver;
    }
    observe(element: Element): void {
      observed.push(element);
    }
    unobserve(): void {}
    disconnect(): void {
      disconnects += 1;
    }
    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
  }

  return {
    install() {
      const previousWindow = Object.getOwnPropertyDescriptor(window, 'IntersectionObserver');
      const previousGlobal = Object.getOwnPropertyDescriptor(globalThis, 'IntersectionObserver');
      const descriptor = { writable: true, configurable: true, value: Stub };
      Object.defineProperty(window, 'IntersectionObserver', descriptor);
      Object.defineProperty(globalThis, 'IntersectionObserver', descriptor);
      return () => {
        if (previousWindow) Object.defineProperty(window, 'IntersectionObserver', previousWindow);
        if (previousGlobal) Object.defineProperty(globalThis, 'IntersectionObserver', previousGlobal);
      };
    },
    lastOptions: () => lastOptions,
    observed: () => [...observed],
    disconnectCount: () => disconnects,
    trigger(entries) {
      if (!lastCallback || !lastInstance) {
        throw new Error('trigger() called before any IntersectionObserver was constructed');
      }
      // IntersectionObserverEntry does not exist in this jsdom either, so the
      // entries are literals carrying only the field the hook reads.
      const cast = entries.map((entry) => entry as unknown as IntersectionObserverEntry);
      lastCallback(cast, lastInstance);
    },
  };
}

/**
 * Give an element a fake layout box.
 *
 * jsdom performs no layout: every getBoundingClientRect() returns all zeros.
 * useActiveSection derives its answer entirely from rect geometry, so without
 * this every section computes an occupancy of 0, the `> 0.1` threshold never
 * passes, and the hook looks inert while its tests pass.
 */
export function stubRect(element: Element, rect: { top: number; bottom: number }): void {
  const { top, bottom } = rect;
  element.getBoundingClientRect = () =>
    ({
      top,
      bottom,
      height: bottom - top,
      width: 0,
      left: 0,
      right: 0,
      x: 0,
      y: top,
      toJSON: () => ({}),
    }) as DOMRect;
}
```

- [ ] **Step 3: Write `src/lib/scrollBehavior.test.ts`**

This file runs in the default `node` environment — no `// @vitest-environment` line. That is deliberate: the function's first branch is `typeof window === 'undefined'`, and node gives a genuinely absent `window` rather than a faked one.

```ts
import { describe, it, expect, afterEach, vi } from 'vitest';
import { currentScrollBehavior } from './scrollBehavior';
import { createMatchMedia } from '../test/doubles';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('currentScrollBehavior', () => {
  it('returns smooth when there is no window at all', () => {
    // Runs in the node environment, so `window` is genuinely undefined rather
    // than stubbed away. This is the server-render branch.
    expect(typeof window).toBe('undefined');
    expect(currentScrollBehavior()).toBe('smooth');
  });

  it('returns auto when the user asks for reduced motion', () => {
    const media = createMatchMedia({ reduced: true });
    vi.stubGlobal('window', { matchMedia: media.matchMedia });

    expect(currentScrollBehavior()).toBe('auto');
  });

  it('returns smooth when the user has not asked for reduced motion', () => {
    const media = createMatchMedia({ reduced: false });
    vi.stubGlobal('window', { matchMedia: media.matchMedia });

    expect(currentScrollBehavior()).toBe('smooth');
  });

  it('asks for the exact reduced-motion media query', () => {
    // A typo here would never match anything, so the site would silently
    // animate for everyone who asked it not to, with every other test still
    // green. There is no other detector for that failure.
    const media = createMatchMedia();
    vi.stubGlobal('window', { matchMedia: media.matchMedia });

    currentScrollBehavior();

    expect(media.queries()).toEqual(['(prefers-reduced-motion: reduce)']);
  });
});
```

- [ ] **Step 4: Run the new file and confirm 4 passing**

Run: `npx vitest run src/lib/scrollBehavior.test.ts`
Expected: `Tests  4 passed (4)`

- [ ] **Step 5: Sabotage-verify all four**

Make each break, confirm the named test fails, then revert it before making the next.

```bash
# Break 1: invert the branch. Expect "returns auto when the user asks for
# reduced motion" to FAIL.
#   in src/lib/scrollBehavior.ts, change
#     ? 'auto' : 'smooth'
#   to
#     ? 'smooth' : 'auto'
#
# Break 2: typo the query. Expect "asks for the exact reduced-motion media
# query" to FAIL.
#   change '(prefers-reduced-motion: reduce)' to '(prefers-reduced-motion: reduced)'
#
# Break 3: remove the SSR guard. Expect "returns smooth when there is no window
# at all" to FAIL with a ReferenceError or TypeError.
#   delete the `if (typeof window === 'undefined') { return 'smooth'; }` block
git diff --stat   # must be empty before moving on
```

Run after each break: `npx vitest run src/lib/scrollBehavior.test.ts`
Expected: the named test FAILS; `git checkout src/lib/scrollBehavior.ts` restores it.

- [ ] **Step 6: Run the full gate**

Run: `npx vitest run && npm run lint && npm run typecheck && npm run build`
Expected: `Tests  246 passed (246)`, lint clean, typecheck clean, build succeeds.

- [ ] **Step 7: Commit**

```bash
git add src/test/doubles.ts src/lib/scrollBehavior.test.ts
git commit -m "Add controllable test doubles, and test scrollBehavior with them

src/test/setup.ts stubs matchMedia, IntersectionObserver and
scrollIntoView inert on purpose, so component tests do not throw on
mount. That makes a naive test of the reduced-motion path pass while
asserting nothing. src/test/doubles.ts supplies drivable versions,
imported only where needed, leaving setup.ts untouched.

MediaQueryListEvent and IntersectionObserverEntry do not exist in this
jsdom, so the doubles call listeners directly with cast literals rather
than constructing and dispatching events.

scrollBehavior is tested in the node environment so its
typeof-window-undefined branch runs against a genuinely absent window.
The fourth test pins the exact media query string: a typo there silently
disables reduced motion site-wide with every other test still green."
```

---

### Task 2: `usePrefersReducedMotion`

**Files:**
- Create: `src/hooks/usePrefersReducedMotion.dom.test.tsx`
- Read for context: `src/hooks/usePrefersReducedMotion.ts`

**Interfaces:**
- Consumes: `createMatchMedia` from `src/test/doubles` (Task 1).
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Write the test file**

```tsx
// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { renderHook, cleanup } from '@testing-library/react';
import { act } from 'react';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';
import { createMatchMedia } from '../test/doubles';

let restore: (() => void) | undefined;

afterEach(() => {
  cleanup();
  restore?.();
  restore = undefined;
});

describe('usePrefersReducedMotion', () => {
  it('is already true on the first render when the query matches', () => {
    // The hook reads matchMedia in the useState initialiser specifically so the
    // first paint is correct. If that moved into the effect, this value would
    // be false on the initial render and flip afterwards — a visible flash of
    // animation for someone who asked for none.
    const media = createMatchMedia({ reduced: true });
    restore = media.install();

    const { result } = renderHook(() => usePrefersReducedMotion());

    expect(result.current).toBe(true);
  });

  it('is false on the first render when the query does not match', () => {
    const media = createMatchMedia({ reduced: false });
    restore = media.install();

    const { result } = renderHook(() => usePrefersReducedMotion());

    expect(result.current).toBe(false);
  });

  it('follows the setting changing while the page is open', () => {
    const media = createMatchMedia({ reduced: false });
    restore = media.install();

    const { result } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(false);

    act(() => {
      media.setMatches(true);
    });

    expect(result.current).toBe(true);
  });

  it('unsubscribes on unmount', () => {
    const media = createMatchMedia();
    restore = media.install();

    const { unmount } = renderHook(() => usePrefersReducedMotion());
    expect(media.removeListenerCount()).toBe(0);

    unmount();

    expect(media.removeListenerCount()).toBe(1);
  });
});
```

- [ ] **Step 2: Run and confirm 4 passing**

Run: `npx vitest run src/hooks/usePrefersReducedMotion.dom.test.tsx`
Expected: `Tests  4 passed (4)`

- [ ] **Step 3: Sabotage-verify**

```bash
# Break 1: move the read out of the initialiser. Expect "is already true on the
# first render when the query matches" to FAIL (false instead of true).
#   change  useState<boolean>(() => typeof window !== 'undefined' && window.matchMedia(QUERY).matches)
#   to      useState<boolean>(false)
#
# Break 2: drop the subscription. Expect "follows the setting changing while the
# page is open" to FAIL.
#   comment out  mediaQuery.addEventListener('change', onChange);
#
# Break 3: drop the cleanup. Expect "unsubscribes on unmount" to FAIL (0 vs 1).
#   change the effect's return to  return undefined;
git checkout src/hooks/usePrefersReducedMotion.ts
```

Run after each: `npx vitest run src/hooks/usePrefersReducedMotion.dom.test.tsx`
Expected: the named test FAILS.

- [ ] **Step 4: Run the full gate**

Run: `npx vitest run && npm run lint && npm run typecheck && npm run build`
Expected: `Tests  250 passed (250)`, all clean.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/usePrefersReducedMotion.dom.test.tsx
git commit -m "Test that reduced motion is correct on the first paint

The hook reads matchMedia in the useState initialiser rather than the
effect, with a comment saying the first paint is already correct. That
was an unverified claim: moving the read into the effect would show one
animated frame to someone who asked for no animation, and nothing would
have failed.

Also covers the live subscription and the unmount cleanup, neither of
which the inert setup.ts stub can exercise — its addEventListener is a
vi.fn() that never fires."
```

---

### Task 3: `useReveal`

**Files:**
- Create: `src/hooks/useReveal.dom.test.tsx`
- Read for context: `src/hooks/useReveal.ts`

**Interfaces:**
- Consumes: `createIntersectionObserver` from `src/test/doubles` (Task 1).
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Write the test file**

```tsx
// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { renderHook, cleanup } from '@testing-library/react';
import { act } from 'react';
import { useReveal } from './useReveal';
import { createIntersectionObserver } from '../test/doubles';

let restore: (() => void) | undefined;

afterEach(() => {
  cleanup();
  restore?.();
  restore = undefined;
});

/** Renders the hook with its ref attached to a real element in the document. */
function renderReveal(threshold?: number) {
  const element = document.createElement('div');
  document.body.appendChild(element);

  const rendered = renderHook(() => {
    const reveal = threshold === undefined ? useReveal<HTMLDivElement>() : useReveal<HTMLDivElement>(threshold);
    // Attach synchronously during render so the effect sees a live ref.
    reveal.ref.current = element as HTMLDivElement;
    return reveal;
  });

  return { ...rendered, element };
}

describe('useReveal', () => {
  it('starts hidden', () => {
    const observer = createIntersectionObserver();
    restore = observer.install();

    const { result } = renderReveal();

    expect(result.current.isVisible).toBe(false);
  });

  it('becomes visible when the element intersects', () => {
    const observer = createIntersectionObserver();
    restore = observer.install();

    const { result, element } = renderReveal();

    act(() => {
      observer.trigger([{ isIntersecting: true, target: element }]);
    });

    expect(result.current.isVisible).toBe(true);
  });

  it('reveals once and stays revealed', () => {
    // The hook disconnects after the first intersection on purpose. If it kept
    // observing, scrolling a revealed section back out of view would hide it
    // again — content flickering on scroll-back. That is invisible in code
    // review and obvious to a visitor.
    const observer = createIntersectionObserver();
    restore = observer.install();

    const { result, element } = renderReveal();

    act(() => {
      observer.trigger([{ isIntersecting: true, target: element }]);
    });
    expect(observer.disconnectCount()).toBe(1);

    act(() => {
      observer.trigger([{ isIntersecting: false, target: element }]);
    });
    expect(result.current.isVisible).toBe(true);
  });

  it('passes its threshold through to the observer', () => {
    const observer = createIntersectionObserver();
    restore = observer.install();

    renderReveal(0.75);

    expect(observer.lastOptions()?.threshold).toBe(0.75);
  });

  it('disconnects on unmount even if it never intersected', () => {
    const observer = createIntersectionObserver();
    restore = observer.install();

    const { unmount } = renderReveal();
    expect(observer.disconnectCount()).toBe(0);

    unmount();

    expect(observer.disconnectCount()).toBe(1);
  });
});
```

- [ ] **Step 2: Run and confirm 5 passing**

Run: `npx vitest run src/hooks/useReveal.dom.test.tsx`
Expected: `Tests  5 passed (5)`

- [ ] **Step 3: Sabotage-verify**

```bash
# Break 1: remove reveal-once. Expect "reveals once and stays revealed" to FAIL
# on the disconnectCount assertion.
#   delete the  observer.disconnect();  line inside the callback
#
# Break 2: hardcode the threshold. Expect "passes its threshold through to the
# observer" to FAIL.
#   change  { threshold }  to  { threshold: 0.1 }
#
# Break 3: drop the cleanup. Expect "disconnects on unmount even if it never
# intersected" to FAIL.
#   change the effect's  return () => observer.disconnect();  to  return undefined;
git checkout src/hooks/useReveal.ts
```

Run after each: `npx vitest run src/hooks/useReveal.dom.test.tsx`
Expected: the named test FAILS.

- [ ] **Step 4: Run the full gate**

Run: `npx vitest run && npm run lint && npm run typecheck && npm run build`
Expected: `Tests  255 passed (255)`, all clean.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useReveal.dom.test.tsx
git commit -m "Pin useReveal's reveal-once contract

The hook disconnects its observer after the first intersection. If that
regressed, a revealed section scrolled back out of view would hide
again — a flicker that reads as fine in a diff and wrong on the page.

The IntersectionObserver stub in setup.ts records nothing and never
invokes its callback, so none of this was reachable before: a test
written against the default environment would report that the hook does
nothing, and pass."
```

---

### Task 4: `useActiveSection`

**Files:**
- Create: `src/hooks/useActiveSection.dom.test.tsx`
- Read for context: `src/hooks/useActiveSection.ts`

**Interfaces:**
- Consumes: `stubRect` from `src/test/doubles` (Task 1).
- Produces: nothing consumed by later tasks.

**Context the implementer needs:** `window.innerHeight` is `768` in this jsdom, and every real `getBoundingClientRect()` returns zeros. `stubRect(el, { top, bottom })` gives an element a fake box. The hook computes `visibleHeight = max(0, min(768, rect.bottom) - max(0, rect.top))` then `occupancy = visibleHeight / 768`, and only calls `setActiveSection` when `occupancy > 0.1`.

- [ ] **Step 1: Write the test file**

```tsx
// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { renderHook, cleanup } from '@testing-library/react';
import { act } from 'react';
import { useActiveSection, scrollToSection } from './useActiveSection';
import { stubRect } from '../test/doubles';

const IDS = ['home', 'about', 'projects'] as const;

afterEach(() => {
  cleanup();
  document.body.innerHTML = '';
  vi.restoreAllMocks();
  vi.useRealTimers();
});

/** Creates the three sections and gives each a fake layout box. */
function mountSections(boxes: Record<string, { top: number; bottom: number }>) {
  for (const id of IDS) {
    const section = document.createElement('section');
    section.id = id;
    document.body.appendChild(section);
    stubRect(section, boxes[id] ?? { top: 2000, bottom: 2100 });
  }
}

describe('useActiveSection', () => {
  it('starts on the first id before anything is measured', () => {
    // No sections in the document at all, so the mount pass finds nothing.
    const { result } = renderHook(() => useActiveSection(IDS));

    expect(result.current).toBe('home');
  });

  it('activates whichever section fills most of the viewport', () => {
    mountSections({
      home: { top: -700, bottom: 68 }, // 68px visible
      about: { top: 68, bottom: 768 }, // 700px visible — wins
    });

    const { result } = renderHook(() => useActiveSection(IDS));

    expect(result.current).toBe('about');
  });

  it('holds the last active section when nothing clears the threshold', () => {
    // Sub-threshold must not reset to the first id. Scrolling into a gap
    // between sections would otherwise snap the navbar highlight back to Home.
    mountSections({
      home: { top: -700, bottom: 68 },
      about: { top: 68, bottom: 768 },
    });

    const { result } = renderHook(() => useActiveSection(IDS));
    expect(result.current).toBe('about');

    // Move every section far off-screen: occupancy 0 for all of them.
    for (const id of IDS) {
      stubRect(document.getElementById(id)!, { top: 5000, bottom: 5100 });
    }
    act(() => {
      window.dispatchEvent(new Event('scroll'));
    });

    expect(result.current).toBe('about');
  });

  it('recomputes on scroll', () => {
    mountSections({
      home: { top: 0, bottom: 768 },
      about: { top: 768, bottom: 1536 },
    });

    const { result } = renderHook(() => useActiveSection(IDS));
    expect(result.current).toBe('home');

    stubRect(document.getElementById('home')!, { top: -768, bottom: 0 });
    stubRect(document.getElementById('about')!, { top: 0, bottom: 768 });
    act(() => {
      window.dispatchEvent(new Event('scroll'));
    });

    expect(result.current).toBe('about');
  });

  it('recomputes when the about section finishes a transition', () => {
    // About expands and collapses; its height change moves every section below
    // it without any scroll event firing.
    mountSections({
      home: { top: 0, bottom: 768 },
      about: { top: 768, bottom: 1536 },
    });

    const { result } = renderHook(() => useActiveSection(IDS));
    expect(result.current).toBe('home');

    stubRect(document.getElementById('home')!, { top: -768, bottom: 0 });
    stubRect(document.getElementById('about')!, { top: 0, bottom: 768 });
    act(() => {
      document.getElementById('about')!.dispatchEvent(new Event('transitionend'));
    });

    expect(result.current).toBe('about');
  });

  it('does nothing at all when disabled', () => {
    mountSections({ about: { top: 0, bottom: 768 } });
    const addSpy = vi.spyOn(window, 'addEventListener');

    const { result } = renderHook(() => useActiveSection(IDS, { enabled: false }));

    expect(result.current).toBe('home');
    expect(addSpy.mock.calls.filter(([type]) => type === 'scroll')).toHaveLength(0);
  });

  it('removes both listeners on unmount', () => {
    mountSections({ about: { top: 0, bottom: 768 } });
    const removeWindowSpy = vi.spyOn(window, 'removeEventListener');
    const about = document.getElementById('about')!;
    const removeAboutSpy = vi.spyOn(about, 'removeEventListener');

    const { unmount } = renderHook(() => useActiveSection(IDS));
    unmount();

    expect(removeWindowSpy.mock.calls.some(([type]) => type === 'scroll')).toBe(true);
    expect(removeAboutSpy.mock.calls.some(([type]) => type === 'transitionend')).toBe(true);
  });
});

describe('scrollToSection', () => {
  it('does nothing when the id is not on the page', () => {
    vi.useFakeTimers();
    const scrollSpy = vi.spyOn(Element.prototype, 'scrollIntoView');

    scrollToSection('does-not-exist');
    vi.runAllTimers();

    expect(scrollSpy).not.toHaveBeenCalled();
  });

  it('scrolls to the element, honouring reduced motion, after the timer', () => {
    // The setTimeout(…, 0) is load-bearing: it lets layout settle before the
    // scroll. Asserting before the timer runs proves the call really is
    // deferred rather than synchronous.
    vi.useFakeTimers();
    const target = document.createElement('section');
    target.id = 'projects';
    document.body.appendChild(target);
    const scrollSpy = vi.spyOn(Element.prototype, 'scrollIntoView');

    scrollToSection('projects');
    expect(scrollSpy).not.toHaveBeenCalled();

    vi.runAllTimers();

    expect(scrollSpy).toHaveBeenCalledTimes(1);
    expect(scrollSpy.mock.contexts).toContain(target);
    // setup.ts's matchMedia stub reports matches:false, so the behaviour
    // currentScrollBehavior() returns here is 'smooth'.
    expect(scrollSpy).toHaveBeenCalledWith({ behavior: 'smooth' });
  });
});
```

- [ ] **Step 2: Run and confirm 9 passing**

Run: `npx vitest run src/hooks/useActiveSection.dom.test.tsx`
Expected: `Tests  9 passed (9)`

- [ ] **Step 3: Sabotage-verify**

```bash
# Break 1: reset instead of hold. Expect "holds the last active section when
# nothing clears the threshold" to FAIL.
#   add an  else { setActiveSection(initialId); }  after the threshold check
#
# Break 2: ignore `enabled`. Expect "does nothing at all when disabled" to FAIL.
#   delete the  if (!enabled) { return; }  guard, and change the hook's return
#   to  return activeSection;
#
# Break 3: drop the transitionend listener. Expect "recomputes when the about
# section finishes a transition" to FAIL.
#   comment out  aboutSection.addEventListener('transitionend', updateActiveSection);
#
# Break 4: invert the comparison. Expect "activates whichever section fills most
# of the viewport" to FAIL.
#   change  if (occupancy > maxOccupancy)  to  if (occupancy < maxOccupancy)
git checkout src/hooks/useActiveSection.ts
```

Run after each: `npx vitest run src/hooks/useActiveSection.dom.test.tsx`
Expected: the named test FAILS.

- [ ] **Step 4: Run the full gate**

Run: `npx vitest run && npm run lint && npm run typecheck && npm run build`
Expected: `Tests  264 passed (264)`, all clean.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useActiveSection.dom.test.tsx
git commit -m "Cover the navbar's active-section logic

Ninety-two lines deciding which nav item is highlighted, previously
reached only by tests that render Navbar and never scroll.

The load-bearing case is the threshold: when no section clears 0.1
occupancy the hook deliberately holds its last answer rather than
resetting. Scrolling through a gap would otherwise snap the highlight
back to Home.

jsdom performs no layout, so every getBoundingClientRect returns zeros
and every occupancy computes as 0. Each test stubs boxes explicitly via
stubRect; without that the hook looks inert and the tests still pass."
```

---

### Task 5: `Footer` and `Hero`

**Files:**
- Create: `src/components/Footer.test.tsx`
- Create: `src/components/Hero.test.tsx`
- Read for context: `src/components/Footer.tsx`, `src/components/Hero.tsx`, `src/data/profile.ts`

**Interfaces:**
- Consumes: nothing from `src/test/doubles` — the global `setup.ts` stubs are correct for plain rendering.
- Produces: nothing consumed by later tasks.

**Context the implementer needs:** `Hero` calls `useLocation` and `useNavigate`, so it must be wrapped in `<MemoryRouter>`. Its CTAs are `<button type="button" onClick={...}>`, not anchors. `setup.ts` stubs `Element.prototype.scrollIntoView` as a `vi.fn()` whose `mock.contexts` records which element was scrolled — that is how the CTA test asserts the target.

- [ ] **Step 1: Write `src/components/Footer.test.tsx`**

```tsx
// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import Footer from './Footer';
import { EMAIL } from '../data/profile';

afterEach(cleanup);

describe('Footer', () => {
  it('shows the contact address from the single source of truth', () => {
    render(<Footer />);

    expect(screen.getByText(EMAIL)).toBeInTheDocument();
  });

  it('shows the current year', () => {
    render(<Footer />);

    const year = String(new Date().getFullYear());
    expect(screen.getByText(new RegExp(year))).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Write `src/components/Hero.test.tsx`**

```tsx
// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Hero from './Hero';
import { ACADEMIC_YEAR, GPA, INSTITUTION, LOCATION, PROGRAM } from '../data/profile';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const renderHero = () =>
  render(
    <MemoryRouter initialEntries={['/']}>
      <Hero />
    </MemoryRouter>,
  );

describe('Hero', () => {
  it('states the academic facts from src/data/profile.ts', () => {
    // The landing screen showed a stale "3rd Year [GPA: 3.23]" for a full
    // session after About was corrected, because the value was hardcoded in
    // two places. scripts/profile-drift.test.ts stops the literal coming back;
    // this proves the constants actually reach the page.
    renderHero();

    expect(screen.getByText(new RegExp(`${PROGRAM}, ${INSTITUTION}`))).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`${ACADEMIC_YEAR} \\[GPA: ${GPA}\\]`))).toBeInTheDocument();
    expect(screen.getByText(new RegExp(LOCATION))).toBeInTheDocument();
  });

  it('exposes exactly one top-level heading', () => {
    renderHero();

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('scrolls to the projects section when the primary call to action is used', async () => {
    // The CTAs are buttons with onClick handlers, not links — there is no href
    // to assert, so this asserts what the button is for.
    const target = document.createElement('section');
    target.id = 'projects';
    document.body.appendChild(target);

    renderHero();
    const scrollIntoView = target.scrollIntoView as unknown as ReturnType<typeof vi.fn>;

    await userEvent.click(screen.getByRole('button', { name: /view projects/i }));

    expect(scrollIntoView).toHaveBeenCalled();
    expect(scrollIntoView.mock.contexts).toContain(target);
    target.remove();
  });
});
```

- [ ] **Step 3: Run both and confirm 5 passing**

Run: `npx vitest run src/components/Footer.test.tsx src/components/Hero.test.tsx`
Expected: `Tests  5 passed (5)`

- [ ] **Step 4: Sabotage-verify**

```bash
# Break 1: hardcode the email. Expect "shows the contact address from the single
# source of truth" to FAIL.
#   in Footer.tsx change  {EMAIL}  to  ohm.wrong@example.com
#
# Break 2: hardcode the year. Expect "states the academic facts from
# src/data/profile.ts" to FAIL.
#   in Hero.tsx change  {ACADEMIC_YEAR}  to  3rd Year
#
# Break 3: point the CTA elsewhere. Expect "scrolls to the projects section when
# the primary call to action is used" to FAIL.
#   in Hero.tsx change  handleSectionClick('projects')  to  handleSectionClick('connect')
git checkout src/components/Footer.tsx src/components/Hero.tsx
```

Run after each: `npx vitest run src/components/Footer.test.tsx src/components/Hero.test.tsx`
Expected: the named test FAILS.

- [ ] **Step 5: Run the full gate**

Run: `npx vitest run && npm run lint && npm run typecheck && npm run build`
Expected: `Tests  269 passed (269)`, all clean.

- [ ] **Step 6: Commit**

```bash
git add src/components/Footer.test.tsx src/components/Hero.test.tsx
git commit -m "Render-test the two components nothing rendered

Footer was reached by no test at all — it mounts in App.tsx and no test
renders App. Hero was rendered by the landmark and a11y suites, which
assert its roles and never its content.

The Hero test is the render-side counterpart to the drift guard: the
source-level guard stops a GPA literal reappearing in a component, and
this proves the constants actually arrive on the page.

The spec called for asserting hrefs on the CTAs. They are buttons with
onClick handlers, so there are no hrefs; the test asserts what the
button does instead."
```

---

### Task 6: `Connect`

**Files:**
- Create: `src/components/Connect.test.tsx`
- Read for context: `src/components/Connect.tsx`, `src/hooks/useGitHubProfile.ts`, `src/data/profile.ts`

**Interfaces:**
- Consumes: nothing from `src/test/doubles`.
- Produces: nothing.

**Context the implementer needs:** `Connect` calls `useGitHubProfile(GITHUB_USERNAME)`, which returns `{ profile: GitHubProfile | null; isLoading: boolean }`. Without `vi.mock`, every run makes real requests to the GitHub API against a 60-per-hour unauthenticated limit. `CONTACT_LINKS` renders **twice** in the component (`Connect.tsx:105` and `Connect.tsx:176`), so use `getAllByRole('link')` — `getByRole` throws on multiple matches.

- [ ] **Step 1: Write the test file**

```tsx
// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import Connect from './Connect';
import {
  EMAIL_HREF,
  GITHUB_AVATAR_URL,
  GITHUB_PROFILE_URL,
  LINKEDIN_URL,
  PHONE_HREF,
} from '../data/profile';

const mockUseGitHubProfile = vi.fn();

// Without this the suite hits the real GitHub API on every run, against a
// 60-request-per-hour unauthenticated limit shared with local development.
vi.mock('../hooks/useGitHubProfile', () => ({
  useGitHubProfile: (username: string) => mockUseGitHubProfile(username),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const hrefs = () =>
  screen.getAllByRole('link').map((link) => link.getAttribute('href'));

describe('Connect with no GitHub data', () => {
  it('renders rather than crashing when the profile never arrives', () => {
    // CLAUDE.md states that a failed or malformed response renders blanks
    // rather than crashing, because every field is optional-chained. Nothing
    // tested that until now.
    mockUseGitHubProfile.mockReturnValue({ profile: null, isLoading: false });

    expect(() => render(<Connect />)).not.toThrow();
    expect(screen.getByRole('heading', { name: /connect/i })).toBeInTheDocument();
  });

  it('falls back to the derived avatar URL', () => {
    mockUseGitHubProfile.mockReturnValue({ profile: null, isLoading: false });

    render(<Connect />);

    const avatar = screen.getByAltText(/github avatar/i);
    expect(avatar).toHaveAttribute('src', GITHUB_AVATAR_URL);
  });

  it('still offers every way to make contact', () => {
    mockUseGitHubProfile.mockReturnValue({ profile: null, isLoading: false });

    render(<Connect />);

    const all = hrefs();
    expect(all).toContain(EMAIL_HREF);
    expect(all).toContain(PHONE_HREF);
    expect(all).toContain(GITHUB_PROFILE_URL);
    expect(all).toContain(LINKEDIN_URL);
  });
});

describe('Connect with GitHub data', () => {
  const PROFILE = {
    login: 'SupaOhm',
    avatarUrl: 'https://avatars.example/supaohm.png',
    profileUrl: 'https://github.com/SupaOhm',
    displayName: 'Supakorn Prayongyam',
    bio: 'Cybersecurity and AI/RAG systems.',
    location: 'Pathum Thani, Thailand',
    hireable: true,
    repositories: 24,
    followers: 12,
    totalStars: 30,
    sinceYear: 2022,
    updatedAt: '2026-08-01T00:00:00Z',
    topLanguage: 'TypeScript',
    mostStarredRepo: { name: 'AckLab', stars: 10, url: 'https://github.com/SupaOhm/AckLab' },
  };

  it('prefers the live avatar over the derived one', () => {
    mockUseGitHubProfile.mockReturnValue({ profile: PROFILE, isLoading: false });

    render(<Connect />);

    expect(screen.getByAltText(/github avatar/i)).toHaveAttribute('src', PROFILE.avatarUrl);
  });

  it('shows the fetched display name and bio', () => {
    mockUseGitHubProfile.mockReturnValue({ profile: PROFILE, isLoading: false });

    render(<Connect />);

    expect(screen.getByText(PROFILE.displayName)).toBeInTheDocument();
    expect(screen.getByText(PROFILE.bio)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run and confirm 5 passing**

Run: `npx vitest run src/components/Connect.test.tsx`
Expected: `Tests  5 passed (5)`

If `getByRole('heading', { name: /connect/i })` does not match, read the actual `<h2>` text in `Connect.tsx` and use that exact name — do not weaken the query to `getAllByRole('heading')[0]`.

- [ ] **Step 3: Confirm no network access**

Run: `npx vitest run src/components/Connect.test.tsx`
Expected: `mockUseGitHubProfile` is called; no request reaches the network. Verify by temporarily commenting out the `vi.mock` block and confirming the test output changes (the mock stops being called). Restore the block afterwards.

- [ ] **Step 4: Sabotage-verify**

```bash
# Break 1: remove the avatar fallback. Expect "falls back to the derived avatar
# URL" to FAIL.
#   change  src={githubStats?.avatarUrl ?? GITHUB_AVATAR_URL}  to  src={githubStats?.avatarUrl}
#
# Break 2: remove an optional chain so a null profile throws. Expect "renders
# rather than crashing when the profile never arrives" to FAIL.
#   change  githubStats?.displayName  to  githubStats.displayName
#
# Break 3: point a contact link at the wrong place. Expect "still offers every
# way to make contact" to FAIL.
#   in src/data/profile.ts change LINKEDIN_HANDLE to '/in/wrong'
git checkout src/components/Connect.tsx src/data/profile.ts
```

Run after each: `npx vitest run src/components/Connect.test.tsx`
Expected: the named test FAILS.

Note: Break 3 fails **exactly one** test — `scripts/discoverability.test.ts`'s
"links the same profiles the Connect section links". Measured, after this plan
was first written, which claimed three guards would fire. They do not, and the
reason is worth understanding rather than treating as a gap:

- `discoverability.test.ts` catches it because `index.html` hardcodes the
  literal profile URL in its JSON-LD. That hardcoded copy is an **independent
  value**, so a mismatch is detectable.
- `scripts/profile-drift.test.ts` does not, and should not. Its job is "no
  component hardcodes this literal", and that stays true when the constant
  changes.
- This task's own link test does not either: it asserts the rendered `href`
  equals `LINKEDIN_URL`, and both sides move together. Its job is "the constant
  reaches the DOM", not "the constant is correct".

Only a second, independently-authored copy of a value can catch that value being
wrong. There is exactly one such copy here, and exactly one test fires.

- [ ] **Step 5: Run the full gate**

Run: `npx vitest run && npm run lint && npm run typecheck && npm run build`
Expected: `Tests  274 passed (274)`, `Test Files  33 passed (33)`, lint clean, typecheck clean, build succeeds.

- [ ] **Step 6: Commit**

```bash
git add src/components/Connect.test.tsx
git commit -m "Test that Connect survives a failed GitHub response

CLAUDE.md claims a failed or malformed response renders blanks rather
than crashing, because every field is optional-chained. That claim was
never tested; removing a single ?. would have broken the section for
anyone hitting the 60-per-hour unauthenticated rate limit, and the suite
would have stayed green.

The hook is mocked rather than left live: unmocked, this suite issues
real GitHub API requests on every run, against the same rate limit the
component is trying to survive."
```

---

## Completion

After Task 6:

```bash
npx vitest run && npm run lint && npm run typecheck && npm run build
```

Expected: **274 tests across 33 files**, lint 0, typecheck 0, build succeeds.

Then use `superpowers:finishing-a-development-branch` to merge or open a PR for `feat/untested-units`.

## Known-bug protocol

If a test exposes a genuine defect, it does **not** get folded into these commits. Write the failing test, commit it separately with the fix, and say so in the message.

One candidate is already flagged and expected **not** to fire: `useActiveSection` lists `sectionIds` in its effect dependency array, so a caller passing an array literal would re-subscribe every render. `Navbar` passes a module-level constant, so it is stable today. `useReveal` has the same shape and was already checked — both call sites (`Skills.tsx:13`, `About.tsx:79`) pass no argument, so the default is a stable primitive. Neither is reachable; do not "fix" either one as part of this slice.

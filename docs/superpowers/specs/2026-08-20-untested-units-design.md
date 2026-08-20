# Slice F — Untested Units: hooks, lib, and three components

**Goal:** put real assertions under the seven source files that currently have
none, choosing each test by what would break for a visitor rather than by what
would move a coverage number.

No production behaviour changes as part of this slice. If a test exposes a real
bug, the fix lands as its own commit with the failing test first (see
*Bug handling* below).

---

## Measured current state (2026-08-20)

`npm test` is green at **242 tests across 26 files**. Seven source files have no
direct test:

| File | Lines | Reached indirectly by |
|---|---|---|
| `src/lib/scrollBehavior.ts` | 19 | called via `Navbar`, `Hero`, `useActiveSection`; no test asserts its return value |
| `src/hooks/usePrefersReducedMotion.ts` | 26 | used by 4 components and 2 hooks (`useTypewriter`, `useCursorGlow`); asserted by none |
| `src/hooks/useReveal.ts` | 31 | used by 2 components (`Skills`, `About`); asserted by none |
| `src/hooks/useActiveSection.ts` | 92 | `Navbar.test.tsx` renders `Navbar`, which calls it; no test drives scroll |
| `src/components/Hero.tsx` | 160 | `landmarks.test.tsx`, and `integration.a11y.test.tsx` via `Home` |
| `src/components/Connect.tsx` | 302 | `landmarks.test.tsx`, and `integration.a11y.test.tsx` via `Home` |
| `src/components/Footer.tsx` | 23 | nothing — it is mounted at `App.tsx:19`, and no test renders `App` |

"Reached indirectly" is doing very little work here. The landmark and a11y
integration tests assert that these components *render* and expose correct
roles. None of them asserts what the components or hooks actually *do* — and in
the case of `scrollBehavior`, the existing tests execute the function without
ever inspecting what it returns, which is the distinction this slice is about.

### The constraint that shapes this entire slice

`src/test/setup.ts` already stubs the three browser globals these files depend
on — and stubs all three **inert**, on purpose:

- `window.matchMedia` returns a fixed `matches: false`, and its
  `addEventListener` is a `vi.fn()` that never invokes the handler.
- `IntersectionObserver` is a class whose methods are empty. The file's own
  comment states the intent: *"The stub records nothing: no test in this project
  asserts reveal behaviour, only that the components render."*
- `Element.prototype.scrollIntoView` is a `vi.fn()`.

These stubs exist so component tests do not throw on mount, and they are correct
for that job. But they mean `usePrefersReducedMotion` can only ever observe
`false` and `useReveal` can never observe an intersection. A naively written
test for either would pass while asserting nothing — the worst possible
outcome, because it looks like coverage.

So the first design question is not *what to assert* but *where controllable
test doubles live*.

---

## Decisions

### D1. Controllable doubles live in a new `src/test/doubles.ts`

`setup.ts` is left byte-identical. The new module is imported explicitly, and
only by the new test files.

**Rejected — upgrading the global stubs in `setup.ts`.** It is the most
convenient option and the most dangerous one: it changes the environment
underneath 242 currently-passing tests in order to add 30 new ones. `setup.ts`
documents that existing tests depend on the present inert behaviour.

**Rejected — hand-rolling a fake inside each test file.** Zero blast radius, but
`usePrefersReducedMotion` and `useReveal` need the *same* fake shape, and two
hand-rolled copies are free to drift into disagreeing about what a
`MediaQueryListEvent` looks like.

The module exports:

- `createMatchMedia({ reduced })` — whose `setMatches(bool)` invokes every
  registered `change` listener, and which records `removeEventListener` calls so
  unsubscription can be proven rather than assumed.
- `createIntersectionObserver()` — captures the constructor callback **and its
  options**, so `threshold` is assertable; exposes `trigger(entries)`; records
  `observe` and `disconnect` calls.

**Probed, not assumed:** in this jsdom version both `MediaQueryListEvent` and
`IntersectionObserverEntry` are `undefined` — neither global constructor exists.
So the doubles cannot construct or `dispatchEvent` a real event. `setMatches`
and `trigger` must call the registered listeners **directly**, passing a minimal
object literal (`{ matches, media }` / the entry fields the hook reads) cast to
the DOM type. `usePrefersReducedMotion` types its handler as
`(event: MediaQueryListEvent) => void`, so this cast is required to typecheck,
not optional. An implementer who writes `new MediaQueryListEvent('change')`
because it is the obvious thing will get a `ReferenceError`.

Both install and restore per test. **Restore puts back the original `setup.ts`
stub rather than deleting the global** — deleting it would break any later test
in the same file that renders a component.

### D2. `scrollBehavior` is tested in the `node` environment, not jsdom

The function's first branch is `typeof window === 'undefined'`. Under jsdom that
branch is unreachable without faking the absence of `window`, which tests the
fake rather than the code. The project's default environment is already `node`,
so the SSR branch is exercised against a genuinely absent `window`, and the two
`matchMedia` branches are covered by stubbing `globalThis.window` with a minimal
object.

This file also asserts the **exact media query string**. A typo there never
matches anything, so reduced-motion silently stops working site-wide while every
existing test stays green — a failure with no other detector.

### D3. `useActiveSection` tests must stub `getBoundingClientRect`

The hook decides the active section entirely from rect geometry against
`window.innerHeight`. Probed values: jsdom reports `window.innerHeight` as
**768** (a usable denominator) but every `getBoundingClientRect()` returns
**all zeros**. So without stubbing, every section computes an occupancy of `0`,
the `> 0.1` threshold never passes, and the hook appears to do nothing while
its tests pass. `getBoundingClientRect` is `writable: true` on
`Element.prototype`, so per-element stubbing works; each test in this file does
it. This is the most expensive file in the slice and the
reason its estimate is roughly double the others'.

### D4. `Connect` mocks `useGitHubProfile`

`Connect` calls the hook on mount. Without `vi.mock`, the suite issues real
requests to the public GitHub API — against a 60 requests/hour/IP unauthenticated
limit, from a test suite that runs on every change.

---

## Scope

Eight files: one new test-double module and seven new test files, for a total of
**31 tests**.

### `src/test/doubles.ts` (new module, no tests of its own)

Per D1.

### `src/lib/scrollBehavior.test.ts` — node environment, 4 tests

1. Returns `'smooth'` when `window` is undefined (SSR safety).
2. Returns `'auto'` when the reduced-motion query matches.
3. Returns `'smooth'` when it does not match.
4. Queries the exact string `(prefers-reduced-motion: reduce)`.

### `src/hooks/usePrefersReducedMotion.dom.test.tsx` — 4 tests

1. Returns `true` on the **first** render when the query already matches. The
   file claims "the very first paint is already correct"; this proves the
   `useState` initialiser rather than trusting the comment.
2. Returns `false` on first render when it does not match.
3. Flips live when a `change` event fires.
4. Removes its listener on unmount.

### `src/hooks/useReveal.dom.test.tsx` — 5 tests

1. `isVisible` is `false` before any intersection.
2. Becomes `true` when the observer callback reports an intersecting entry.
3. **Reveal-once:** the observer is disconnected after the first intersection,
   and `isVisible` stays `true` when a later non-intersecting entry arrives. If
   this regressed, revealed content would flicker on scroll-back — invisible in
   code review, obvious to a visitor.
4. Passes `threshold` through to the observer options.
5. Disconnects on unmount.

### `src/hooks/useActiveSection.dom.test.tsx` — 8 tests

1. Returns the first id in `sectionIds` before any scroll.
2. The section occupying the most viewport height becomes active.
3. Occupancy at or below the `0.1` threshold **leaves the previous value
   unchanged** — it holds rather than resetting to the first id.
4. `enabled: false` returns the initial id and registers no scroll listener.
5. Recomputes on `scroll`.
6. Recomputes on `transitionend` on `#about` (the expand/collapse case).
7. Removes both the scroll and the `transitionend` listener on unmount.
8. `scrollToSection`: a missing id is a no-op; an existing id calls
   `scrollIntoView` after the `setTimeout(…, 0)`, with the behaviour
   `currentScrollBehavior()` returned.

### `src/components/Footer.test.tsx` — 2 tests

1. Renders `EMAIL` from `src/data/profile.ts`.
2. Renders the current year.

### `src/components/Hero.test.tsx` — 3 tests

1. Renders the `profile.ts` values — a second net under the drift bug fixed in
   `8526b5b`, which shipped a stale "3rd Year" on the landing screen.
2. Exposes exactly one `h1`.
3. Call-to-action links have accessible names and non-empty `href`s.

### `src/components/Connect.test.tsx` — 5 tests

1. Renders without throwing when `useGitHubProfile` returns a null profile.
   `CLAUDE.md` asserts that "a failed or malformed response renders blanks
   rather than crashing"; nothing currently tests that claim.
2. Falls back to the avatar URL from `profile.ts` when the profile is null.
3. Renders the live values when the profile resolves.
4. Contact links carry the correct schemes: `mailto:`, `tel:`, `https:`.
5. Link hrefs equal the `profile.ts` constants — the render-level counterpart to
   the source-level guard added in `68242f3`.

---

## Bug handling

Tests pin today's behaviour first. Where a test reveals a genuine defect, the
fix is a **separate commit**, failing test first, so history shows what broke
and why.

One item is already flagged: `useActiveSection` lists `sectionIds` in its effect
dependency array. `Navbar` passes a module-level constant, so the reference is
stable and the effect does not re-subscribe today. A caller passing an array
literal would re-subscribe on every render. The slice pins the current
stable-reference expectation; if the re-subscribe proves reachable from real
call sites, it is fixed separately rather than folded in here.

`useReveal` has the same shape — `threshold` sits in its dependency array — but
it was checked and is **not** reachable: both call sites (`Skills.tsx:13`,
`About.tsx:79`) invoke `useReveal<HTMLElement>()` with no argument, so the
parameter default is a stable primitive. This is recorded so that nobody
"fixes" a non-problem, and so the fact is on file if a future caller passes a
threshold explicitly.

---

## Verification

Every new assertion is sabotage-verified: the thing it guards is deliberately
broken, the test is confirmed to fail, and the break is reverted. This is
existing project discipline — it caught a placeholder palette collision that the
suite could not, and it validated both drift guards added in `68242f3`.

Sabotage matters more than usual in this slice. Three of the seven files are
untestable against the default environment, so a test that forgets to install
its double passes vacuously. Sabotage is what distinguishes a real assertion
from one that is merely green.

The slice is complete when `npm test`, `npm run lint`, `npm run typecheck` and
`npm run build` are all clean, and every new assertion has been shown to fail
when its subject is broken.

---

## Out of scope

- **Coverage tooling and thresholds.** No `@vitest/coverage-v8`, no enforced
  floor. A threshold rewards tests that execute lines over tests that assert
  behaviour, and it is a gate that must then be kept green forever.
- **Snapshot tests**, and any assertion on Tailwind class strings. Both break on
  every restyle and catch nothing.
- **Changing `src/test/setup.ts`.** Per D1.
- **Refactoring the components under test.** `Connect.tsx` is 302 lines and
  could reasonably be split, but that is not what this slice is for.

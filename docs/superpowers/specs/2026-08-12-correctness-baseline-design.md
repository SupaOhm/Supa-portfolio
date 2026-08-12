# Correctness Baseline — Design

**Date:** 2026-08-12
**Branch:** `fix/correctness-baseline`
**Status:** Approved, ready for implementation planning

## Context

A seven-agent read-only audit of this repository produced a 15-item remediation queue
spanning five independent concerns. That queue was decomposed into five slices, each
getting its own spec → plan → implementation cycle:

| Slice | Contents |
|---|---|
| **A · Correctness baseline** *(this spec)* | Lint errors, dead code, CI, test infrastructure |
| B · Accessibility & motion | Reveal inversion, `prefers-reduced-motion`, keyboard traps, contrast |
| C · Performance | Image weight, rAF gating, GitHub fetch caching |
| D · Ship it | Host decision, deploy, SPA fallback, `<head>` metadata, OG image |
| E · Refactors & docs | `ProjectStatus` consolidation, `GitHubStatCard`, `CLAUDE.md` |

Slice A is first because the repo currently has **zero tests and a red lint baseline**.
Slices B, C, and E all involve real refactoring with nothing to catch regressions.
Slice A builds that safety net and requires no decisions mid-flight.

### Audit findings addressed by this slice

- `npm run lint` fails on clean `main`: 3 errors, 1 warning (confirmed by three independent agents)
- No test runner, test file, or testing dependency has ever been tracked
- No CI/CD of any kind (`ls .github` → no such directory)
- Dead CSS rules, dead exports, dead fields, dead assets
- Three class strings that compile to no CSS at all (verified against the built bundle)
- `.DS_Store` files copied into `dist/` by Vite's `publicDir` (verified by matching checksum)

### Explicitly out of scope

- **The three standalone routes** (`/about`, `/projects`, `/connect` at `src/App.tsx:15-17`).
  The audit flagged them as unreachable dead code, but deleting them is one of the two
  valid fixes for the SPA-404 problem. That decision belongs to Slice D, where the host
  choice lives. Removing them here would pre-commit that call.
- Everything else in slices B–E.

## 1. Sequencing

Approach: **characterize, then refactor under test.**

1. Vitest setup
2. Tests for the two already-pure, already-exported functions (no source changes needed)
3. Mechanical lint fixes + dead-code sweep
4. TDD the typewriter reducer, then extract
5. Extract and test the filter predicate
6. CI last, so it goes green on its first run

The two behavior-touching changes (typewriter extraction, filter extraction) happen only
after a test net exists. Rejected alternatives: clean-first (leaves the typewriter
extraction untested), CI-first (leaves a red badge on a public repo during a job search).

## 2. Typewriter extraction

### Current state

`src/components/Hero.tsx:56-80` drives three `useState` values (`displayedText`,
`currentWordIndex`, `isDeleting`) from one 25-line effect with four branches. The
word-advance branch calls `setIsDeleting` and `setCurrentWordIndex` **synchronously in the
effect body**, which is the cascading render flagged by `react-hooks/set-state-in-effect`.

### Target state

New module `src/hooks/useTypewriter.ts` exporting a pure reducer and a hook.

```ts
export type TypewriterPhase = 'typing' | 'deleting';

export type TypewriterState = {
  wordIndex: number;
  text: string;
  phase: TypewriterPhase;
};

export type TypewriterSpeeds = {
  typingMs: number;
  deletingMs: number;
  pauseMs: number;
};

export const DEFAULT_TYPEWRITER_SPEEDS: TypewriterSpeeds = {
  typingMs: 80,
  deletingMs: 50,
  pauseMs: 2000,
};

export function nextTypewriterState(
  state: TypewriterState,
  words: readonly string[],
  speeds?: TypewriterSpeeds,
): { state: TypewriterState; delayMs: number };
```

A `'pausing'` phase is deliberately **not** modelled. The pause is expressed as a longer
`delayMs` on the typing→deleting transition, which keeps the machine at two phases and
four transitions.

### Transitions

Let `word = words[state.wordIndex]`.

| # | Condition | Next state | `delayMs` |
|---|---|---|---|
| 1 | `phase === 'typing'` and `text === word` | `{ ...state, phase: 'deleting' }` | `pauseMs` (2000) |
| 2 | `phase === 'typing'` and `text !== word` | `{ ...state, text: word.slice(0, text.length + 1) }` | `typingMs` (80) |
| 3 | `phase === 'deleting'` and `text !== ''` | `{ ...state, text: word.slice(0, text.length - 1) }` | `deletingMs` (50) |
| 4 | `phase === 'deleting'` and `text === ''` | `{ wordIndex: (wordIndex + 1) % words.length, text: '', phase: 'typing' }` | `0` |

### Timing equivalence with current behaviour

This refactor must not change what the user sees. Two transitions were checked against
the existing implementation:

- **Full word → first character deleted.** Current: `setTimeout(2000)` sets `isDeleting`,
  a re-render occurs, then the deleting branch waits `50ms`. New: transition 1 waits
  2000, transition 3 waits 50. **2050 ms in both.**
- **Empty text → next word's first character.** Current: the advance is synchronous
  (0 ms), then the typing branch waits `80ms`. New: transition 4 waits 0, transition 2
  waits 80. **80 ms in both.**

### Why this removes the lint error structurally

Every `setState` now occurs inside a `setTimeout` callback. Nothing calls `setState`
synchronously in an effect body, so `react-hooks/set-state-in-effect` has nothing to flag —
the error is eliminated by construction rather than suppressed.

### Hook contract

```ts
export function useTypewriter(
  words: readonly string[],
  speeds?: TypewriterSpeeds,
): string;   // returns the currently displayed text
```

- Returns `''` and schedules nothing when `words.length === 0`.
- The effect destructures `speeds` into primitive values before the dependency array, so a
  caller passing an object literal does not cause the effect to re-subscribe every render.
  This matches the pattern already used correctly at `src/hooks/useActiveSection.ts:23`.
- `Hero.tsx` keeps its module-level `WORDS` constant and calls `useTypewriter(WORDS)`,
  dropping three `useState` declarations and the 25-line effect.

## 3. Test plan

**Runner:** Vitest, configured in the existing `vite.config.ts`. The config's
`defineConfig` import changes from `vite` to `vitest/config` so the `test` block
type-checks, with `environment: 'node'` and `include: ['src/**/*.test.{ts,tsx}']`. No
jsdom and no Testing Library — none of the four units below touch the DOM. Those get added
only when a component test genuinely needs them.

**Location:** colocated with source as `src/**/*.test.ts`.

**Stance:** these tests **characterize current behaviour**, they do not assert intended
behaviour. Three of the cases below cover undocumented behaviours this audit discovered.
If any turns out to be a bug, fixing it is a separate change against a now-failing test,
which is the correct order.

### 3.1 `nextTypewriterState` — `src/hooks/useTypewriter.test.ts`

- Typing advances exactly one character per call toward the target word
- Typing a complete word transitions to `deleting` with `delayMs === pauseMs`
- Deleting removes exactly one character per call with `delayMs === deletingMs`
- Deleting an empty string advances `wordIndex` and returns `delayMs === 0`
- `wordIndex` wraps from `words.length - 1` back to `0`
- A single-word array loops on itself without changing `wordIndex`
- Driving the reducer repeatedly reproduces the expected full text sequence for a
  two-word fixture

### 3.2 `getCarouselPosition` — `src/hooks/useCarousel.test.ts`

Currently at `src/hooks/useCarousel.ts:5-9`. Already exported and pure.

- Table-driven slot assignment for `total ∈ {1, 2, 3, 4, 5, 6}` at `current === 0`
- **The `total === 4` asymmetry:** slot `-2` is never filled while slot `2` is, so one
  neighbour renders at `opacity: 0` with no counterpart. `PROJECTS` holds 12 entries and a
  single two-category filter can land on 4, so this is reachable.
- Rotation invariance: `getCarouselPosition(i, c, n) === getCarouselPosition(i+1, c+1, n)`
- `total === 0` returns `null` (the `% 0 → NaN` path, currently safe only because
  `Projects.tsx:237` guards on `filteredProjects.length > 0`)

### 3.3 `fetchGitHubProfile` — `src/hooks/useGitHubProfile.test.ts`

Currently at `src/hooks/useGitHubProfile.ts:46`. Already exported. Tested by stubbing
global `fetch`; no network access.

- Non-ok user response rejects with `'Failed to fetch GitHub stats'`
- Non-ok repos response rejects with `'Failed to fetch GitHub repositories'`
- Empty repo array yields `totalStars === 0`, `mostStarredRepo === null`,
  `topLanguage === 'N/A'`
- **Stars tie → first repo wins.** `useGitHubProfile.ts:79` uses strict `>`, so an equal
  star count keeps the earlier repo. Undocumented today.
- Nullable field fallbacks apply: `name → login`, absent `bio` → `'No bio provided yet.'`,
  absent `location` → `'Not specified'`

### 3.4 `filterProjects` — `src/lib/filterProjects.test.ts`

Requires extraction. The predicate at `src/components/Projects.tsx:39-47` is inline in a
`useMemo`, so it cannot be reached without rendering. Extract it to a new leaf module
`src/lib/filterProjects.ts`:

```ts
export function filterProjects(
  projects: readonly Project[],
  categories: ReadonlySet<ProjectCategory>,
  statuses: ReadonlySet<ProjectStatus>,
): Project[];
```

The `useMemo` in `Projects.tsx` then calls it with identical arguments, preserving current
behaviour exactly.

**Why a new module rather than an export from `Projects.tsx`.** Exporting it from the
component file would work — the import chain (`react`, `ProjectCard`, `PROJECTS`,
`useCarousel`) touches no DOM at module scope, so a node-environment test can import it
today. But it makes the test transitively depend on React and the whole component tree,
and it breaks the moment any module in that chain gains a top-level DOM access. A leaf
module with no React dependency keeps the unit genuinely isolated. `src/lib/` is also the
natural home for the helpers Slice E will extract.

- Two empty sets return every project (empty means pass-all, not match-none)
- A single category returns the OR-subset within that group
- Category and status filters AND across groups
- **A project with no `status` is excluded whenever any status filter is active.**
  `status` is optional on the `Project` type (`src/types/project.ts:29`) and
  `Projects.tsx:43` requires `p.status != null`. Deliberate-looking, but undocumented.

## 4. Dead-code sweep

### Behaviour-neutral removals

| Item | Location |
|---|---|
| `.animate-fadeIn` (unused; `.animate-fade-in` is the one in use) | `src/index.css:20-22` |
| `.scrollbar-hide` and its `::-webkit-scrollbar` rule | `src/index.css:113-120` |
| `.perspective-container` (superseded by an inline `perspective: 2000px`) | `src/index.css:123-127` |
| `animate-in fade-in` class strings (plugin not installed; compile to nothing) | `src/components/Connect.tsx:203` |
| `text-md` class string (not a Tailwind token; compiles to nothing) | `src/components/Connect.tsx:273` |
| Commented-out Résumé/Transcript block (targets two PDFs that do not exist) | `src/components/Connect.tsx:372-396` |
| `ContactLink.description` field and its unreachable render branch (all four entries are `''`) | `src/components/Connect.tsx:19, 39, 50, 61, 72, 206-208` |
| `NAV_LINKS[].type` field (zero readers) | `src/components/Navbar.tsx:6-10` |
| `threshold` option (never supplied by its only caller) | `src/hooks/useActiveSection.ts:6` |
| Four unreferenced images: `db2.png`, `db3.jpg`, `lostfound2.png`, `nosleep2.jpg` | `public/images/projects/` |
| Three `.DS_Store` files | `public/`, `public/images/`, `public/images/projects/` |

Notes:

- `text-md` is **removed, not replaced**. It currently produces no CSS, so the span
  inherits its size; substituting `text-base` would change the rendered size. Choosing an
  explicit size is a visual decision for a later slice.
- The Résumé block is deleted rather than kept. Git history preserves it. Confirmed with
  the user, who has no PDF ready to commit. Leaving it risks it shipping as two live 404s
  if the comment is ever removed.

### One deliberate behaviour change

Adding the `group` class to the `InfoCard` root at `src/components/About.tsx:56`
**enables four icon hover animations that are currently broken and silent**. The compiled
selector is `.group:hover .group-hover\:scale-110`, which requires a `.group` ancestor that
does not exist, so the `group-hover:` utilities at `About.tsx:170, 199, 227, 278` never
match.

This is a one-word fix for a clearly intended effect, and it is included in this slice with
the user's approval. It is called out separately here because it is the only change in
Slice A that alters what a user sees.

## 5. Lint fixes

| Site | Rule | Fix |
|---|---|---|
| `src/components/Projects.tsx:68` | `@typescript-eslint/no-unused-expressions` | `next.has(cat) ? next.delete(cat) : next.add(cat)` → `if (next.has(cat)) { next.delete(cat); } else { next.add(cat); }` |
| `src/components/Projects.tsx:75` | same | same, for `selectedStatuses` |
| `src/components/Hero.tsx:65` | `react-hooks/set-state-in-effect` | Resolved structurally by §2 |
| `src/hooks/useReveal.ts:27` | `react-hooks/exhaustive-deps` | Capture `ref.current` into a local inside the effect; call `observer.disconnect()` unconditionally in cleanup |

The `useReveal` fix also resolves a real defect the audit found: React detaches refs during
the mutation phase, before passive-effect cleanup runs, so `ref.current` is already `null`
at unmount, the `if (ref.current)` guard fails, and `unobserve` is **never called**.
Additionally, since this is a reveal-once pattern, the observer disconnects after the first
intersection rather than calling `setIsVisible(true)` on every subsequent one.

## 6. Tooling and CI

### `package.json`

```jsonc
"scripts": {
  "dev": "vite",
  "build": "tsc -b && vite build",
  "lint": "eslint .",
  "test": "vitest run",          // new
  "typecheck": "tsc -b --noEmit", // new
  "preview": "vite preview"
},
"engines": { "node": ">=20.19" }  // new
```

`engines` is set to `>=20.19` because that is Vite 7's actual floor. `README.md:54` claims
"Node 18+", which is wrong and would fail on a genuine Node 18; it is corrected to match.

### `.github/workflows/ci.yml`

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm test
      - run: npm run build
```

No matrix (one Node version is sufficient for a static site), no coverage gate, no artifact
upload, no release automation. `npm run build` already runs `tsc -b`, so type-checking is
covered transitively and needs no separate job.

Building in CI from a clean checkout also permanently resolves the `.DS_Store` leak, since
those files exist only on the author's machine.

**Not automated by this slice:** branch protection requiring the check to pass is a
repository setting, not a file. Enabling it is a manual step in GitHub's UI, noted here so
it is not forgotten.

## 7. Done criteria

Every item is objectively checkable:

1. `npm run lint` exits 0 with `0 problems`
2. `npm test` exits 0 with all tests passing
3. `npx tsc -b --noEmit` reports no errors
4. `npm run build` succeeds
5. `find dist -name '.DS_Store'` returns nothing after a clean build
6. `grep -rn "scrollbar-hide\|perspective-container\|animate-fadeIn\|animate-in\|text-md" src/` returns nothing
7. **Mutation check:** inverting `src/hooks/useCarousel.ts:7` from `raw > total / 2` to
   `raw >= total / 2` causes `npm test` to fail. This proves the suite actually bites
   rather than merely executing.
8. The Hero typewriter renders the same word cycle at the same cadence as before the
   refactor, verified by a manual pass through one complete word transition.

## 8. Risks

| Risk | Mitigation |
|---|---|
| Typewriter refactor changes visible cadence | Timing equivalence derived in §2 and verified manually per done-criterion 8; reducer tests pin every transition |
| Characterization tests lock in a bug as correct | Stated explicitly in §3 — the three undocumented behaviours are recorded as findings, and changing them is a separate, deliberate commit against a failing test |
| `group` fix alters the About section's appearance | Isolated to its own commit so it can be reverted independently |
| Filter predicate extraction changes filter results | `useMemo` calls the extracted function with identical arguments; tests cover all four semantic rules before the extraction lands |

# Correctness Baseline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give this repository an automated correctness signal — a green lint baseline, a test suite covering its four highest-risk pure units, and CI — then remove the dead code the audit found.

**Architecture:** Vitest runs in a `node` environment against pure functions only; no jsdom, no Testing Library, no component rendering. Two units are already pure and exported and get characterization tests with zero source changes. Two more (`filterProjects`, `nextTypewriterState`) are extracted from components under TDD, which is also what structurally eliminates the last lint error. CI runs lint → test → build on one Node version.

**Tech Stack:** React 19.2, TypeScript 5.9 (`strict: true`), Vite 7, Vitest, Tailwind CSS 3.4, ESLint 9 flat config, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-08-12-correctness-baseline-design.md`

## Global Constraints

- **Branch:** all work happens on `fix/correctness-baseline`. Do not commit to `main`.
- **Node floor:** `>=20.19` (Vite 7's actual requirement). CI uses Node `22`.
- **Test imports:** always import test helpers explicitly — `import { describe, it, expect, vi } from 'vitest'`. Do **not** enable Vitest globals. `eslint.config.js:20` sets `globals: globals.browser`, so bare `describe`/`it` would fail `no-undef`.
- **Test location:** colocated with source as `src/**/*.test.ts`.
- **No new `any`, no `@ts-ignore`.** The codebase currently has zero of both; keep it that way. Type assertions in test fixtures are acceptable only where noted.
- **Characterization stance:** tests in Tasks 1 and 2 record what the code *currently does*, not what it *should* do. Three of these behaviours are known oddities (documented in the spec). Do not "fix" them while writing tests.
- **Commit trailer:** every commit message in this plan ends with exactly these two lines:

  ```
  Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_018meF4mJ98mDwdbDbVqMe5U
  ```

  Each commit step below shows the full command including this block.

## File Structure

**Created:**

| Path | Responsibility |
|---|---|
| `src/hooks/useCarousel.test.ts` | Characterization tests for `getCarouselPosition` |
| `src/hooks/useGitHubProfile.test.ts` | Characterization tests for `fetchGitHubProfile` |
| `src/lib/filterProjects.ts` | Pure project filtering predicate — leaf module, no React import |
| `src/lib/filterProjects.test.ts` | Tests for the above |
| `src/hooks/useTypewriter.ts` | Pure typewriter reducer + the hook that drives it |
| `src/hooks/useTypewriter.test.ts` | Tests for the reducer |
| `.github/workflows/ci.yml` | Lint → test → build on push and PR |

**Modified:**

| Path | Change |
|---|---|
| `vite.config.ts` | Add Vitest `test` block |
| `package.json` | Add `test` + `typecheck` scripts, `engines`, `vitest` devDependency |
| `src/components/Projects.tsx` | Lint fixes; delegate filtering to `src/lib/filterProjects.ts` |
| `src/hooks/useReveal.ts` | Fix observer cleanup |
| `src/components/Hero.tsx` | Replace 3 `useState` + 25-line effect with `useTypewriter` |
| `src/components/Connect.tsx` | Remove dead classes, dead `description` field, commented résumé block |
| `src/components/Navbar.tsx` | Remove unread `type` field from `NAV_LINKS` |
| `src/components/About.tsx` | Add `group` class (the one deliberate visual change) |
| `src/hooks/useActiveSection.ts` | Remove never-supplied `threshold` option |
| `src/index.css` | Remove three unused utility rules |
| `README.md` | Correct the Node version claim and the "no test suite" line |

**Deleted:** 4 unreferenced images and 3 `.DS_Store` files under `public/`.

---

### Task 1: Vitest setup + characterize `getCarouselPosition`

Setup is folded in here because this is the first task whose deliverable needs it.

**Files:**
- Modify: `vite.config.ts`
- Modify: `package.json:6-11`
- Create: `src/hooks/useCarousel.test.ts`

**Interfaces:**
- Consumes: `getCarouselPosition(index: number, current: number, total: number): number | null` — already exported from `src/hooks/useCarousel.ts:5`
- Produces: a working `npm test` command that later tasks extend

- [ ] **Step 1: Install Vitest**

```bash
npm install -D vitest
```

- [ ] **Step 2: Add the Vitest config block**

Replace the entire contents of `vite.config.ts` with:

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,  // or host: '0.0.0.0'
    port: 5173,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
```

The `defineConfig` import moves from `vite` to `vitest/config` so the `test` key type-checks.

- [ ] **Step 3: Add the test script**

In `package.json`, replace the `"scripts"` block with:

```json
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "eslint .",
    "test": "vitest run",
    "preview": "vite preview"
  },
```

- [ ] **Step 4: Write the characterization test**

Create `src/hooks/useCarousel.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { getCarouselPosition } from './useCarousel';

/**
 * These tests CHARACTERIZE current behaviour. The `total === 4` case is
 * asymmetric (slot -2 is never filled while slot 2 is). That is recorded here
 * as an audit finding, not endorsed as correct. Changing it is a separate,
 * deliberate commit against a then-failing test.
 */
describe('getCarouselPosition', () => {
  const slotsFor = (total: number): Array<number | null> =>
    Array.from({ length: Math.max(total, 1) }, (_, i) => getCarouselPosition(i, 0, total));

  const SLOT_TABLE: Array<{ total: number; slots: Array<number | null> }> = [
    { total: 0, slots: [null] },
    { total: 1, slots: [0] },
    { total: 2, slots: [0, 1] },
    { total: 3, slots: [0, 1, -1] },
    { total: 4, slots: [0, 1, 2, -1] },
    { total: 5, slots: [0, 1, 2, -2, -1] },
    { total: 6, slots: [0, 1, 2, null, -2, -1] },
  ];

  for (const { total, slots } of SLOT_TABLE) {
    it(`assigns slots ${JSON.stringify(slots)} when total=${total}`, () => {
      expect(slotsFor(total)).toEqual(slots);
    });
  }

  it('leaves slot -2 empty at total=4 while slot 2 is filled (known asymmetry)', () => {
    const slots = slotsFor(4);
    expect(slots).toContain(2);
    expect(slots).not.toContain(-2);
  });

  it('returns null for total=0 rather than NaN leaking through', () => {
    expect(getCarouselPosition(0, 0, 0)).toBeNull();
  });

  it('is invariant under rotation of index and current together', () => {
    const total = 5;
    for (let index = 0; index < total; index += 1) {
      for (let current = 0; current < total; current += 1) {
        expect(getCarouselPosition(index, current, total)).toBe(
          getCarouselPosition((index + 1) % total, (current + 1) % total, total),
        );
      }
    }
  });
});
```

- [ ] **Step 5: Run the tests**

Run: `npm test`
Expected: PASS — 10 tests passing (7 table rows + 3 named cases), 0 failing.

- [ ] **Step 6: Prove the suite actually bites (mutation check)**

Temporarily change `src/hooks/useCarousel.ts:7` from `raw > total / 2` to `raw >= total / 2`.

Run: `npm test`
Expected: **FAIL** — the `total=2` and `total=4` rows should break.

Now revert that one-character change and re-run:

Run: `npm test`
Expected: PASS again.

Do not commit the mutation. This step exists to prove the tests are not vacuous.

- [ ] **Step 7: Commit**

```bash
git add vite.config.ts package.json package-lock.json src/hooks/useCarousel.test.ts
git commit -m "$(cat <<'EOF'
test: add Vitest and characterize getCarouselPosition

Records the current slot table for total 0-6, including the total=4
asymmetry where slot -2 is never filled while slot 2 is. Characterization
only - the asymmetry is an audit finding, not endorsed behaviour.

Verified non-vacuous: inverting the comparison at useCarousel.ts:7 to >=
fails the suite.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018meF4mJ98mDwdbDbVqMe5U
EOF
)"
```

---

### Task 2: Characterize `fetchGitHubProfile`

**Files:**
- Create: `src/hooks/useGitHubProfile.test.ts`

**Interfaces:**
- Consumes: `fetchGitHubProfile(username: string, signal?: AbortSignal): Promise<GitHubProfile>` — already exported from `src/hooks/useGitHubProfile.ts:46`. The `GitHubProfile` type is exported; the internal `GitHubUserResponse` / `GitHubRepoResponse` types are **not**, so fixtures below are plain object literals with no type annotation.
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Write the failing test**

Create `src/hooks/useGitHubProfile.test.ts`:

```ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchGitHubProfile } from './useGitHubProfile';

/**
 * CHARACTERIZATION tests. The stars-tie case records that the first repo wins
 * (useGitHubProfile.ts:79 uses strict `>`), which is currently undocumented.
 *
 * Uses the real global Response so no type assertion is needed to fake it.
 */

const userBody = (overrides: Record<string, unknown> = {}) => ({
  login: 'testuser',
  avatar_url: 'https://example.com/avatar.png',
  html_url: 'https://github.com/testuser',
  name: 'Test User',
  bio: 'Builds things',
  location: 'Bangkok',
  hireable: true,
  public_repos: 7,
  followers: 42,
  repos_url: 'https://api.github.com/users/testuser/repos',
  created_at: '2020-03-15T00:00:00Z',
  updated_at: '2026-01-02T00:00:00Z',
  ...overrides,
});

const repo = (name: string, stars: number, language: string | null) => ({
  name,
  html_url: `https://github.com/testuser/${name}`,
  stargazers_count: stars,
  language,
});

const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });
const notOk = (status: number) => new Response('', { status });

/** Routes the user endpoint vs the repos endpoint by URL. */
const stubFetch = (userResponse: Response, reposResponse: Response) => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string | URL) =>
      String(url).includes('/repos') ? reposResponse : userResponse,
    ),
  );
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('fetchGitHubProfile', () => {
  it('rejects with a specific message when the user endpoint is not ok', async () => {
    stubFetch(notOk(403), ok([]));
    await expect(fetchGitHubProfile('testuser')).rejects.toThrow(
      'Failed to fetch GitHub stats',
    );
  });

  it('rejects with a different message when the repos endpoint is not ok', async () => {
    stubFetch(ok(userBody()), notOk(403));
    await expect(fetchGitHubProfile('testuser')).rejects.toThrow(
      'Failed to fetch GitHub repositories',
    );
  });

  it('returns zero/null/N-A for an account with no repositories', async () => {
    stubFetch(ok(userBody()), ok([]));
    const profile = await fetchGitHubProfile('testuser');
    expect(profile.totalStars).toBe(0);
    expect(profile.mostStarredRepo).toBeNull();
    expect(profile.topLanguage).toBe('N/A');
  });

  it('keeps the FIRST repo when star counts tie (strict > comparison)', async () => {
    stubFetch(
      ok(userBody()),
      ok([repo('alpha', 5, 'TypeScript'), repo('beta', 5, 'TypeScript')]),
    );
    const profile = await fetchGitHubProfile('testuser');
    expect(profile.mostStarredRepo?.name).toBe('alpha');
    expect(profile.totalStars).toBe(10);
  });

  it('picks the most frequent language and sums stars', async () => {
    stubFetch(
      ok(userBody()),
      ok([
        repo('a', 1, 'TypeScript'),
        repo('b', 4, 'Python'),
        repo('c', 2, 'TypeScript'),
        repo('d', 0, null),
      ]),
    );
    const profile = await fetchGitHubProfile('testuser');
    expect(profile.topLanguage).toBe('TypeScript');
    expect(profile.totalStars).toBe(7);
    expect(profile.mostStarredRepo?.name).toBe('b');
  });

  it('applies fallbacks for null name, bio and location', async () => {
    stubFetch(ok(userBody({ name: null, bio: null, location: null })), ok([]));
    const profile = await fetchGitHubProfile('testuser');
    expect(profile.displayName).toBe('testuser');
    expect(profile.bio).toBe('No bio provided yet.');
    expect(profile.location).toBe('Not specified');
  });

  it('derives sinceYear from created_at', async () => {
    stubFetch(ok(userBody({ created_at: '2019-11-01T00:00:00Z' })), ok([]));
    const profile = await fetchGitHubProfile('testuser');
    expect(profile.sinceYear).toBe(2019);
  });
});
```

- [ ] **Step 2: Run the tests**

Run: `npm test`
Expected: PASS — 7 new tests, 17 total across both files.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useGitHubProfile.test.ts
git commit -m "$(cat <<'EOF'
test: characterize fetchGitHubProfile error and edge branches

Covers both non-ok paths with their distinct messages, the empty-repo
case, null-field fallbacks, and the undocumented stars-tie rule where
useGitHubProfile.ts:79's strict > keeps the earlier repo.

Stubs global fetch with real Response objects, so no type assertion is
needed and no network access occurs.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018meF4mJ98mDwdbDbVqMe5U
EOF
)"
```

---

### Task 3: Mechanical lint fixes

**Files:**
- Modify: `src/components/Projects.tsx:65-78`
- Modify: `src/hooks/useReveal.ts:9-29`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: lint error count drops from 3 to 1. The remaining error is `Hero.tsx:65`, resolved in Task 6.

- [ ] **Step 1: Confirm the current lint baseline**

Run: `npm run lint`
Expected: FAIL — `✖ 4 problems (3 errors, 1 warning)` at `Hero.tsx:65`, `Projects.tsx:68`, `Projects.tsx:75`, `useReveal.ts:27`.

- [ ] **Step 2: Fix both unused-expression errors**

In `src/components/Projects.tsx`, replace this block:

```ts
  const toggleCategory = (cat: ProjectCategory) =>
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });

  const toggleStatus = (st: ProjectStatus) =>
    setSelectedStatuses((prev) => {
      const next = new Set(prev);
      next.has(st) ? next.delete(st) : next.add(st);
      return next;
    });
```

with:

```ts
  const toggleCategory = (cat: ProjectCategory) =>
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) {
        next.delete(cat);
      } else {
        next.add(cat);
      }
      return next;
    });

  const toggleStatus = (st: ProjectStatus) =>
    setSelectedStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(st)) {
        next.delete(st);
      } else {
        next.add(st);
      }
      return next;
    });
```

- [ ] **Step 3: Fix the observer cleanup**

In `src/hooks/useReveal.ts`, replace the entire `useEffect` block:

```ts
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
          }
        });
      },
      { threshold }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, [threshold]);
```

with:

```ts
  useEffect(() => {
    const element = ref.current;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setIsVisible(true);
          // Reveal-once: stop observing after the first intersection.
          observer.disconnect();
        }
      },
      { threshold }
    );

    if (element) {
      observer.observe(element);
    }

    return () => observer.disconnect();
  }, [threshold]);
```

Two defects fixed at once. React detaches refs during the mutation phase, *before* passive-effect cleanup runs, so the old `if (ref.current)` guard was always false at unmount and `unobserve` was never called. Capturing `element` inside the effect fixes that. `disconnect()` is also used instead of `unobserve()` because it needs no element reference and correctly tears down the whole observer.

- [ ] **Step 4: Verify the lint count dropped**

Run: `npm run lint`
Expected: FAIL, but now `✖ 1 problem (1 error, 0 warnings)` — only `Hero.tsx:65 react-hooks/set-state-in-effect` remains.

- [ ] **Step 5: Verify nothing else broke**

Run: `npm test && npx tsc -b --noEmit`
Expected: tests PASS, `tsc` reports no errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/Projects.tsx src/hooks/useReveal.ts
git commit -m "$(cat <<'EOF'
fix: resolve unused-expression and observer-cleanup lint errors

Projects.tsx: the ternary-as-statement in both toggle handlers becomes a
plain if/else, which also stops hiding the Set mutation.

useReveal.ts: captures ref.current into a local inside the effect and
calls observer.disconnect() unconditionally. React detaches refs before
passive-effect cleanup runs, so the old guard was always false at unmount
and unobserve() never fired. Also disconnects after the first
intersection, since this is a reveal-once pattern.

Lint drops from 3 errors + 1 warning to 1 error. The remaining error at
Hero.tsx:65 is resolved by the useTypewriter extraction.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018meF4mJ98mDwdbDbVqMe5U
EOF
)"
```

---

### Task 4: Extract and test `filterProjects`

**Files:**
- Create: `src/lib/filterProjects.ts`
- Create: `src/lib/filterProjects.test.ts`
- Modify: `src/components/Projects.tsx:1-10` (imports) and `:39-47` (the `useMemo`)

**Interfaces:**
- Consumes: `Project`, `ProjectCategory`, `ProjectStatus` from `src/types/project.ts`.
- Produces: `filterProjects(projects: readonly Project[], categories: ReadonlySet<ProjectCategory>, statuses: ReadonlySet<ProjectStatus>): Project[]`

- [ ] **Step 1: Write the failing test**

Create `src/lib/filterProjects.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { filterProjects } from './filterProjects';
import type { Project, ProjectCategory, ProjectStatus } from '../types/project';

/**
 * Uses its own fixture rather than importing PROJECTS, for two reasons:
 * the tests stay stable as real project data changes, and all 12 current
 * PROJECTS entries supply a `status`, so the status-less rule below has no
 * real-world example to exercise it.
 */
const FIXTURE: Project[] = [
  {
    id: '1',
    title: 'Web Completed',
    description: '',
    tags: [],
    categories: ['Web'],
    status: 'completed',
  },
  {
    id: '2',
    title: 'Mobile In Progress',
    description: '',
    tags: [],
    categories: ['Mobile'],
    status: 'in-progress',
  },
  {
    id: '3',
    title: 'Web And Backend Planned',
    description: '',
    tags: [],
    categories: ['Web', 'Backend'],
    status: 'planned',
  },
  {
    id: '4',
    title: 'Tools No Status',
    description: '',
    tags: [],
    categories: ['Tools'],
    // deliberately no `status` - the Project type marks it optional
  },
];

const cats = (...values: ProjectCategory[]) => new Set<ProjectCategory>(values);
const stats = (...values: ProjectStatus[]) => new Set<ProjectStatus>(values);
const titles = (result: Project[]) => result.map((p) => p.title);

describe('filterProjects', () => {
  it('returns every project when both filter sets are empty', () => {
    expect(filterProjects(FIXTURE, cats(), stats())).toHaveLength(4);
  });

  it('matches a project if ANY of its categories is selected', () => {
    expect(titles(filterProjects(FIXTURE, cats('Web'), stats()))).toEqual([
      'Web Completed',
      'Web And Backend Planned',
    ]);
  });

  it('ORs within the category group', () => {
    expect(titles(filterProjects(FIXTURE, cats('Mobile', 'Tools'), stats()))).toEqual([
      'Mobile In Progress',
      'Tools No Status',
    ]);
  });

  it('ORs within the status group', () => {
    expect(titles(filterProjects(FIXTURE, cats(), stats('completed', 'planned')))).toEqual([
      'Web Completed',
      'Web And Backend Planned',
    ]);
  });

  it('ANDs across the category and status groups', () => {
    expect(titles(filterProjects(FIXTURE, cats('Web'), stats('planned')))).toEqual([
      'Web And Backend Planned',
    ]);
  });

  it('EXCLUDES a project with no status whenever any status filter is active', () => {
    // The status-less project is returned when no status filter is set...
    expect(titles(filterProjects(FIXTURE, cats('Tools'), stats()))).toEqual([
      'Tools No Status',
    ]);
    // ...but disappears as soon as one is, for every possible status value.
    expect(filterProjects(FIXTURE, cats('Tools'), stats('completed'))).toEqual([]);
    expect(filterProjects(FIXTURE, cats('Tools'), stats('in-progress'))).toEqual([]);
    expect(filterProjects(FIXTURE, cats('Tools'), stats('planned'))).toEqual([]);
  });

  it('returns an empty array when nothing matches', () => {
    expect(filterProjects(FIXTURE, cats('Security'), stats())).toEqual([]);
  });

  it('does not mutate the input array', () => {
    const copy = [...FIXTURE];
    filterProjects(FIXTURE, cats('Web'), stats());
    expect(FIXTURE).toEqual(copy);
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npm test`
Expected: FAIL — `Failed to resolve import "./filterProjects"`, because the module does not exist yet.

- [ ] **Step 3: Create the module**

Create `src/lib/filterProjects.ts`:

```ts
import type { Project, ProjectCategory, ProjectStatus } from '../types/project';

/**
 * Filters projects by category and status.
 *
 * An empty set means "no filter applied" (pass everything), NOT "match
 * nothing". Values OR together within each group and the two groups AND
 * together. A project without a `status` is excluded whenever any status
 * filter is active, because `status` is optional on the Project type.
 */
export function filterProjects(
  projects: readonly Project[],
  categories: ReadonlySet<ProjectCategory>,
  statuses: ReadonlySet<ProjectStatus>,
): Project[] {
  return projects.filter((project) => {
    const categoryOk =
      categories.size === 0 || project.categories.some((c) => categories.has(c));
    const statusOk =
      statuses.size === 0 || (project.status != null && statuses.has(project.status));
    return categoryOk && statusOk;
  });
}
```

- [ ] **Step 4: Run the tests**

Run: `npm test`
Expected: PASS — 8 new tests, 25 total.

- [ ] **Step 5: Wire it into the component**

In `src/components/Projects.tsx`, add this import directly after the `useCarousel` import on line 10:

```ts
import { filterProjects } from '../lib/filterProjects';
```

Then replace the `useMemo` block:

```ts
  const filteredProjects = useMemo(
    () =>
      PROJECTS.filter((p) => {
        const catOk = selectedCategories.size === 0 || p.categories.some((c) => selectedCategories.has(c));
        const stOk = selectedStatuses.size === 0 || (p.status != null && selectedStatuses.has(p.status));
        return catOk && stOk;
      }),
    [selectedCategories, selectedStatuses],
  );
```

with:

```ts
  const filteredProjects = useMemo(
    () => filterProjects(PROJECTS, selectedCategories, selectedStatuses),
    [selectedCategories, selectedStatuses],
  );
```

- [ ] **Step 6: Verify everything still passes**

Run: `npm test && npm run lint && npx tsc -b --noEmit`
Expected: tests PASS (25), lint still `✖ 1 problem (1 error, 0 warnings)`, `tsc` no errors.

- [ ] **Step 7: Commit**

```bash
git add src/lib/filterProjects.ts src/lib/filterProjects.test.ts src/components/Projects.tsx
git commit -m "$(cat <<'EOF'
refactor: extract filterProjects into a testable leaf module

Moves the predicate out of the useMemo in Projects.tsx, where it could
not be reached without rendering. src/lib/ keeps it free of any React
dependency so its test imports a leaf, not the component tree.

Pins all four semantic rules, including that a status-less project is
excluded whenever any status filter is active. That branch has no
coverage from real data - all 12 PROJECTS entries supply a status - so
the test builds its own fixture.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018meF4mJ98mDwdbDbVqMe5U
EOF
)"
```

---

### Task 5: Build the typewriter reducer under TDD

**Files:**
- Create: `src/hooks/useTypewriter.ts` (reducer only; the hook lands in Task 6)
- Create: `src/hooks/useTypewriter.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces, all exported from `src/hooks/useTypewriter.ts`:
  - `type TypewriterPhase = 'typing' | 'deleting'`
  - `type TypewriterState = { wordIndex: number; text: string; phase: TypewriterPhase }`
  - `type TypewriterSpeeds = { typingMs: number; deletingMs: number; pauseMs: number }`
  - `const DEFAULT_TYPEWRITER_SPEEDS: TypewriterSpeeds`
  - `const INITIAL_TYPEWRITER_STATE: TypewriterState`
  - `function nextTypewriterState(state, words, speeds?): { state: TypewriterState; delayMs: number }`

- [ ] **Step 1: Write the failing test**

Create `src/hooks/useTypewriter.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  nextTypewriterState,
  DEFAULT_TYPEWRITER_SPEEDS,
  type TypewriterState,
} from './useTypewriter';

const WORDS = ['ab', 'cd'] as const;

const state = (
  wordIndex: number,
  text: string,
  phase: TypewriterState['phase'],
): TypewriterState => ({ wordIndex, text, phase });

describe('nextTypewriterState', () => {
  it('types one character at a time toward the target word', () => {
    const first = nextTypewriterState(state(0, '', 'typing'), WORDS);
    expect(first.state).toEqual(state(0, 'a', 'typing'));
    expect(first.delayMs).toBe(DEFAULT_TYPEWRITER_SPEEDS.typingMs);

    const second = nextTypewriterState(first.state, WORDS);
    expect(second.state).toEqual(state(0, 'ab', 'typing'));
    expect(second.delayMs).toBe(DEFAULT_TYPEWRITER_SPEEDS.typingMs);
  });

  it('switches to deleting after a pause once the word is complete', () => {
    const result = nextTypewriterState(state(0, 'ab', 'typing'), WORDS);
    expect(result.state).toEqual(state(0, 'ab', 'deleting'));
    expect(result.delayMs).toBe(DEFAULT_TYPEWRITER_SPEEDS.pauseMs);
  });

  it('deletes one character at a time', () => {
    const result = nextTypewriterState(state(0, 'ab', 'deleting'), WORDS);
    expect(result.state).toEqual(state(0, 'a', 'deleting'));
    expect(result.delayMs).toBe(DEFAULT_TYPEWRITER_SPEEDS.deletingMs);
  });

  it('advances to the next word with no delay once the text is empty', () => {
    const result = nextTypewriterState(state(0, '', 'deleting'), WORDS);
    expect(result.state).toEqual(state(1, '', 'typing'));
    expect(result.delayMs).toBe(0);
  });

  it('wraps from the last word back to the first', () => {
    const result = nextTypewriterState(state(1, '', 'deleting'), WORDS);
    expect(result.state.wordIndex).toBe(0);
  });

  it('loops on itself for a single-word list', () => {
    const result = nextTypewriterState(state(0, '', 'deleting'), ['solo']);
    expect(result.state.wordIndex).toBe(0);
  });

  it('honours custom speeds', () => {
    const speeds = { typingMs: 5, deletingMs: 6, pauseMs: 7 };
    expect(nextTypewriterState(state(0, '', 'typing'), WORDS, speeds).delayMs).toBe(5);
    expect(nextTypewriterState(state(0, 'ab', 'deleting'), WORDS, speeds).delayMs).toBe(6);
    expect(nextTypewriterState(state(0, 'ab', 'typing'), WORDS, speeds).delayMs).toBe(7);
  });

  it('returns the state unchanged for an empty word list', () => {
    const start = state(0, '', 'typing');
    const result = nextTypewriterState(start, []);
    expect(result.state).toEqual(start);
    expect(result.delayMs).toBe(0);
  });

  it('reproduces the full two-word cycle and returns to the start', () => {
    let current = state(0, '', 'typing');
    const seen: string[] = [];

    for (let step = 0; step < 12; step += 1) {
      current = nextTypewriterState(current, WORDS).state;
      seen.push(`${current.phase}:${current.wordIndex}:${current.text}`);
    }

    expect(seen).toEqual([
      'typing:0:a',
      'typing:0:ab',
      'deleting:0:ab',
      'deleting:0:a',
      'deleting:0:',
      'typing:1:',
      'typing:1:c',
      'typing:1:cd',
      'deleting:1:cd',
      'deleting:1:c',
      'deleting:1:',
      'typing:0:',
    ]);
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npm test`
Expected: FAIL — `Failed to resolve import "./useTypewriter"`.

- [ ] **Step 3: Write the reducer**

Create `src/hooks/useTypewriter.ts`:

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

export const INITIAL_TYPEWRITER_STATE: TypewriterState = {
  wordIndex: 0,
  text: '',
  phase: 'typing',
};

/**
 * Pure transition for the hero typewriter. Returns the next state and how long
 * to wait before applying it.
 *
 * There is deliberately no 'pausing' phase: the pause between finishing a word
 * and starting to delete it is expressed as a longer delay on the
 * typing -> deleting transition, which keeps this at two phases.
 */
export function nextTypewriterState(
  state: TypewriterState,
  words: readonly string[],
  speeds: TypewriterSpeeds = DEFAULT_TYPEWRITER_SPEEDS,
): { state: TypewriterState; delayMs: number } {
  if (words.length === 0) {
    return { state, delayMs: 0 };
  }

  const word = words[state.wordIndex] ?? '';

  if (state.phase === 'typing') {
    if (state.text === word) {
      return { state: { ...state, phase: 'deleting' }, delayMs: speeds.pauseMs };
    }
    return {
      state: { ...state, text: word.slice(0, state.text.length + 1) },
      delayMs: speeds.typingMs,
    };
  }

  if (state.text === '') {
    return {
      state: {
        wordIndex: (state.wordIndex + 1) % words.length,
        text: '',
        phase: 'typing',
      },
      delayMs: 0,
    };
  }

  return {
    state: { ...state, text: word.slice(0, state.text.length - 1) },
    delayMs: speeds.deletingMs,
  };
}
```

- [ ] **Step 4: Run the tests**

Run: `npm test`
Expected: PASS — 9 new tests, 34 total.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useTypewriter.ts src/hooks/useTypewriter.test.ts
git commit -m "$(cat <<'EOF'
feat: add pure typewriter state machine

Two phases and four transitions, with the inter-word pause expressed as a
longer delay on typing -> deleting rather than a third phase.

Timing is equivalent to the effect currently in Hero.tsx: full word to
first deleted character is 2000 + 50 = 2050ms in both, and empty text to
the next word's first character is 0 + 80 = 80ms in both.

Not yet wired into Hero - that lands next.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018meF4mJ98mDwdbDbVqMe5U
EOF
)"
```

---

### Task 6: Add the hook and wire it into Hero

This is the task that takes lint to zero.

**Files:**
- Modify: `src/hooks/useTypewriter.ts` (append the hook)
- Modify: `src/components/Hero.tsx:1` (imports), `:15-17` (state), `:56-80` (the effect)

**Interfaces:**
- Consumes: everything Task 5 produced.
- Produces: `useTypewriter(words: readonly string[], speeds?: TypewriterSpeeds): string`

- [ ] **Step 1: Append the hook to `src/hooks/useTypewriter.ts`**

Add this import as the **first line** of the file:

```ts
import { useEffect, useState } from 'react';
```

Then append at the end of the file:

```ts
/**
 * Drives `nextTypewriterState` on a timer and returns the text to display.
 *
 * Every state update happens inside a setTimeout callback, never synchronously
 * in the effect body, which is what keeps react-hooks/set-state-in-effect
 * satisfied by construction.
 *
 * `speeds` is destructured to primitives before the dependency array so a
 * caller passing an object literal does not re-subscribe the effect on every
 * render. `words` must be a stable reference - define it at module scope.
 */
export function useTypewriter(
  words: readonly string[],
  speeds: TypewriterSpeeds = DEFAULT_TYPEWRITER_SPEEDS,
): string {
  const [state, setState] = useState<TypewriterState>(INITIAL_TYPEWRITER_STATE);
  const { typingMs, deletingMs, pauseMs } = speeds;

  useEffect(() => {
    if (words.length === 0) {
      return;
    }

    const { state: next, delayMs } = nextTypewriterState(state, words, {
      typingMs,
      deletingMs,
      pauseMs,
    });

    const timeout = setTimeout(() => setState(next), delayMs);
    return () => clearTimeout(timeout);
  }, [state, words, typingMs, deletingMs, pauseMs]);

  return state.text;
}
```

- [ ] **Step 2: Update Hero's imports**

In `src/components/Hero.tsx`, add this import directly after the `react-router-dom` import on line 2:

```ts
import { useTypewriter } from '../hooks/useTypewriter';
```

- [ ] **Step 3: Replace the three state declarations**

Replace these three lines (`Hero.tsx:15-17`):

```ts
  const [displayedText, setDisplayedText] = useState('');
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
```

with this single line:

```ts
  const displayedText = useTypewriter(WORDS);
```

- [ ] **Step 4: Delete the typewriter effect**

Remove this entire block from `src/components/Hero.tsx` (lines 56-80):

```ts
  useEffect(() => {
    const currentWord = WORDS[currentWordIndex];
    let timeout: number;

    if (!isDeleting && displayedText === currentWord) {
      // Finished typing
      timeout = setTimeout(() => setIsDeleting(true), pauseDuration);
    } else if (isDeleting && displayedText === '') {
      // Finished deleting
      setIsDeleting(false);
      setCurrentWordIndex((prev) => (prev + 1) % WORDS.length);
    } else if (isDeleting) {
      // Deleting
      timeout = setTimeout(() => {
        setDisplayedText(currentWord.substring(0, displayedText.length - 1));
      }, deletingSpeed);
    } else {
      // Typing
      timeout = setTimeout(() => {
        setDisplayedText(currentWord.substring(0, displayedText.length + 1));
      }, typingSpeed);
    }

    return () => clearTimeout(timeout);
  }, [displayedText, currentWordIndex, isDeleting]);
```

Also delete the three now-unused constants at `Hero.tsx:23-25`:

```ts
  const typingSpeed = 80;
  const deletingSpeed = 50;
  const pauseDuration = 2000;
```

Leave `WORDS` (line 5) and the render usage at line 136 untouched. Leave the mouse-tracking `useState`/`useEffect`/`useRef` alone — Slice C handles those.

- [ ] **Step 5: Verify lint is finally clean**

Run: `npm run lint`
Expected: **PASS, exit 0, no output.** This is the first time the repo has had a green lint baseline.

- [ ] **Step 6: Verify types and tests**

Run: `npm test && npx tsc -b --noEmit && npm run build`
Expected: 34 tests PASS, `tsc` no errors, build succeeds.

`noUnusedLocals` is on in `tsconfig.app.json:21`, so if any of `useState`, `useEffect`, or `useRef` became unused in Hero.tsx, `tsc` fails here and the unused name must be dropped from the line-1 import. At time of writing all three are still used by the mouse-tracking code.

- [ ] **Step 7: Manual behaviour check**

Run: `npm run dev` and open the printed local URL.

Watch the hero for one complete word transition and confirm:
1. Text types in one character at a time
2. It holds the complete word for roughly two seconds
3. It deletes one character at a time, faster than it typed
4. It advances to the next word and starts typing again
5. The blinking cursor still animates

Then stop the dev server. If cadence looks wrong, the reducer's `delayMs` values are the only place to look.

- [ ] **Step 8: Commit**

```bash
git add src/hooks/useTypewriter.ts src/components/Hero.tsx
git commit -m "$(cat <<'EOF'
refactor: drive the hero typewriter from useTypewriter

Replaces three useState declarations and a 25-line four-branch effect
with one hook call. All state updates now happen inside setTimeout
callbacks, so react-hooks/set-state-in-effect is satisfied structurally
rather than suppressed.

npm run lint now exits 0 for the first time.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018meF4mJ98mDwdbDbVqMe5U
EOF
)"
```

---

### Task 7: Dead-code sweep (behaviour-neutral)

Every removal here is invisible to users. The one change that *is* visible is isolated into Task 8.

**Files:**
- Modify: `src/index.css`, `src/components/Connect.tsx`, `src/components/Navbar.tsx`, `src/hooks/useActiveSection.ts`
- Delete: 4 images and 3 `.DS_Store` files under `public/`

**Interfaces:**
- Consumes: nothing.
- Produces: nothing. No signature changes except `useActiveSection`'s options type losing an unused field.

- [ ] **Step 1: Remove three unused CSS rules**

In `src/index.css`, delete this block (note it is `.animate-fadeIn`, **not** the `.animate-fade-in` directly above it, which IS used at `Hero.tsx:115`):

```css
  .animate-fadeIn {
    animation: fadeIn 0.6s ease-out forwards;
  }
```

Delete this block:

```css
  /* Hide scrollbar for carousel */
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
  
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
```

Delete this block:

```css
  /* 3D Carousel Perspective */
  .perspective-container {
    perspective: 2500px;
    perspective-origin: center center;
    transform-style: preserve-3d;
  }
```

Leave `@keyframes fadeIn` in place — `.animate-fade-in` and nine inline `style={{ animation: ... }}` call sites still use it.

- [ ] **Step 2: Remove two no-op class strings from Connect.tsx**

At `src/components/Connect.tsx:203`, replace:

```tsx
                  <div className="flex flex-col items-center gap-1 animate-in fade-in duration-300 relative z-10">
```

with:

```tsx
                  <div className="flex flex-col items-center gap-1 relative z-10">
```

`animate-in` and `fade-in` are `tailwindcss-animate` classes; that plugin is not installed and `tailwind.config.js` has `plugins: []`, so they compile to nothing today.

At `src/components/Connect.tsx:273`, replace:

```tsx
                  <span className="text-md font-semibold text-white">{link.name}</span>
```

with:

```tsx
                  <span className="font-semibold text-white">{link.name}</span>
```

`text-md` is not a Tailwind token (the scale is `text-sm` / `text-base` / `text-lg`), so it compiles to nothing and the span inherits its size. It is **removed, not replaced with `text-base`** — substituting a real size would change the rendered result.

- [ ] **Step 3: Remove the dead `description` field**

In `src/components/Connect.tsx`, delete line 19 from the `ContactLink` type:

```ts
  description?: string;
```

Delete all four `description: '',` lines from the `CONTACT_LINKS` entries (lines 39, 50, 61, 72).

Replace this block at lines 206-208:

```tsx
                    {link.description ? (
                      <span className="text-xs text-blue-50 text-center leading-tight">{link.description}</span>
                    ) : null}
```

with nothing (delete all three lines). The branch is unreachable — all four entries set `description` to the empty string.

- [ ] **Step 4: Remove the commented-out résumé block**

In `src/components/Connect.tsx`, delete lines 372-396 in their entirety — the JSX comment opening with `{/*` right after the closing `</div>` on line 371, through the line ending `</div> */}`. It contains two `<a>` tags pointing at `/Resume.pdf` and `/Transcript.pdf`, neither of which exists in `public/`.

Confirm the deletion did not leave a stray fragment:

Run: `grep -n "Resume.pdf\|Transcript.pdf" src/components/Connect.tsx`
Expected: no output.

- [ ] **Step 5: Remove the unread `type` field from NAV_LINKS**

In `src/components/Navbar.tsx`, replace lines 5-11:

```ts
const NAV_LINKS = [
  { id: 'home', label: 'Home', type: 'route' as const },
  { id: 'about', label: 'About', type: 'section' as const },
  { id: 'skills', label: 'Skills', type: 'section' as const },
  { id: 'projects', label: 'Projects', type: 'section' as const },
  { id: 'connect', label: 'Connect', type: 'section' as const },
] as const;
```

with:

```ts
const NAV_LINKS = [
  { id: 'home', label: 'Home' },
  { id: 'about', label: 'About' },
  { id: 'skills', label: 'Skills' },
  { id: 'projects', label: 'Projects' },
  { id: 'connect', label: 'Connect' },
] as const;
```

Nothing reads `.type` — `handleSectionClick` treats every link identically.

- [ ] **Step 6: Remove the never-supplied `threshold` option**

In `src/hooks/useActiveSection.ts`, replace the options interface:

```ts
interface UseActiveSectionOptions {
  threshold?: number;
  enabled?: boolean;
}
```

with:

```ts
interface UseActiveSectionOptions {
  enabled?: boolean;
}
```

Replace the destructure line:

```ts
  const { threshold = DEFAULT_VISIBILITY_THRESHOLD, enabled = true } = options ?? {};
```

with:

```ts
  const { enabled = true } = options ?? {};
```

Replace the comparison at line 55:

```ts
      if (maxOccupancy > threshold && mostVisibleElement) {
```

with:

```ts
      if (maxOccupancy > DEFAULT_VISIBILITY_THRESHOLD && mostVisibleElement) {
```

Replace the dependency array at line 77:

```ts
  }, [sectionIds, threshold, enabled]);
```

with:

```ts
  }, [sectionIds, enabled]);
```

The only caller, `Navbar.tsx:21`, passes just `{ enabled }`, so `DEFAULT_VISIBILITY_THRESHOLD` (0.1) was always the effective value. Behaviour is unchanged.

- [ ] **Step 7: Delete the dead files**

```bash
git rm public/images/projects/db2.png public/images/projects/db3.jpg public/images/projects/lostfound2.png public/images/projects/nosleep2.jpg
find public -name '.DS_Store' -delete
```

The four images total 2.5 MB and are referenced by no entry in `src/data/projects.ts`. The `.DS_Store` files are gitignored but Vite copies `public/` into `dist/` verbatim regardless of git status, so they currently ship to the web root.

- [ ] **Step 8: Verify the sweep is complete and nothing broke**

Run: `grep -rn "scrollbar-hide\|perspective-container\|animate-fadeIn\|animate-in\|text-md" src/`
Expected: no output. This pattern deliberately does not match `animate-fade-in`, which stays.

Run: `npm run lint && npm test && npx tsc -b --noEmit && npm run build`
Expected: lint exit 0, 34 tests PASS, no type errors, build succeeds.

Run: `find dist -name '.DS_Store'`
Expected: no output.

- [ ] **Step 9: Commit**

```bash
git add src/index.css src/components/Connect.tsx src/components/Navbar.tsx src/hooks/useActiveSection.ts
git commit -m "$(cat <<'EOF'
chore: remove dead code, dead classes and dead assets

CSS: drop .animate-fadeIn, .scrollbar-hide and .perspective-container.
None is referenced; verified absent from the built bundle. Kept
.animate-fade-in, which differs by one character and IS used at
Hero.tsx:115.

Connect.tsx: drop `animate-in fade-in` (plugin not installed) and
`text-md` (not a Tailwind token) - both compile to nothing, so removing
the strings preserves the current rendering exactly. Also drops the
always-empty ContactLink.description field with its unreachable render
branch, and the commented-out resume block pointing at two PDFs that do
not exist.

Navbar.tsx: drop NAV_LINKS[].type, which has no readers.
useActiveSection.ts: drop the threshold option, never supplied by its
only caller, so 0.1 was always effective.

Deletes 2.5 MB of unreferenced images and 3 .DS_Store files that Vite was
copying into dist/ regardless of gitignore.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018meF4mJ98mDwdbDbVqMe5U
EOF
)"
```

---

### Task 8: Enable the broken InfoCard hover animations

Isolated into its own commit because it is the **only** change in this slice a user can see. If the result is unwanted, revert this commit alone.

**Files:**
- Modify: `src/components/About.tsx:56`

**Interfaces:**
- Consumes: nothing. Produces: nothing.

- [ ] **Step 1: Add the missing `group` class**

In `src/components/About.tsx`, replace line 56:

```tsx
    <div className={`p-6 bg-gradient-to-br from-gray-800/50 to-gray-700/50 border border-gray-700/50 rounded-xl backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-xl ${accentClass}`}>
```

with:

```tsx
    <div className={`group p-6 bg-gradient-to-br from-gray-800/50 to-gray-700/50 border border-gray-700/50 rounded-xl backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-xl ${accentClass}`}>
```

Tailwind compiles `group-hover:scale-110` to `.group:hover .group-hover\:scale-110`, which needs a `.group` ancestor. There wasn't one, so the four icons using `group-hover:` at `About.tsx:170`, `:199`, `:227` and `:278` have never animated.

- [ ] **Step 2: Verify visually**

Run: `npm run dev` and open the printed URL. Scroll to the About section and hover each of the four InfoCards.
Expected: each card's icon now scales up on hover; two of them also rotate slightly. The card itself still scales and gains a shadow as before.

Stop the dev server.

- [ ] **Step 3: Verify nothing else broke**

Run: `npm run lint && npm test && npm run build`
Expected: lint exit 0, 34 tests PASS, build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/components/About.tsx
git commit -m "$(cat <<'EOF'
fix: enable InfoCard icon hover animations

The four group-hover: utilities at About.tsx:170, 199, 227 and 278
compile to `.group:hover .group-hover\:scale-110`, which requires a
.group ancestor. The InfoCard root did not have one, so these animations
have never run.

Isolated in its own commit: this is the only user-visible change in the
correctness-baseline slice, so it can be reverted independently.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018meF4mJ98mDwdbDbVqMe5U
EOF
)"
```

---

### Task 9: Tooling, CI, and documentation

**Files:**
- Modify: `package.json`
- Create: `.github/workflows/ci.yml`
- Modify: `README.md:54`

**Interfaces:**
- Consumes: the `test` script from Task 1.
- Produces: `npm run typecheck`; a CI workflow that gates lint, test, and build.

- [ ] **Step 1: Add the typecheck script and engines field**

In `package.json`, replace the `"scripts"` block with:

```json
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "eslint .",
    "test": "vitest run",
    "typecheck": "tsc -b --noEmit",
    "preview": "vite preview"
  },
```

Then add an `"engines"` block immediately after the closing brace of `"scripts"`:

```json
  "engines": {
    "node": ">=20.19"
  },
```

`>=20.19` is Vite 7's actual floor, not the "18+" the README currently claims.

- [ ] **Step 2: Verify the new script works**

Run: `npm run typecheck`
Expected: exit 0, no errors reported.

- [ ] **Step 3: Create the CI workflow**

Create `.github/workflows/ci.yml`:

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

No matrix, no coverage gate, no artifact upload. `npm run build` already runs `tsc -b`, so type-checking is covered transitively and needs no separate job. Building from a clean checkout also permanently prevents the `.DS_Store` leak, since those files exist only on the author's machine.

- [ ] **Step 4: Correct the README**

In `README.md`, replace line 54:

```markdown
> Requires Node 18+ (Vite 7). There is no test suite configured.
```

with:

```markdown
> Requires Node 20.19+ (Vite 7). Run `npm test` for the unit test suite and `npm run typecheck` for a standalone type check.
```

Both halves of the old sentence were wrong: Vite 7 requires `^20.19.0 || >=22.12.0`, and there is now a test suite.

- [ ] **Step 5: Run the full gate exactly as CI will**

Run: `npm run lint && npm test && npm run build`
Expected: all three succeed. This is the same sequence the workflow runs.

- [ ] **Step 6: Commit**

```bash
git add package.json .github/workflows/ci.yml README.md
git commit -m "$(cat <<'EOF'
ci: add lint/test/build workflow and correct the Node floor

One job, one Node version, no matrix or coverage gate. npm run build
already runs tsc -b, so type-checking is covered transitively.

package.json gains a typecheck script and an engines floor of >=20.19,
which is Vite 7's actual requirement - README.md:54 claimed 18+, which
would fail on a genuine Node 18. That line also still said there was no
test suite.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018meF4mJ98mDwdbDbVqMe5U
EOF
)"
```

---

### Task 10: Final verification against the spec's done criteria

No code changes. This task confirms every criterion in spec §7 and produces the summary.

**Files:** none modified.

- [ ] **Step 1: Clean build from scratch**

```bash
rm -rf dist
npm run build
```

Expected: build succeeds.

- [ ] **Step 2: Run all eight done criteria**

```bash
echo "--- 1. lint ---";      npm run lint && echo "PASS: exit 0"
echo "--- 2. test ---";      npm test
echo "--- 3. typecheck ---"; npx tsc -b --noEmit && echo "PASS: no errors"
echo "--- 4. build ---";     npm run build > /dev/null && echo "PASS: build succeeded"
echo "--- 5. no DS_Store in dist ---"; find dist -name '.DS_Store' | wc -l
echo "--- 6. dead classes gone ---";   grep -rn "scrollbar-hide\|perspective-container\|animate-fadeIn\|animate-in\|text-md" src/ | wc -l
echo "--- 7. animate-fade-in preserved ---"; grep -rc "animate-fade-in" src/index.css src/components/Hero.tsx
```

Expected:
1. exit 0, no lint output
2. 34 tests passed, 0 failed
3. no errors
4. build succeeded
5. `0`
6. `0`
7. `1` for each file — the kept utility is still present and still used

- [ ] **Step 3: Re-run the mutation check**

Temporarily change `src/hooks/useCarousel.ts:7` from `raw > total / 2` to `raw >= total / 2`.

Run: `npm test`
Expected: **FAIL.** If it passes, the suite is not actually exercising the carousel logic and the cause must be found before this slice is considered done.

Revert the change and re-run:

Run: `npm test`
Expected: PASS, 34 tests.

- [ ] **Step 4: Confirm the commit history is clean**

Run: `git log --oneline main..HEAD`
Expected: **12 commits** — 2 spec commits, 1 plan commit, and 9 implementation commits (one per Task 1-9).

The four image deletions were staged by `git rm` in Task 7; the `.DS_Store` files are
gitignored and untracked, so deleting them needs no git operation at all.

Run: `git status --short`
Expected: no output. Nothing uncommitted, no stray mutation left behind.

- [ ] **Step 5: Report**

Summarize for the user:
- Lint: red (3 errors, 1 warning) → green (0 problems)
- Tests: none → 34, covering four pure units
- CI: none → one workflow gating lint, test, and build
- Removed: 3 CSS rules, 2 no-op class strings, 2 dead fields, 1 commented block, 2.5 MB of images, 3 `.DS_Store` files
- One visible change: InfoCard icon hover animations now work (Task 8, revertible on its own)
- Three previously-undocumented behaviours are now pinned by tests: the `total=4` carousel slot asymmetry, stars-tie-keeps-first, and status-less projects excluded under any active status filter

Then note that branch protection requiring the CI check is a GitHub repository setting, not a file — it must be enabled manually in the repo's Settings → Branches, and this plan cannot do it.

---

## Notes for the implementer

**If a test fails unexpectedly**, do not adjust the test to match the code. These are characterization tests; a failure means either the implementation changed or the expectation was transcribed wrong. Check the spec's §3 for what each case is supposed to pin down.

**Do not touch** `src/App.tsx:15-17` (the three standalone routes). They are unreachable dead code, but deleting them is one of two valid fixes for the SPA-404 problem, and that decision belongs to the deploy slice.

**Do not touch** the three `requestAnimationFrame` mouse-tracking loops in `Hero.tsx`, `ProjectCard.tsx` and `Connect.tsx`, the reveal-animation `opacity: 0` pattern, or any image other than the four named in Task 7. Those belong to the performance and accessibility slices, and the reveal pattern in particular has a hard ordering constraint documented in the audit.

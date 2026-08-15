# Payload & Fetch Budget (Slice C2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cut the deployed image payload from 6.82 MB to ~288 KB and cut GitHub API traffic from 4 requests per page load to 2 cold / 0 warm.

**Architecture:** Two independent workstreams on one branch. Images: a committed TypeScript script re-encodes originals (relocated out of `public/`) to 800px WebP, and `ProjectCard` gains lazy loading. GitHub: a new `src/lib/githubCache.ts` wraps the existing `fetchGitHubProfile` from outside with an in-flight promise map plus a sessionStorage TTL read-through, and `useGitHubProfile` calls the wrapper instead.

**Tech Stack:** React 19.2, Vite 7.2, TypeScript 5.9 (`strict`, `noUnusedLocals`, `erasableSyntaxOnly`), Vitest 4.1, Tailwind 3.4, Node 25.9 (native `.ts` execution), `cwebp` + `sips` (local, macOS).

**Spec:** `docs/superpowers/specs/2026-08-15-payload-fetch-budget-design.md`
**Branch:** `perf/payload-budget` off `b286082`

## Global Constraints

- **Encoder settings are fixed:** `cwebp -q 82`, target width **800**. These produced the measured 6.82 MB → 288 KB table in the spec. Changing either invalidates every number in the spec.
- **Never upscale.** `revrace.jpeg` is 300x168; resizing it to 800 makes it 2x *bigger* (8.1 KB → 16.3 KB). Resize only when source width > 800.
- **Nothing under `src/` may import a `node:` module.** `tsconfig.app.json` sets `types: ["vite/client"]`. Such an import passes `npm test` and fails `npm run typecheck` with `TS2307`. Filesystem tests live under `scripts/`.
- **The script is `.ts`, never `.mjs`.** `eslint.config.js:11` lints only `**/*.{ts,tsx}`; a `.mjs` file is linted by nothing and typechecked by nothing.
- **No new npm dependencies.** `package.json` gains a script entry only.
- **`getCachedGitHubProfile` takes no `AbortSignal`** and must not pass one to `fetchGitHubProfile`. A shared promise cancelled by one consumer breaks the other — see Task 4.
- **Do not modify** `fetchGitHubProfile` (`src/hooks/useGitHubProfile.ts:46-118`) or its seven existing tests. The cache wraps it from outside.
- **Do not modify** `ProjectCard.tsx:24` (`alt=""`). It is Slice B3 spec item 4.5, guarded by `ProjectCard.test.tsx:27`. Changing it silently reverts shipped accessibility work.
- **Do not modify** `src/lib/carouselPositionStyles.ts`. Settled by C1 and B3.
- **`erasableSyntaxOnly` is on.** No enums, no constructor parameter properties (TS1294). Only `npm run build` / `npm run typecheck` catch this — `npm test` and `npm run lint` both pass.
- **Every task ends green on all four gates:** `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`.
- **Test evidence must be real terminal output**, piped through `tee` to a file. Never hand-compose or paste a reconstructed test transcript.

## Test Baseline

100 tests across 15 files at `b286082`. Expected running totals:

| After task | Tests | Added |
|---|---|---|
| 1 | 106 | 3 resizeArgs, 2 parsePixelWidth, 1 constants |
| 2 | 108 | existence, webp-only |
| 3 | 109 | lazy + decoding attributes |
| 4 | 115 | dedupe, TTL hit, TTL expiry, malformed, storage throw, retry |
| 5 | 118 | 2 jsdom wiring, 1 node isolation guard |
| 6 | 118 | — |

## File Structure

**Create**
- `scripts/optimize-images.ts` — two pure exported helpers (`resizeArgs`, `parsePixelWidth`) plus an I/O driver that shells out to `sips` and `cwebp`
- `scripts/optimize-images.test.ts` — unit tests for the two helpers, plus the image-existence check over `PROJECTS`
- `src/lib/githubCache.ts` — in-flight dedupe + sessionStorage TTL read-through
- `src/lib/githubCache.test.ts` — dedupe, TTL hit/miss, storage failure
- `src/hooks/useGitHubProfile.dom.test.tsx` — jsdom proof that the hook uses the cache
- `assets-src/projects/` — the 11 relocated originals
- `docs/superpowers/manual-checks/2026-08-15-c2-payload.md`

**Modify**
- `vite.config.ts:13` — vitest `include` gains `'scripts/**/*.test.ts'`
- `tsconfig.node.json` — `include` gains `"scripts"`
- `package.json` — `scripts` gains `"images"`
- `public/images/projects/` — 11 `.webp` replace 11 originals
- `src/data/projects.ts` — 11 `imageUrl` values
- `src/components/ProjectCard.tsx:22-26` — add `loading` and `decoding`
- `src/components/ProjectCard.test.tsx` — assert the two attributes
- `src/hooks/useGitHubProfile.ts:120-154` — call the cache; abort guards state only

**Ordering:** Task 1 before 2 (Task 2 runs the script). Task 4 before 5 (Task 5 imports the module). Task 3 is independent.

---

### Task 1: Encoder script and its pure helpers

**Files:**
- Create: `scripts/optimize-images.ts`
- Create: `scripts/optimize-images.test.ts`
- Modify: `vite.config.ts:13`
- Modify: `tsconfig.node.json` (last line, `include`)
- Modify: `package.json` (`scripts` block)

**Interfaces:**
- Produces: `resizeArgs(srcWidth: number, target: number): string[]`, `parsePixelWidth(sipsOutput: string): number`, `TARGET_WIDTH: number` (= 800), `WEBP_QUALITY: number` (= 82). Task 2 runs the script but imports nothing from it.

This task writes the script and wires three config files so the script is executable, linted, typechecked, and its tests are collected. It does **not** run the encoder — that is Task 2.

- [ ] **Step 1: Create the branch**

```bash
git checkout main
git pull --ff-only
git checkout -b perf/payload-budget
git log --oneline -1
```

Expected: `b286082 Merge pull request #9 from SupaOhm/fix/a11y-polish`

- [ ] **Step 2: Wire vitest to collect tests under `scripts/`**

Without this, `scripts/optimize-images.test.ts` is silently never run. Edit `vite.config.ts:13`:

```ts
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts'],
```

- [ ] **Step 3: Wire tsc to typecheck `scripts/`**

Edit the last line of `tsconfig.node.json`:

```json
  "include": ["vite.config.ts", "scripts"]
```

- [ ] **Step 4: Add the npm script**

In `package.json`, add to the `scripts` block after `"preview"`:

```json
    "images": "node scripts/optimize-images.ts"
```

Node 25.9 strips TypeScript types natively — no flag, no loader, no dependency.

- [ ] **Step 5: Write the failing tests**

Create `scripts/optimize-images.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { resizeArgs, parsePixelWidth, TARGET_WIDTH, WEBP_QUALITY } from './optimize-images';

describe('resizeArgs', () => {
  it('resizes when the source is wider than the target', () => {
    expect(resizeArgs(2940, 800)).toEqual(['-resize', '800', '0']);
  });

  it('returns no args when the source is narrower than the target', () => {
    // revrace.jpeg is 300x168. Upscaling it to 800 made it 8.1 KB -> 16.3 KB,
    // the one file a blanket resize would make WORSE.
    expect(resizeArgs(300, 800)).toEqual([]);
  });

  it('returns no args when the source is exactly the target width', () => {
    expect(resizeArgs(800, 800)).toEqual([]);
  });
});

describe('parsePixelWidth', () => {
  it('reads the width out of real sips output', () => {
    // Exact two-line shape of `sips -g pixelWidth <file>`.
    const output = '/abs/path/hci.png\n  pixelWidth: 2940\n';
    expect(parsePixelWidth(output)).toBe(2940);
  });

  it('throws when sips printed no width', () => {
    expect(() => parsePixelWidth('/abs/path/broken.png\n')).toThrow('pixelWidth');
  });
});

describe('encoder constants', () => {
  it('pins the values the spec measured against', () => {
    // The spec's 6.82 MB -> 288 KB table was produced at exactly these settings.
    expect(TARGET_WIDTH).toBe(800);
    expect(WEBP_QUALITY).toBe(82);
  });
});
```

- [ ] **Step 6: Run the tests to verify they fail**

```bash
npm test -- scripts/optimize-images.test.ts 2>&1 | tee .superpowers/sdd/task-1-red.txt
```

Expected: FAIL — `Failed to resolve import "./optimize-images"`.

- [ ] **Step 7: Write the script**

Create `scripts/optimize-images.ts`:

```ts
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import { basename, extname, join } from 'node:path';

/**
 * Widest slot any project image renders into is ~400 CSS px: the carousel card
 * is `w-[360px]` (Projects.tsx:308) and the grid at lg:grid-cols-3 inside
 * max-w-7xl lands near 400px. 800 covers that at 2x DPR.
 */
export const TARGET_WIDTH = 800;

/** Quality the spec's measured 6.82 MB -> 288 KB table was produced at. */
export const WEBP_QUALITY = 82;

const SOURCE_DIR = 'assets-src/projects';
const OUTPUT_DIR = 'public/images/projects';

/**
 * cwebp resize arguments, or none.
 *
 * cwebp has no "downscale only" flag: `-resize 800 0` on a 300px-wide source
 * UPSCALES it. revrace.jpeg (300x168) went 8.1 KB -> 16.3 KB that way, the one
 * file of eleven a blanket resize makes worse. Hence the explicit clamp.
 */
export function resizeArgs(srcWidth: number, target: number): string[] {
  return srcWidth > target ? ['-resize', String(target), '0'] : [];
}

/**
 * Pull the pixel width out of `sips -g pixelWidth <file>` output, which is two
 * lines: the absolute path, then `  pixelWidth: 2940`.
 */
export function parsePixelWidth(sipsOutput: string): number {
  const match = sipsOutput.match(/pixelWidth:\s*(\d+)/);
  if (!match) {
    throw new Error(`sips printed no pixelWidth:\n${sipsOutput}`);
  }
  return Number(match[1]);
}

function requireTool(tool: string, brewFormula: string): void {
  try {
    execFileSync('which', [tool], { stdio: 'ignore' });
  } catch {
    throw new Error(`${tool} not found. Install it with: brew install ${brewFormula}`);
  }
}

function main(): void {
  // sips ships with macOS; cwebp comes from the webp formula.
  requireTool('sips', 'sips');
  requireTool('cwebp', 'webp');

  if (!existsSync(SOURCE_DIR)) {
    throw new Error(`Missing ${SOURCE_DIR}. Originals belong there, not in public/.`);
  }
  mkdirSync(OUTPUT_DIR, { recursive: true });

  const sources = readdirSync(SOURCE_DIR).filter((file) =>
    ['.png', '.jpg', '.jpeg'].includes(extname(file).toLowerCase()),
  );

  for (const file of sources) {
    const source = join(SOURCE_DIR, file);
    const output = join(OUTPUT_DIR, `${basename(file, extname(file))}.webp`);
    const width = parsePixelWidth(
      execFileSync('sips', ['-g', 'pixelWidth', source], { encoding: 'utf8' }),
    );

    execFileSync('cwebp', [
      '-quiet',
      '-q',
      String(WEBP_QUALITY),
      ...resizeArgs(width, TARGET_WIDTH),
      source,
      '-o',
      output,
    ]);

    console.log(`${file} (${width}px) -> ${basename(output)}`);
  }

  console.log(`\n${sources.length} images encoded to ${OUTPUT_DIR}`);
}

// Only run the driver when executed directly, so importing the helpers in a
// test does not shell out to sips and cwebp.
if (process.argv[1]?.endsWith('optimize-images.ts')) {
  main();
}
```

- [ ] **Step 8: Run the tests to verify they pass**

```bash
npm test 2>&1 | tee .superpowers/sdd/task-1-green.txt
```

Expected: 106 tests passing, 16 files.

- [ ] **Step 9: Verify the other three gates**

```bash
npm run lint && npm run typecheck && npm run build 2>&1 | tee .superpowers/sdd/task-1-gates.txt
```

Expected: no lint output, no tsc output, `vite build` succeeds.

- [ ] **Step 10: Commit**

```bash
git add scripts/optimize-images.ts scripts/optimize-images.test.ts \
        vite.config.ts tsconfig.node.json package.json
git commit -m "build: add image optimizer script with no-upscale clamp"
```

---

### Task 2: Encode the images and repoint the data

**Files:**
- Create: `assets-src/projects/` (11 relocated originals)
- Modify: `public/images/projects/` (11 `.webp` replace 11 originals)
- Modify: `src/data/projects.ts` (11 `imageUrl` values)
- Modify: `scripts/optimize-images.test.ts` (append the existence suite)

**Interfaces:**
- Consumes: `npm run images` from Task 1.
- Produces: `imageUrl` values ending `.webp` for Task 3's component test to render.

- [ ] **Step 1: Relocate the originals with git mv**

`git mv` records these as renames, so the repo does not grow by 6.82 MB.

```bash
mkdir -p assets-src/projects
git mv public/images/projects/arduino.jpg   assets-src/projects/arduino.jpg
git mv public/images/projects/baka.jpg      assets-src/projects/baka.jpg
git mv public/images/projects/db.png        assets-src/projects/db.png
git mv public/images/projects/dressme.png   assets-src/projects/dressme.png
git mv public/images/projects/expense.png   assets-src/projects/expense.png
git mv public/images/projects/hci.png       assets-src/projects/hci.png
git mv public/images/projects/IDSaaS.png    assets-src/projects/IDSaaS.png
git mv public/images/projects/lostfound.png assets-src/projects/lostfound.png
git mv public/images/projects/nosleep.jpg   assets-src/projects/nosleep.jpg
git mv public/images/projects/revrace.jpeg  assets-src/projects/revrace.jpeg
git mv public/images/projects/scicom.png    assets-src/projects/scicom.png
ls public/images/projects/ 2>/dev/null || echo "empty, as expected"
```

- [ ] **Step 2: Run the encoder**

```bash
npm run images 2>&1 | tee .superpowers/sdd/task-2-encode.txt
```

Expected: 11 lines like `hci.png (2940px) -> hci.webp`, then `11 images encoded to public/images/projects`.

- [ ] **Step 3: Verify the measured totals**

```bash
du -sh public/images/projects
ls -la public/images/projects/revrace.webp
```

Expected: total ~288K. `revrace.webp` must be roughly 8 KB, **not** 16 KB — a 16 KB result means the no-upscale clamp did not fire and Task 1 is wrong.

- [ ] **Step 4: Repoint the eleven data paths**

In `src/data/projects.ts`, change each `imageUrl` extension to `.webp`. The entry at line 87 is `imageUrl: ''` and stays empty — it is the intentional no-image project that exercises `ProjectCard`'s placeholder branch.

```
:10   '/images/projects/expense.png'   -> '/images/projects/expense.webp'
:21   '/images/projects/lostfound.png' -> '/images/projects/lostfound.webp'
:32   '/images/projects/scicom.png'    -> '/images/projects/scicom.webp'
:43   '/images/projects/nosleep.jpg'   -> '/images/projects/nosleep.webp'
:54   '/images/projects/arduino.jpg'   -> '/images/projects/arduino.webp'
:65   '/images/projects/db.png'        -> '/images/projects/db.webp'
:76   '/images/projects/hci.png'       -> '/images/projects/hci.webp'
:98   '/images/projects/revrace.jpeg'  -> '/images/projects/revrace.webp'
:109  '/images/projects/dressme.png'   -> '/images/projects/dressme.webp'
:120  '/images/projects/IDSaaS.png'    -> '/images/projects/IDSaaS.webp'
:131  '/images/projects/baka.jpg'      -> '/images/projects/baka.webp'
```

- [ ] **Step 5: Write the failing existence test**

Append this suite to `scripts/optimize-images.test.ts`:

```ts
describe('project image references', () => {
  it('points every non-empty imageUrl at a file that exists', () => {
    // Catches a rename typo in projects.ts, which would otherwise ship as a
    // silently broken image: the src 404s and the card renders an empty box.
    const missing = PROJECTS.filter(
      (project) => project.imageUrl && !existsSync(join('public', project.imageUrl)),
    ).map((project) => project.imageUrl);

    expect(missing).toEqual([]);
  });

  it('uses only .webp, so no original sneaks back into public/', () => {
    const notWebp = PROJECTS.map((project) => project.imageUrl)
      .filter((url) => url !== '')
      .filter((url) => !url.endsWith('.webp'));

    expect(notWebp).toEqual([]);
  });
});
```

Import lines go at the top of the file with the existing ones, not mid-file:

```ts
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import { resizeArgs, parsePixelWidth, TARGET_WIDTH, WEBP_QUALITY } from './optimize-images';
import { PROJECTS } from '../src/data/projects';
```

Importing `PROJECTS` from `src/` inside a `scripts/` test crosses a tsconfig
project boundary. This was probed against both `npm test` and `npm run typecheck`
and passes — but only because Task 1 added `"scripts"` to `tsconfig.node.json`.

- [ ] **Step 6: Run the tests**

```bash
npm test 2>&1 | tee .superpowers/sdd/task-2-green.txt
```

Expected: 108 tests passing. If Step 4 missed a path, the first test fails listing exactly which `imageUrl` has no file.

- [ ] **Step 7: Verify the other three gates**

```bash
npm run lint && npm run typecheck && npm run build 2>&1 | tee .superpowers/sdd/task-2-gates.txt
```

- [ ] **Step 8: Confirm the originals are not deployed**

```bash
du -sh dist/images/projects
find dist -name '*.png' -path '*projects*' | head
```

Expected: ~288K, and no `.png` under `dist/images/projects` — proving `assets-src/` stays out of the build.

- [ ] **Step 9: Commit**

```bash
git add -A assets-src public/images/projects src/data/projects.ts scripts/optimize-images.test.ts
git commit -m "perf: encode project images to webp, 6.82 MB -> 288 KB"
```

---

### Task 3: Lazy-load the project images

**Files:**
- Modify: `src/components/ProjectCard.tsx:22-26`
- Modify: `src/components/ProjectCard.test.tsx`

**Interfaces:**
- Consumes: nothing from other tasks. Independent — can run before or after Tasks 1-2.
- Produces: nothing other tasks depend on.

- [ ] **Step 1: Write the failing test**

Append to `src/components/ProjectCard.test.tsx`, inside the existing `describe('project image', ...)` block:

```ts
  it('defers loading and decoding so the below-the-fold cards do not block paint', () => {
    render(<ProjectCard project={project} />);

    // Projects sits far below the fold; eagerly fetching 11 images competes with
    // above-the-fold work. queryByRole cannot find it (alt="" makes it
    // presentational and removes it from the accessibility tree), so query the DOM.
    const image = document.querySelector('img');
    expect(image).not.toBeNull();
    expect(image).toHaveAttribute('loading', 'lazy');
    expect(image).toHaveAttribute('decoding', 'async');
  });
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npm test -- src/components/ProjectCard.test.tsx 2>&1 | tee .superpowers/sdd/task-3-red.txt
```

Expected: FAIL — `expected null to have attribute "loading"` or an assertion that the element has no such attribute.

- [ ] **Step 3: Add the two attributes**

`src/components/ProjectCard.tsx`, replacing lines 22-26. Keep `alt=""` exactly as it is — it is Slice B3 spec item 4.5 and `ProjectCard.test.tsx:27` guards it.

```tsx
        <img
          src={project.imageUrl}
          alt=""
          loading="lazy"
          decoding="async"
          className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
        />
```

- [ ] **Step 4: Run the tests**

```bash
npm test 2>&1 | tee .superpowers/sdd/task-3-green.txt
```

Expected: 109 tests passing.

- [ ] **Step 5: Verify the other three gates**

```bash
npm run lint && npm run typecheck && npm run build 2>&1 | tee .superpowers/sdd/task-3-gates.txt
```

- [ ] **Step 6: Commit**

```bash
git add src/components/ProjectCard.tsx src/components/ProjectCard.test.tsx
git commit -m "perf: lazy-load and async-decode project card images"
```

---

### Task 4: The GitHub cache module

**Files:**
- Create: `src/lib/githubCache.ts`
- Create: `src/lib/githubCache.test.ts`

**Interfaces:**
- Consumes: `fetchGitHubProfile(username: string, signal?: AbortSignal): Promise<GitHubProfile>` and the `GitHubProfile` type, both exported from `src/hooks/useGitHubProfile.ts`. **Call it with one argument only** — see the abort constraint below.
- Produces, for Task 5:
  - `getCachedGitHubProfile(username: string, storage?: CacheStorage, now?: () => number): Promise<GitHubProfile>`
  - `resetGitHubCache(): void` — clears module state between tests
  - `CACHE_TTL_MS: number` (= 600_000)
  - `type CacheStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>`

**Why no `AbortSignal`:** `main.tsx:8` wraps the app in `StrictMode`, so every effect runs, cleans up, and runs again in dev. `useGitHubProfile.ts:128` creates an `AbortController` and `:149` aborts it on cleanup. If the shared in-flight promise were cancellable, the first StrictMode cleanup would abort the fetch the second run is awaiting, and in production `About` unmounting on a route change would blank out `Connect`'s stats. The hook keeps its controller in Task 5, but it will guard only `setState`.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/githubCache.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getCachedGitHubProfile, resetGitHubCache, CACHE_TTL_MS } from './githubCache';
import type { CacheStorage } from './githubCache';

const profileBody = {
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
};

/** Counts calls so a test can prove requests were deduplicated. */
const countingFetch = () => {
  const calls = { count: 0 };
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string | URL) => {
      calls.count += 1;
      const body = String(url).includes('/repos') ? [] : profileBody;
      return new Response(JSON.stringify(body), { status: 200 });
    }),
  );
  return calls;
};

/** In-memory stand-in for sessionStorage, which does not exist in vitest's node env. */
const fakeStorage = (): CacheStorage & { data: Map<string, string> } => {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  };
};

beforeEach(() => {
  resetGitHubCache();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('getCachedGitHubProfile', () => {
  it('makes one network round trip when two callers race', async () => {
    // The real scenario: About and Connect both mount in the same tick.
    // Two requests per round trip (user + repos), so 2 total, not 4.
    const calls = countingFetch();
    const storage = fakeStorage();

    const [first, second] = await Promise.all([
      getCachedGitHubProfile('testuser', storage),
      getCachedGitHubProfile('testuser', storage),
    ]);

    expect(calls.count).toBe(2);
    expect(first.login).toBe('testuser');
    expect(second).toEqual(first);
  });

  it('serves a fresh cached entry without any network call', async () => {
    const storage = fakeStorage();
    let calls = countingFetch();
    await getCachedGitHubProfile('testuser', storage);
    expect(calls.count).toBe(2);

    // Drop the in-flight map so only sessionStorage can satisfy the next call.
    resetGitHubCache();
    calls = countingFetch();

    const profile = await getCachedGitHubProfile('testuser', storage);
    expect(calls.count).toBe(0);
    expect(profile.login).toBe('testuser');
  });

  it('refetches once the entry is older than the TTL', async () => {
    const storage = fakeStorage();
    let clock = 1_000_000;
    const now = () => clock;

    let calls = countingFetch();
    await getCachedGitHubProfile('testuser', storage, now);
    expect(calls.count).toBe(2);

    resetGitHubCache();
    clock += CACHE_TTL_MS + 1;
    calls = countingFetch();

    await getCachedGitHubProfile('testuser', storage, now);
    expect(calls.count).toBe(2);
  });

  it('ignores a malformed cache entry and fetches live', async () => {
    const storage = fakeStorage();
    storage.data.set('github-profile:testuser', 'not json{');
    const calls = countingFetch();

    const profile = await getCachedGitHubProfile('testuser', storage);

    expect(calls.count).toBe(2);
    expect(profile.login).toBe('testuser');
  });

  it('still resolves when storage throws on write', async () => {
    // Safari private mode throws on setItem. A portfolio must not white-screen.
    const throwingStorage: CacheStorage = {
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
      removeItem: () => {},
    };
    countingFetch();

    const profile = await getCachedGitHubProfile('testuser', throwingStorage);

    expect(profile.login).toBe('testuser');
  });

  it('lets the next caller retry after a failed fetch', async () => {
    // A rejected promise must not stay in the in-flight map, or every later
    // mount inherits the same rejection and the section never recovers.
    const storage = fakeStorage();
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 403 })));

    await expect(getCachedGitHubProfile('testuser', storage)).rejects.toThrow(
      'Failed to fetch GitHub stats',
    );

    const calls = countingFetch();
    const profile = await getCachedGitHubProfile('testuser', storage);

    expect(calls.count).toBe(2);
    expect(profile.login).toBe('testuser');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npm test -- src/lib/githubCache.test.ts 2>&1 | tee .superpowers/sdd/task-4-red.txt
```

Expected: FAIL — `Failed to resolve import "./githubCache"`.

- [ ] **Step 3: Write the module**

Create `src/lib/githubCache.ts`:

```ts
import { fetchGitHubProfile } from '../hooks/useGitHubProfile';
import type { GitHubProfile } from '../hooks/useGitHubProfile';

/**
 * Only the three methods this module uses. Injecting the storage rather than
 * reaching for sessionStorage directly keeps the module testable under
 * vitest's `environment: 'node'`, where sessionStorage does not exist.
 */
export type CacheStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/**
 * Ten minutes. Long enough that ordinary browsing costs zero requests, short
 * enough that a visitor holding a tab open still sees same-session updates.
 */
export const CACHE_TTL_MS = 600_000;

type CacheEntry = {
  savedAt: number;
  profile: GitHubProfile;
};

/**
 * Shared between every consumer of the hook. Two components mounting in the
 * same tick await the SAME promise, so the pair of network requests happens
 * once rather than twice.
 */
const inFlight = new Map<string, Promise<GitHubProfile>>();

/** Storage that silently does nothing, for environments without sessionStorage. */
const noopStorage: CacheStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

function defaultStorage(): CacheStorage {
  try {
    return globalThis.sessionStorage ?? noopStorage;
  } catch {
    // Accessing sessionStorage itself throws when cookies are fully blocked.
    return noopStorage;
  }
}

const storageKey = (username: string) => `github-profile:${username}`;

function readCache(
  username: string,
  storage: CacheStorage,
  now: () => number,
): GitHubProfile | null {
  let raw: string | null;
  try {
    raw = storage.getItem(storageKey(username));
  } catch {
    return null;
  }
  if (!raw) {
    return null;
  }

  try {
    const entry: CacheEntry = JSON.parse(raw);
    if (now() - entry.savedAt > CACHE_TTL_MS) {
      storage.removeItem(storageKey(username));
      return null;
    }
    return entry.profile;
  } catch {
    // Malformed entry from an older shape or a truncated write.
    try {
      storage.removeItem(storageKey(username));
    } catch {
      // Nothing to do; the live fetch below still succeeds.
    }
    return null;
  }
}

function writeCache(
  username: string,
  profile: GitHubProfile,
  storage: CacheStorage,
  now: () => number,
): void {
  const entry: CacheEntry = { savedAt: now(), profile };
  try {
    storage.setItem(storageKey(username), JSON.stringify(entry));
  } catch {
    // Safari private mode throws on setItem. Caching is an optimisation, so
    // failing to cache must never fail the request.
  }
}

/**
 * GitHub profile with request deduplication and a session-scoped TTL cache.
 *
 * Takes NO AbortSignal, deliberately. The returned promise is shared between
 * every concurrent caller, so letting one consumer cancel it would cancel it
 * for the others: under StrictMode the first effect's cleanup would abort the
 * fetch the second run awaits, and in production About unmounting would blank
 * out Connect. Consumers decide whether to APPLY a result, never whether the
 * request continues.
 */
export function getCachedGitHubProfile(
  username: string,
  storage: CacheStorage = defaultStorage(),
  now: () => number = Date.now,
): Promise<GitHubProfile> {
  const cached = readCache(username, storage, now);
  if (cached) {
    return Promise.resolve(cached);
  }

  const pending = inFlight.get(username);
  if (pending) {
    return pending;
  }

  const request = fetchGitHubProfile(username)
    .then((profile) => {
      writeCache(username, profile, storage, now);
      return profile;
    })
    .finally(() => {
      // Drop the entry either way. Keeping a rejected promise here would make
      // every later mount inherit the same failure with no way to retry.
      inFlight.delete(username);
    });

  inFlight.set(username, request);
  return request;
}

/** Clears in-flight state. Tests only — production never needs this. */
export function resetGitHubCache(): void {
  inFlight.clear();
}
```

- [ ] **Step 4: Run the tests**

```bash
npm test 2>&1 | tee .superpowers/sdd/task-4-green.txt
```

Expected: 115 tests passing.

- [ ] **Step 5: Verify the other three gates**

```bash
npm run lint && npm run typecheck && npm run build 2>&1 | tee .superpowers/sdd/task-4-gates.txt
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/githubCache.ts src/lib/githubCache.test.ts
git commit -m "perf: add GitHub profile cache with in-flight dedupe and TTL"
```

---

### Task 5: Wire the hook to the cache

**Files:**
- Modify: `src/hooks/useGitHubProfile.ts:120-154` (the `useGitHubProfile` function only)
- Modify: `src/hooks/useGitHubProfile.test.ts` (append one suite)
- Create: `src/hooks/useGitHubProfile.dom.test.tsx` (jsdom; the real wiring proof)

**Interfaces:**
- Consumes: `getCachedGitHubProfile(username, storage?, now?)` and `resetGitHubCache()` from `src/lib/githubCache.ts` (Task 4).
- Produces: no signature change. `useGitHubProfile(username)` still returns `{ profile, isLoading }`, so `About.tsx:71` and `Connect.tsx:70` need no edits.

**Do not touch** `fetchGitHubProfile` at `:46-118` or the seven existing tests above. Only the hook at the bottom of the file changes.

- [ ] **Step 1: Write the failing wiring test**

Create `src/hooks/useGitHubProfile.dom.test.tsx`. This must be a **new jsdom
file** — `useGitHubProfile.test.ts` runs under `node` and must stay that way,
because its seven characterization tests depend on the node environment.
`useCursorGlow.dom.test.tsx` is the existing precedent for this split.

Rendering the hook for real is the point: calling `getCachedGitHubProfile`
directly would only re-test Task 4 and would pass even if the hook never
adopted the cache.

```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { useGitHubProfile } from './useGitHubProfile';
import { resetGitHubCache } from '../lib/githubCache';

const userBody = {
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
};

/** Stands in for About or Connect. One template literal so the assertion text
 *  is a single text node rather than three React children. */
function Consumer({ label }: { label: string }) {
  const { profile, isLoading } = useGitHubProfile('testuser');
  return <p>{`${label}: ${isLoading ? 'loading' : (profile?.login ?? 'none')}`}</p>;
}

function Pair({ showAbout }: { showAbout: boolean }) {
  return (
    <>
      {showAbout ? <Consumer label="about" /> : null}
      <Consumer label="connect" />
    </>
  );
}

let fetchCount = 0;

beforeEach(() => {
  resetGitHubCache();
  // jsdom DOES implement sessionStorage, so a previous test's entry would
  // otherwise satisfy the next one and hide a real regression.
  sessionStorage.clear();
  fetchCount = 0;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string | URL) => {
      fetchCount += 1;
      const body = String(url).includes('/repos') ? [] : userBody;
      return new Response(JSON.stringify(body), { status: 200 });
    }),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('useGitHubProfile wiring', () => {
  it('makes one round trip when two components mount together', async () => {
    render(<Pair showAbout />);

    await waitFor(() => {
      expect(screen.getByText('about: testuser')).toBeInTheDocument();
      expect(screen.getByText('connect: testuser')).toBeInTheDocument();
    });

    // The user endpoint plus the repos endpoint, once. Four means each mount
    // fetched independently and the hook is not using the cache.
    expect(fetchCount).toBe(2);
  });

  it('still resolves for the remaining consumer when the other unmounts mid-flight', async () => {
    const { rerender } = render(<Pair showAbout />);

    // Unmount "about" before the shared request settles. If the hook passed a
    // per-consumer AbortSignal into the shared promise, this abort would take
    // "connect" down with it and the assertion below would time out. This is
    // the exact production regression the no-AbortSignal design prevents.
    rerender(<Pair showAbout={false} />);

    await waitFor(() => {
      expect(screen.getByText('connect: testuser')).toBeInTheDocument();
    });
  });
});
```

- [ ] **Step 2: Add the isolation guard to the node test file**

Append to `src/hooks/useGitHubProfile.test.ts` (no docblock, no new imports
beyond what the file already has):

```ts
describe('fetchGitHubProfile stays uncached', () => {
  it('hits the network on every direct call', async () => {
    // The seven characterization tests above all assume each call is live. If
    // a cache ever moves INSIDE fetchGitHubProfile they start contaminating one
    // another in confusing ways; this test fails first, with a clearer message.
    let count = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string | URL) => {
        count += 1;
        return String(url).includes('/repos') ? ok([]) : ok(userBody());
      }),
    );

    await fetchGitHubProfile('testuser');
    await fetchGitHubProfile('testuser');

    expect(count).toBe(4);
  });
});
```

- [ ] **Step 3: Run both test files to verify they fail**

```bash
npm test -- src/hooks/useGitHubProfile.dom.test.tsx src/hooks/useGitHubProfile.test.ts 2>&1 | tee .superpowers/sdd/task-5-red.txt
```

Expected: FAIL — `Failed to resolve import \"../lib/githubCache\"` if Task 4 is not yet merged in; otherwise the first wiring test reports `expected 4 to be 2`, because the hook still fetches independently per mount.

- [ ] **Step 4: Rewrite the hook body**

Replace `src/hooks/useGitHubProfile.ts:120-154` with:

```tsx
export function useGitHubProfile(username: string): {
  profile: GitHubProfile | null;
  isLoading: boolean;
} {
  const [profile, setProfile] = useState<GitHubProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Guards setState only. It deliberately does NOT reach the network: the
    // request is shared with the other consumer of this hook, so cancelling it
    // here would cancel it for them. Under StrictMode this effect's own
    // cleanup would otherwise abort the fetch its second run is awaiting.
    let applies = true;

    const loadProfile = async () => {
      try {
        setIsLoading(true);
        const result = await getCachedGitHubProfile(username);
        if (applies) {
          setProfile(result);
        }
      } catch {
        if (applies) {
          setProfile(null);
        }
      } finally {
        if (applies) {
          setIsLoading(false);
        }
      }
    };

    loadProfile();

    return () => {
      applies = false;
    };
  }, [username]);

  return { profile, isLoading };
}
```

Then update the import at `src/hooks/useGitHubProfile.ts:1` region — add below the existing React import:

```ts
import { getCachedGitHubProfile } from '../lib/githubCache';
```

`AbortController` is now unused in this file. `noUnusedLocals` will not complain (it was a local, now deleted), but confirm no stray reference remains:

```bash
grep -n "AbortController\|controller" src/hooks/useGitHubProfile.ts
```

Expected: only the `signal?: AbortSignal` parameter of `fetchGitHubProfile` at `:46-48`, which stays for API compatibility and is exercised by the existing tests.

- [ ] **Step 5: Run the tests**

```bash
npm test 2>&1 | tee .superpowers/sdd/task-5-green.txt
```

Expected: 118 tests passing, including all seven original `fetchGitHubProfile` characterization tests unchanged.

- [ ] **Step 6: Verify the other three gates**

```bash
npm run lint && npm run typecheck && npm run build 2>&1 | tee .superpowers/sdd/task-5-gates.txt
```

- [ ] **Step 7: Commit**

```bash
git add src/hooks/useGitHubProfile.ts src/hooks/useGitHubProfile.test.ts \
        src/hooks/useGitHubProfile.dom.test.tsx
git commit -m "perf: route useGitHubProfile through the shared cache"
```

---

### Task 6: Manual verification checklist

**Files:**
- Create: `docs/superpowers/manual-checks/2026-08-15-c2-payload.md`

**Interfaces:**
- Consumes: nothing. Documentation only.
- Produces: the honest record of what no test in this branch proves.

Follow the format of `docs/superpowers/manual-checks/2026-08-14-b3-a11y.md`: unticked `- [ ]` boxes, each naming the exact tool and the exact expected observation.

- [ ] **Step 1: Write the checklist**

Create `docs/superpowers/manual-checks/2026-08-15-c2-payload.md`:

```markdown
# Slice C2 manual checks — payload & fetch budget

Branch `perf/payload-budget`. None of these are provable by the test suite:
jsdom has no network stack, no layout engine, and no real sessionStorage.

## Images (DevTools > Network, disable cache, hard reload)

- [ ] Filter to Img. Total transferred for `/images/projects/*` is ~288 KB, not ~6.8 MB.
- [ ] Every project image request is a `.webp`. No `.png` or `.jpg` under
      `/images/projects/` appears at all.
- [ ] On first paint at the top of the page, project images have NOT been
      requested yet. They appear only as the Projects section scrolls into view.
      (This is the only real evidence `loading="lazy"` does anything.)
- [ ] `revrace.webp` transfers around 6.4 KB (6,604 bytes). A ~16 KB figure means the
      no-upscale clamp regressed.
- [ ] Every card renders an image. A broken/empty box means a `.webp` path in
      `projects.ts` does not match a file.
- [ ] Images still look acceptable at full width on a 2x display — quality 82
      at 800px wide shows no obvious artefacting.

## Images (deployed build)

- [ ] Vercel preview: `dist` contains no `.png`/`.jpg` under
      `images/projects/`, confirming `assets-src/` is not deployed.

## GitHub requests (DevTools > Network, filter `api.github.com`)

- [ ] Hard reload with an empty session: exactly **2** requests
      (`/users/SupaOhm` and the repos endpoint), not 4.
- [ ] Reload again within 10 minutes: **0** requests. Stats still render in
      both the About and Connect sections.
- [ ] Application > Session Storage contains one `github-profile:SupaOhm` key
      whose `savedAt` is a plausible epoch milliseconds value.
- [ ] Close the tab, open a new one, load the site: back to 2 requests,
      confirming the cache is session-scoped and not localStorage.
- [ ] Wait past 10 minutes with the tab open, then reload: 2 requests again.

## GitHub failure modes

- [ ] Block `api.github.com` in DevTools request blocking, then reload. Both
      sections show their loading/empty state. Nothing white-screens.
- [ ] Unblock and reload without clearing storage: stats return.
- [ ] Safari private window: the site loads and stats render, even though
      `sessionStorage.setItem` throws there.

## StrictMode / navigation

- [ ] `npm run dev`, load `/`, then navigate to `/about` and back. Stats stay
      populated in both sections — they never blank out. (This is the
      regression the no-AbortSignal design exists to prevent.)
- [ ] Dev console shows no React warning about setting state on an unmounted
      component.
```

- [ ] **Step 2: Commit**

```bash
git add docs/superpowers/manual-checks/2026-08-15-c2-payload.md
git commit -m "docs: manual verification checklist for slice C2"
```

---

## Known limits of this plan's tests

Stated plainly so no reviewer or fixer tries to close these gaps with an assertion that only tests the diff against itself:

- **No test measures real transfer size.** The 288 KB is measured with `stat` on encoded files, not observed over the wire.
- **No test proves `loading="lazy"` defers anything.** jsdom does not implement lazy loading; Task 3 asserts only that the attribute is present. Do not add a test claiming to prove deferral.
- **No test proves the real request count drops.** Task 4 and 5 use a fake `fetch` and a fake storage. The 4 → 2 → 0 progression is a Network-panel observation.
- **No test exercises real `sessionStorage`.** Storage is injected precisely so tests avoid it.
- **No test exercises real StrictMode double-mounting.** Task 5's jsdom tests render the hook and prove the shared round trip and the mid-flight unmount, but React only double-invokes effects under an actual `<StrictMode>` root in dev. The real behaviour is checklist item "StrictMode / navigation".

Task 6's checklist is the honest record for all of the above.

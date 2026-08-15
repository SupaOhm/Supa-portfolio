# Slice C2 — Payload & Fetch Budget

**Date:** 2026-08-15
**Branch:** `perf/payload-budget`
**Merge base:** `b286082` (main, after B3 merged via PR #9)
**Predecessors:** Slice A (PR #5), B1 (PR #6), B2 (PR #7), C1 (PR #8), B3 (PR #9)

## Goal

Cut the deployed image payload from 6.82 MB to ~278 KB, and cut GitHub API
traffic from 4 requests per page load to 2 on a cold session and 0 on a warm
one. This is the remainder of Slice C, deferred when C1 was pulled forward to
avoid colliding with B3 in `carouselPositionStyles.ts`.

## Measured starting state

Every number below was measured on 2026-08-15 against `b286082`, not estimated.

### Images

`public/images/projects/` holds 11 files totalling 6.82 MB. Every one renders
into a slot at most ~400 CSS px wide: the carousel card is `w-[360px]`
(`Projects.tsx:308`) and the grid at `lg:grid-cols-3` inside `max-w-7xl`
(`Projects.tsx:361`, `:134`) lands near 400px. At 2x DPR the largest useful
source is **800px wide**.

Trial encode with `cwebp -q 82`, resizing to 800px wide only where the source
is wider:

| File | Original | WebP | Ratio | Output dims |
|---|---|---|---|---|
| `lostfound.png` | 2022.4 KB | 17.3 KB | 116.8x | 800x494 |
| `hci.png` | 1556.3 KB | 38.9 KB | 40.0x | 800x451 |
| `nosleep.jpg` | 824.5 KB | 52.2 KB | 15.8x | 800x601 |
| `scicom.png` | 697.3 KB | 33.3 KB | 21.0x | 800x587 |
| `db.png` | 674.1 KB | 39.2 KB | 17.2x | 800x534 |
| `IDSaaS.png` | 426.7 KB | 26.7 KB | 16.0x | 800x373 |
| `dressme.png` | 356.5 KB | 15.9 KB | 22.4x | 800x534 |
| `expense.png` | 202.6 KB | 7.0 KB | 29.0x | 800x490 |
| `arduino.jpg` | 118.0 KB | 19.4 KB | 6.1x | 800x463 |
| `baka.jpg` | 101.7 KB | 21.9 KB | 4.6x | 800x450 |
| `revrace.jpeg` | 8.1 KB | 16.3 KB | **0.5x** | 800x448 |
| **Total (naive)** | **6.82 MB** | **288 KB** | **24.3x** | 95.9% saved |
| **Total (shipped)** | **6.82 MB** | **278 KB** | **24.5x** | 95.9% saved |

`revrace.jpeg` is the exception that constrains the design: its source is
300x168, so a blanket `-resize 800 0` **doubles** its size. See "No upscaling".

The two total rows differ only in that file. The naive row is what the trial
encode produced with `revrace` upscaled to 16.3 KB; the shipped row is what the
no-upscale clamp actually produces, leaving it at 6.6 KB — smaller than its own
8.1 KB original. `288 - 16.3 + 6.6 = 278.3`. Measured on the committed output:
284,952 bytes across 11 files.

`ProjectCard.tsx:22-26` sets no `loading` and no `decoding`, so all 11 load
eagerly on first paint even though the Projects section is far below the fold.

**Not a problem, recorded so nobody "fixes" it:** the `<img>` has no intrinsic
`width`/`height`, but `ProjectCard.tsx:25` sets `w-full h-48 object-cover`.
CSS fully determines the box before the image loads, so there is no layout
shift to fix here. Intrinsic dimensions are out of scope.

### GitHub API

`CLAUDE.md` says the GitHub integration is duplicated across `About.tsx` and
`Connect.tsx`. That is outdated — it was extracted into `useGitHubProfile`
during the hooks refactor (`3a86ceb`). The live problem is different:

- `About.tsx:71` and `Connect.tsx:70` each call `useGitHubProfile`.
- Each call mounts its own effect (`useGitHubProfile.ts:127`).
- Each effect calls `fetchGitHubProfile`, which makes **two** sequential
  requests: the user endpoint (`:50`) then the repos endpoint (`:63`).

That is **4 requests per page load**, with no cache of any kind. Against
GitHub's unauthenticated limit of 60 requests/hour/IP, the site starts failing
after roughly **15 page loads per hour** from one IP.

## Architecture

Two independent workstreams on one branch. They share no files.

### Images

```
assets-src/projects/*.png|jpg|jpeg      originals, NOT served
        │
        │  node scripts/optimize-images.ts   (npm run images)
        ▼
public/images/projects/*.webp            deployed, ~288 KB total
        │
        ▼
src/data/projects.ts   imageUrl: '/images/projects/lostfound.webp'
        │
        ▼
src/components/ProjectCard.tsx   <img loading="lazy" decoding="async">
```

Originals move out of `public/` into `assets-src/projects/`. Vite deploys only
`public/` plus imported assets, so the originals stop shipping while remaining
in the repo — which keeps the script reproducible. Git sees the originals as
renames, so the repo grows only by the 288 KB of new `.webp`; the **deployed
bundle drops 6.6 MB**.

### GitHub

A new `src/lib/githubCache.ts` wraps `fetchGitHubProfile`. It does not modify
it. That boundary is deliberate: the seven existing tests in
`useGitHubProfile.test.ts` call `fetchGitHubProfile` directly and stub global
`fetch`, so putting a cache inside it would make those tests contaminate one
another through shared module state.

```
About mounts   ─┐
                ├─→ githubCache ─→ sessionStorage hit (fresh)? ── yes → 0 req
Connect mounts ─┘        │ no
                         └─→ in-flight promise exists? ───────── yes → 0 req
                                    │ no
                                    └─→ fetchGitHubProfile ──────────→ 2 req
```

| Scenario | Before | After |
|---|---|---|
| Cold first load | 4 req | 2 req |
| Second component mounting | included above | 0 req |
| Reload within session | 4 req | 0 req |
| New session / TTL expired | 4 req | 2 req |
| Cold loads before hitting 60/hr | ~15 | ~30 |

## Design decisions

### Encoder settings

Fixed and non-negotiable so reruns are deterministic: `cwebp -q 82`, target
width **800**, output `.webp` alongside the same basename. Quality 82 is what
produced the measured table above; changing it invalidates those numbers.

### No upscaling

The script resizes only when the source is wider than the target. The rule is
a pure function so it can be tested without touching the filesystem:

```ts
export function resizeArgs(srcWidth: number, target: number): string[] {
  return srcWidth > target ? ['-resize', String(target), '0'] : [];
}
```

`resizeArgs(2940, 800)` returns `['-resize', '800', '0']`; `resizeArgs(300, 800)`
returns `[]`, leaving `revrace` at its native 300x168. Without this clamp one
of eleven files gets worse.

### The script is TypeScript, not `.mjs`

`eslint.config.js:11` scopes linting to `**/*.{ts,tsx}` and `tsconfig.node.json`
covers only `vite.config.ts`. A `.mjs` script would be linted by nothing and
typechecked by nothing. Node 25.9 executes `.ts` natively with no flag
(verified), so the script is `scripts/optimize-images.ts` and
`tsconfig.node.json`'s include becomes `["vite.config.ts", "scripts"]`.

Verified in a probe: with that include, `npm run typecheck` and `npm run lint`
both pass clean on a TypeScript file under `scripts/` that imports `node:fs`
and uses `process`.

`tsconfig.node.json` already sets `erasableSyntaxOnly`, which matches what
Node's type-stripping requires. No enums, no constructor parameter properties.

### Tests that need `node:` modules must live under `scripts/`

`tsconfig.app.json` sets `types: ["vite/client"]`, so **nothing under `src/`
can import `node:fs`**. A probe test placed in `src/` passed `npm test` and
failed `npm run typecheck` with:

```
src/__probe.test.ts(1,28): error TS2307: Cannot find module 'node:fs' or its
corresponding type declarations.
```

This is the same failure shape as the B3 `erasableSyntaxOnly` incident: only
`npm run build` and `npm run typecheck` catch it, and `npm test` reports green.
The image-existence test therefore lives at `scripts/optimize-images.test.ts`,
not in `src/`.

Two config changes make that directory real, and **both** are required:

- `tsconfig.node.json` include gains `"scripts"` — otherwise the files are
  never typechecked.
- `vite.config.ts:13` include gains `'scripts/**/*.test.ts'` — the current
  value is `['src/**/*.test.{ts,tsx}']`, so without this the tests are
  **silently never collected** and the suite reports green having run nothing.

Importing `PROJECTS` from `src/data/projects.ts` inside a `scripts/` test
crosses a tsconfig project boundary. Probed against both `npm test` and
`npm run typecheck`: it passes once `"scripts"` is in the node include.

### The shared fetch must not be cancellable by one consumer

`main.tsx:8` wraps the app in `StrictMode`, and `useGitHubProfile.ts:128`
creates an `AbortController` that `:149` aborts on cleanup. Combining that with
a shared in-flight promise is a bug:

- **StrictMode (dev):** effect runs, cleanup aborts, effect runs again. The
  abort kills the promise the second run is awaiting.
- **Production:** `About` unmounts on a route change and aborts the shared
  fetch that `Connect` is still awaiting. Connect's stats go blank.

So `getCachedGitHubProfile(username)` takes **no** `AbortSignal` and its
underlying `fetchGitHubProfile` call passes none. The hook keeps its
`AbortController`, but it now guards only the `setState` calls — it decides
whether to apply a result, never whether the network request continues.

A rejected fetch deletes its in-flight entry so the next mount retries rather
than inheriting a poisoned promise.

### Storage is injected

`vitest` runs `environment: 'node'` globally, where `sessionStorage` does not
exist. `githubCache.ts` therefore takes its storage as a parameter with a
default, so tests inject a fake and no jsdom docblock is needed:

```ts
type CacheStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
```

The default resolves `globalThis.sessionStorage` when present and falls back to
a no-op store otherwise.

### TTL is 10 minutes

Long enough that normal browsing costs nothing, short enough that a visitor who
leaves a tab open sees same-session updates. `sessionStorage` (not
`localStorage`) so the cache dies with the tab and never serves stale data to a
returning visitor days later.

### WebP with no `<picture>` fallback

WebP is supported by ~97% of browsers. A `<picture>` element with a JPEG
fallback would mean shipping both encodings, which reintroduces the payload
this slice exists to remove. Single `<img src="*.webp">`.

### `alt=""` is not to be touched

`ProjectCard.tsx:24` sets `alt=""` deliberately. It is Slice B3 spec item 4.5 —
the adjacent `<h3>` at `:35` already announces the title, and a duplicate alt
makes screen readers say it twice. It is guarded by
`ProjectCard.test.tsx:27`. Task 3 changes `loading` and `decoding` only.
Do not "improve" the alt text; doing so silently reverts shipped a11y work.

## Files

**Create**
- `scripts/optimize-images.ts` — encoder driver plus the pure `resizeArgs`
- `scripts/optimize-images.test.ts` — `resizeArgs` cases, image-existence check
- `src/lib/githubCache.ts` — in-flight dedupe + TTL read-through
- `src/lib/githubCache.test.ts` — dedupe, TTL, storage-failure behaviour
- `assets-src/projects/` — relocated originals
- `docs/superpowers/manual-checks/2026-08-15-c2-payload.md`

**Modify**
- `tsconfig.node.json` — include `scripts`
- `vite.config.ts:13` — vitest `include` gains `'scripts/**/*.test.ts'`
- `package.json` — add `"images": "node scripts/optimize-images.ts"`
- `public/images/projects/` — 11 `.webp` replace 11 originals
- `src/data/projects.ts` — 11 `imageUrl` values to `.webp`
- `src/components/ProjectCard.tsx:22-26` — add `loading`, `decoding`
- `src/components/ProjectCard.test.tsx` — assert the two attributes
- `src/hooks/useGitHubProfile.ts:120-154` — call the cache; abort guards state only

**Do not modify**
- `src/hooks/useGitHubProfile.ts:46-118` (`fetchGitHubProfile`) and its seven
  existing tests — the cache wraps it from outside
- `ProjectCard.tsx:24` (`alt=""`)
- `carouselPositionStyles.ts` — settled by C1 and B3

## Task breakdown

| # | Task | Deliverable | Tests |
|---|---|---|---|
| 1 | Encoder script | `optimize-images.ts`, `resizeArgs`, `parsePixelWidth`, tsconfig + vitest includes, npm script | +6 |
| 2 | Encode and repoint | run script, relocate originals, `.webp` paths, existence test | +2 |
| 3 | Lazy loading | `loading="lazy"` `decoding="async"` | +2 |
| 4 | Cache module | `githubCache.ts` — dedupe, TTL, fallback | +6 |
| 5 | Wire the hook | `useGitHubProfile` consumes cache; abort guards state | +3 |
| 6 | Manual checks | Network-panel verification doc | — |

100 tests today, 118 after. Task 2's existence test is worth its keep: it
catches a rename typo in `projects.ts` that would otherwise ship as a silently
broken image.

**Ordering:** Task 1 before 2 (2 runs the script). Task 4 before 5 (5 imports
the module). Task 3 is independent of everything else.

## Error handling

| Condition | Behaviour |
|---|---|
| `sessionStorage.setItem` throws (Safari private mode) | Swallow, continue with the live result |
| Cached JSON malformed | Discard entry, fetch live |
| Cached entry past TTL | Discard entry, fetch live |
| Fetch rejects | Delete in-flight entry so the next mount retries; hook sets profile to null, as today |
| Consumer unmounts mid-flight | Fetch continues for other consumers; unmounted hook skips `setState` |
| `cwebp` missing when running the script | Script exits non-zero with an install hint |

## Testing

Unit tests cover `resizeArgs` (upscale, downscale, exact-match boundary), the
existence of every file `projects.ts` references, the two new `<img>`
attributes, and the cache's four behaviours (dedupe, TTL hit, TTL miss,
storage throw).

### What this slice will not prove

Recorded plainly, in the same spirit as B3's checklist:

- **No test measures real transfer size.** The 288 KB figure is measured with
  `stat` on encoded files, not observed over the wire. That the browser
  actually downloads ~288 KB is a manual check.
- **No test proves `loading="lazy"` defers anything.** jsdom does not implement
  lazy loading. The test asserts the attribute is present; only DevTools shows
  a deferred request.
- **No test proves the real request count drops.** The cache tests use a fake
  fetch and fake storage. The 4 → 2 → 0 progression is a Network-panel check.
- **No test exercises real `sessionStorage`.** Storage is injected precisely so
  tests avoid it. Safari private-mode behaviour is a manual check.

Task 6 records all of these as unticked boxes.

## Out of scope

- Slice D: `<head>` metadata and the 1200x630 OG image
- SPA deep-link 404s against the live Vercel URL
- `backdrop-blur-sm` and the permanent `willChange`, the next suspects if the
  carousel still stutters (noted in the C1 spec)
- Authenticating GitHub requests with a token — that needs a backend or a
  build-time secret, and neither exists in this project

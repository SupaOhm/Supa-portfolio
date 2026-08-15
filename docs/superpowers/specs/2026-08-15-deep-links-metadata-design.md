# Slice D — Deep Links & Link Previews (Design)

**Date:** 2026-08-15
**Branch:** `feat/deep-links-metadata`
**Status:** approved, ready for planning

## Problem

Three defects with one root cause: **the deployment was never told what to do
with a URL that is not `/`.**

`App.tsx` declares four routes, but nothing in the repo tells Vercel that this
is a single-page app. Vercel looks for a file at the requested path, finds
none, and returns its own 404 page before React ever loads. React Router never
runs, so its route table is irrelevant.

This survived six merged slices because nothing in the UI ever navigates to
those URLs — `Navbar` and `Hero` both call
`navigate('/', { state: { targetId } })`. The routes are reachable only by
typing, bookmarking, or sharing a link, which is exactly the path no
in-repo test or local `npm run dev` session exercises. `vite dev` and
`vite preview` both serve the SPA fallback themselves, so the bug is invisible
locally and appears only in production.

Separately, `index.html` carries three tags total (`charset`, `icon`,
`viewport`) plus a `<title>`. There is no description, no Open Graph, no
Twitter card, and no canonical URL, so every shared link renders as a bare URL
with no preview. And `README.md:5` advertises the GitHub repo URL under the
label "Live", so the README does not link to the live site at all.

## Measured starting state (2026-08-15)

Live probe against `https://supakornohm.vercel.app`:

| Path | HTTP |
|---|---|
| `/` | 200 |
| `/about` | **404** |
| `/projects` | **404** |
| `/connect` | **404** |
| `/nonexistent-xyz` | 404 |
| `/og.png` | 404 (does not exist yet) |

Repo state:

- `index.html`: 13 lines, 3 `<meta>`/`<link>` tags.
- `vercel.json`: **absent**. No deploy configuration is committed.
- `public/`: 12 files, 292,262 bytes (11 project `.webp` totalling 284,952 from
  Slice C2, plus `icon.png` at 7,310).
- Test suite: 119 tests across 18 files.
- The deploy URL appears nowhere in the repo.

## Decisions

### D1 — `/about`, `/projects`, `/connect` redirect to `/` and scroll

**Chosen over** rendering them as standalone pages, and over deleting the
routes entirely.

Standalone pages were rejected on evidence, not taste. Today those routes
render a bare section with no page scaffolding:

| | `/` | `/about` standalone |
|---|---|---|
| `<main>` landmark | yes (`Home.tsx:22`) | **none** — the only `<main>` in the codebase is in `Home.tsx` |
| `<h1>` | yes (`Hero.tsx:53`) | **none** — the only `<h1>` in the codebase is in `Hero.tsx` |
| Active nav highlight | yes | none — `Navbar.tsx:23` passes `{ enabled: location.pathname === '/' }` |

Fixing the rewrite without addressing this would not restore three working
pages; it would **publish three broken ones**. The 404 is currently masking the
defect. Making them real pages means building and then permanently syncing
three new landmarks, three `<h1>`s, and three titles against content that also
lives on `/` — duplicate URLs for identical content, which is also the thing
`<link rel="canonical">` exists to prevent.

Deleting the routes was rejected because old shared and bookmarked links would
silently land at the top of the homepage with no scroll and no explanation.

The redirect keeps one canonical URL, reuses the single `<main>`/`<h1>`, keeps
nav highlighting working, and lands the visitor on the section they asked for.

`replace: true` is required, not incidental: without it `/about` stays in
session history, and pressing Back bounces the visitor through the redirect
instead of returning them to where they came from.

### D2 — Catch-all rewrite plus a real `NotFound` route

The rewrite is `/(.*)` → `/index.html`, not an enumeration of the three known
routes.

Enumerating was rejected because it must be hand-edited every time a route is
added, and forgetting reintroduces precisely this bug. That is a trap, not a
safeguard.

But a catch-all has a consequence that must be handled rather than absorbed:
`/nonexistent-xyz` stops 404ing. Without a `*` route, no `<Route>` matches and
React renders `<Navbar />`, nothing, `<Footer />` — a **blank shell with no
explanation**, which is worse than the honest 404 it replaced. So the catch-all
and the `NotFound` route are a single decision, not two.

**Verified against Vercel's documentation, not assumed.** Two claims this
design rests on were checked rather than reasoned about:

- `vercel.json` reference: *"precedence is given to the filesystem prior to
  rewrites being applied."* So `/og.png` and the eleven project `.webp` files
  keep serving; the catch-all does **not** swallow static assets.
- The catch-all form used here is Vercel's own documented SPA example,
  verbatim: `{ "source": "/(.*)", "destination": "/index.html" }`.

**Do not convert this to the legacy `routes` property.** `routes` requires an
explicit `{ "handle": "filesystem" }` phase to get that ordering; `rewrites`,
per the same docs, *"checks the filesystem by default."* Rewriting this config
as `routes` without the handle phase would 404 every image on the site.

**Accepted limitation:** a Vercel rewrite cannot set a status code, so
`/nonexistent-xyz` will return **HTTP 200** with 404 content. This is a soft
404: correct for a human, imperfect for a crawler. Returning a true 404 status
requires a serverless function, which is out of scope for a static portfolio.
This is recorded here so a future reader finds a documented decision rather
than an apparent oversight.

### D3 — Static metadata in `index.html`, no head-management library

A consequence of D1 rather than an independent choice. Because every route
resolves to `/`, there is exactly one page to describe. Per-route titles would
have no route to attach to. Adding `react-helmet` or similar would introduce a
runtime dependency to manage a single unchanging `<head>`.

Exact values:

```html
<title>Supakorn Ohm — Computer Engineering Student & Developer</title>
<meta name="description" content="Supakorn Ohm — Computer Engineering student at SIIT, Thammasat. Full-stack projects in React, TypeScript, and Node. Seeking a Software Engineer internship." />
<link rel="canonical" href="https://supakornohm.vercel.app/" />
<meta name="theme-color" content="#030712" />
<meta property="og:type" content="website" />
<meta property="og:title" content="Supakorn Ohm — Computer Engineering Student & Developer" />
<meta property="og:description" content="Supakorn Ohm — Computer Engineering student at SIIT, Thammasat. Full-stack projects in React, TypeScript, and Node. Seeking a Software Engineer internship." />
<meta property="og:url" content="https://supakornohm.vercel.app/" />
<meta property="og:image" content="https://supakornohm.vercel.app/og.png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta name="twitter:card" content="summary_large_image" />
```

Notes on specific values:

- The description is 152 characters, under the ~155 where Google truncates.
- Its stack claim is verified, not aspirational: `Node.js` appears in both
  `Skills.tsx` and the project tags in `projects.ts`; `TypeScript` appears in
  `Skills.tsx`.
- `#030712` is Tailwind `gray-950`, which is what `index.css:11` actually
  paints on `body` — not a hand-picked approximation.
- `og:image` is absolute. Slack, LinkedIn, and X do not reliably resolve
  relative image URLs, which is why the origin is hardcoded here.
- `twitter:title` and `twitter:description` are deliberately absent, not
  forgotten: X falls back to the `og:` equivalents, so duplicating them
  creates two copies of the same string to keep in sync.
- The origin is hardcoded in four places (`canonical`, `og:url`, `og:image`,
  `README.md`). If a custom domain is added later, that is a one-line edit in
  each, all within this slice's files.

### D4 — OG image authored as HTML, rendered via Chrome

The existing `icon.png` is 512×512. At that aspect ratio, previews either
letterbox it or fall back to a small summary card, so a purpose-built 1200×630
image is required.

Local tooling was probed before choosing: `rsvg-convert`, ImageMagick, PIL, and
node-canvas are all **absent**. Available: Chrome, `sips`, `cwebp`, `qlmanage`.
`qlmanage` cannot reliably produce an exact non-square output size.

So the source is `assets-src/og/og.html`, rendered by **headless Chrome** to
`public/og.png`. This was probed end-to-end before being chosen, and the
mechanism is scriptable rather than manual:

```
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
  --screenshot=public/og.png --window-size=1200,630 file://…/og.html
```

Probe result: a 1200×630 PNG, 9,538 bytes, dimensions exact. So it becomes an
`npm run og` script rather than a hand-driven browser step — a meaningful
upgrade over the manual process originally sketched here, since the image
becomes regenerable by one command.

`--force-device-scale-factor=1` is what pins the output to exactly 1200×630;
without it the screenshot scales with the host display's DPR. `sips -z 630
1200` still runs afterwards as a cheap guarantee rather than a correction.

Two operational notes for whoever runs it: headless Chrome prints
`task_policy_set … (os/kern) invalid argument` to stderr on macOS — this is
harmless noise, not a failure, and the exit code is what matters. And like
`npm run images`, this is **macOS-and-local only**: it depends on Chrome at a
hardcoded `/Applications` path and must never run in CI.

This follows the convention Slice C2 already established: **sources live in
`assets-src/` (in-repo, outside `public/`, never deployed); generated output
lives in `public/` and is what ships.**

Screenshotting the live hero was rejected: the hero is a tall column with a
`5.5rem` `<h1>`, so a 1.91:1 crop cuts mid-headline, and the image would go
silently stale on every hero edit with nothing to detect it.

**Payload note:** `og.png` is fetched by crawlers, never by the page. It does
**not** count against the Slice C2 payload budget (284,952 bytes / 11 files).
This is stated explicitly so a future reader does not see a new ~100 KB PNG in
`public/` and conclude C2 regressed. Soft cap ≤300 KB, to be measured with
`stat -f%z` rather than estimated. If the render exceeds it, re-encode as
JPEG (`sips -s format jpeg -s formatOptions 85`) and update the `og:image`
extension — do not ship an oversized PNG and do not silently drop the cap.

## Components

| File | Change | Responsibility |
|---|---|---|
| `vercel.json` | create | Catch-all rewrite. The only deploy config in the repo. |
| `src/pages/RedirectToSection.tsx` | create | Takes `id`; effect calls `navigate('/', { replace: true, state: { targetId: id } })`; renders `null`. One component serves all three routes. |
| `src/pages/NotFound.tsx` | create | Honest 404 copy plus a link home. |
| `src/App.tsx` | modify | Three routes swap to `<RedirectToSection>`; add `<Route path="*" element={<NotFound />} />`. |
| `index.html` | modify | The tags in D3. |
| `assets-src/og/og.html` | create | OG card source. Not deployed. |
| `public/og.png` | create | Generated 1200×630. Ships. |
| `README.md:5` | modify | Repo URL → `https://supakornohm.vercel.app`. |

No existing component's behavior changes. `Home.tsx`'s effect already reads
`location.state.targetId` and calls `scrollToSection`; the redirect feeds that
existing path rather than adding a parallel one.

## Testing

### Where the tests live is a design decision, not a detail

`scripts/head-metadata.test.ts` must live under `scripts/`, **not** `src/`,
because it reads `index.html` and `public/og.png` from disk with `node:fs`.
`tsconfig.app.json` sets `"types": ["vite/client"]` with no Node types, so a
`node:` import under `src/` **passes `npm test` and fails `npm run typecheck`
with TS2307**. This project has lost debugging time to that asymmetry twice.
`vite.config.ts:13` already includes `scripts/**/*.test.ts` (added in Slice
C2), so the file is collected without further config changes.

### Suites

1. **`src/pages/RedirectToSection.dom.test.tsx`** (jsdom) — render `<App>` in a
   `MemoryRouter` at `/about`, `/projects`, `/connect`; assert the hero `<h1>`
   is in the document **and** that the scroll landed on the right section.
   Asserting on the rendered heading rather than on a mocked `navigate` call is
   deliberate: it proves `Home` actually mounted, which a spy on `navigate`
   would not.

   **`scrollIntoView` must be stubbed, or this test throws.** Probed on this
   project's jsdom: `typeof element.scrollIntoView === 'undefined'`. `Home`'s
   effect reaches it via `scrollToSection` (`useActiveSection.ts:90`) inside a
   `setTimeout(…, 0)`, so the failure would surface as a `TypeError` in a
   macrotask *after* the test body — confusing to diagnose and easy to
   misattribute. No existing test hits this, because none of them supply a
   `targetId`; this slice is the first to exercise that path.

   The stub belongs in `src/test/setup.ts`, alongside the `matchMedia` and
   `IntersectionObserver` stubs already there and documented the same way. Make
   it a `vi.fn()` rather than a no-op: the mock's `this` binding is what lets
   the test assert *which* element was scrolled to, upgrading the assertion
   from "Home mounted" to "Home mounted and scrolled to `#about`". The stub is
   the reason the stronger assertion is available at all.

   The access path is `mock.contexts`, verified by probe on this project's
   Vitest 4.1: after `el.scrollIntoView()` on an element with `id="about"`,
   `Element.prototype.scrollIntoView.mock.contexts[0].id === 'about'`.
2. **`src/pages/NotFound.dom.test.tsx`** (jsdom) — render at
   `/nonexistent-xyz`; assert the 404 copy renders and the home link is
   present.
   Rendering `<App>` mounts `About` and `Connect`, which both fetch on mount.
   Follow the convention already set in `landmarks.test.tsx:18` and
   `integration.a11y.test.tsx:27` — stub `fetch` with a never-settling promise
   so the components hold their static fallback copy and no state update lands
   after the test body. Also call `resetGitHubCache()` in `beforeEach`:
   `githubCache.ts` holds a module-level `inFlight` map that otherwise leaks
   between test files.

3. **`scripts/head-metadata.test.ts`** (node) — assert each tag from D3 is
   present in `index.html` with its exact value, and read the `public/og.png`
   IHDR header to assert the shipped file is genuinely 1200×630. Asserting
   dimensions rather than mere existence is the point: a wrong-sized file that
   exists would pass the weaker check and still break every preview.

### What no test in this branch can prove

Recorded here so the manual checklist inherits it rather than the branch
appearing better-verified than it is:

- That Vercel honors `vercel.json` — the rewrite only takes effect on a real
  deploy. **No test in this repo can exercise it.** This was measured, not
  assumed: with no `vercel.json` in the repo at all, `vite preview` already
  returns **200 and the SPA shell** for `/about`, `/projects`, `/connect`, and
  `/nonexistent-xyz`. A local HTTP check would pass identically before and
  after this slice.
- **A local HTTP check of `/og.png` is actively misleading.** In the same probe,
  `vite preview` returned **200 for `/og.png` when no such file existed** — the
  SPA fallback served `index.html` under the image's URL. This is why the
  metadata test reads `public/og.png` from disk and parses its IHDR header
  instead of requesting it over HTTP: the HTTP check passes on a missing file.
- That crawlers render the card. Requires the live URL in a real validator.
- That the `og.png` bytes look like the intended design — the test proves
  dimensions, not appearance.
- Landing scroll accuracy. `scrollToSection` (`useActiveSection.ts:86`) uses
  `setTimeout(…, 0)` before `scrollIntoView`. On a cold load of `/connect`,
  below-the-fold images have not laid out, so the landing offset may be off.
  Deliberately not engineered around in advance — it goes on the manual list to
  be observed first.
- The soft-404 status. `/nonexistent-xyz` returning HTTP 200 is a known,
  accepted limitation (D2), not a regression to be caught later.

## Out of scope

- A true HTTP 404 status (needs a serverless function).
- Per-route titles or a head-management library (moot under D1).
- `sitemap.xml` / `robots.txt` — worth doing, but a separate concern from
  fixing dead links and previews.
- Structured data (JSON-LD).
- A custom domain.

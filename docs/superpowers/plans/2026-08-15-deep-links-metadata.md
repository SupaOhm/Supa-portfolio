# Deep Links & Link Previews Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `/about`, `/projects`, and `/connect` resolve instead of returning HTTP 404 in production, and give shared links a real preview card.

**Architecture:** A catch-all Vercel rewrite hands every unmatched path to `index.html` so React Router can run at all. The three section URLs then mount a tiny `RedirectToSection` component that replaces the entry with `/` plus a `targetId`, feeding the scroll effect `Home` already has. A `*` route catches everything else with an honest 404. Static `<head>` metadata and a headless-Chrome-rendered 1200×630 card make links preview correctly.

**Tech Stack:** React 19.2, React Router 7, Vite 7, TypeScript 5.9 (`strict`, `erasableSyntaxOnly`), Vitest 4.1, Tailwind 3.4, headless Chrome (local render only).

**Spec:** `docs/superpowers/specs/2026-08-15-deep-links-metadata-design.md`

**Branch:** `feat/deep-links-metadata`

## Global Constraints

- **Origin is `https://supakornohm.vercel.app`** — used verbatim in `canonical`, `og:url`, `og:image`, and `README.md`. No trailing-slash variation: the site root is `https://supakornohm.vercel.app/` (with slash), the image is `https://supakornohm.vercel.app/og.png` (no slash).
- **Description string, exact, used in BOTH `meta[name=description]` and `og:description`:**
  `Supakorn Ohm — Computer Engineering student at SIIT, Thammasat. Full-stack projects in React, TypeScript, and Node. Seeking a Software Engineer internship.`
- **Title string, exact, used in BOTH `<title>` and `og:title`:**
  `Supakorn Ohm — Computer Engineering Student & Developer`
  **In HTML both must be written `&amp;`, not `&`.** Assertions match the encoded form.
- **The em-dash in both strings is `—` (U+2014), not a hyphen.** Copy them; do not retype.
- **`theme-color` is `#030712`** — Tailwind `gray-950`, what `src/index.css:11` paints on `body`.
- **OG image is exactly 1200×630 and ≤300 KB.** If the render exceeds the cap, re-encode as JPEG (`sips -s format jpeg -s formatOptions 85`) and update the `og:image` extension. Do not ship an oversized PNG and do not drop the cap.
- **Nothing under `src/` may import a `node:` module.** `tsconfig.app.json` sets `"types": ["vite/client"]` with no Node types, so such an import **passes `npm test` and fails `npm run typecheck` with TS2307**. Filesystem-reading tests go under `scripts/`, which `tsconfig.node.json` covers and `vite.config.ts:13` already collects via `scripts/**/*.test.ts`.
- **Use `rewrites` in `vercel.json`, never the legacy `routes`.** Per Vercel's docs, "precedence is given to the filesystem prior to rewrites being applied", and `rewrites` "checks the filesystem by default". `routes` requires an explicit `{ "handle": "filesystem" }` phase; without it every image on the site 404s.
- **Do not add a runtime dependency.** No `react-helmet` or equivalent — every route resolves to one page, so there is one `<head>` to describe.
- **`npm run og` is macOS-and-local only**, like `npm run images`. It must never run in CI.
- Every task ends with `npm test`, `npm run lint`, and `npm run typecheck` all green before committing.

## File Structure

| File | Task | Responsibility |
|---|---|---|
| `vercel.json` | 1 | Catch-all rewrite. The only deploy config in the repo. |
| `src/pages/RedirectToSection.tsx` | 1 | Replaces a section URL with `/` + `targetId`. Renders `null`. |
| `src/test/setup.ts` | 1 | Add the `scrollIntoView` stub beside the existing `matchMedia`/`IntersectionObserver` stubs. |
| `src/App.tsx` | 1, 2 | Route table. |
| `src/pages/RedirectToSection.dom.test.tsx` | 1 | Proves the three URLs land on Home and scroll to the right section. |
| `src/pages/NotFound.tsx` | 2 | Honest 404 with a link home. |
| `src/pages/NotFound.dom.test.tsx` | 2 | Proves unmatched URLs explain themselves. |
| `index.html` | 3 | All `<head>` metadata. |
| `README.md` | 3 | Live link points at the site, not the repo. |
| `scripts/head-metadata.test.ts` | 3, 4 | Reads `index.html` and `public/og.png` from disk. Must live here, not `src/`. |
| `assets-src/og/og.html` | 4 | OG card source. In repo, never deployed. |
| `scripts/render-og.ts` | 4 | `chromeArgs()` helper plus the render driver. |
| `scripts/render-og.test.ts` | 4 | Unit-tests `chromeArgs()` without shelling out. |
| `package.json` | 4 | Adds the `og` script. |
| `docs/superpowers/manual-checks/2026-08-15-d-deep-links.md` | 5 | What only a real deploy can confirm. |

**Test count:** starts at 119 across 18 files; ends at 145 across 22 files.

---

### Task 1: Deep-link redirects

**Files:**
- Create: `vercel.json`
- Create: `src/pages/RedirectToSection.tsx`
- Create: `src/pages/RedirectToSection.dom.test.tsx`
- Modify: `src/test/setup.ts`
- Modify: `src/App.tsx:5-7`, `src/App.tsx:15-17`

**Interfaces:**
- Consumes: `resetGitHubCache(): void` from `src/lib/githubCache.ts`; `scrollToSection(id: string): void` from `src/hooks/useActiveSection.ts` (called indirectly by `Home`).
- Produces: `RedirectToSection` — default export, props `{ id: string }`, returns `null`. Task 2 adds a sibling route to the same `<Routes>` block.

**Context you need:** `src/pages/Home.tsx:13-19` already has the receiving half of this feature — an effect that reads `location.state.targetId` and calls `scrollToSection`. This task only feeds it; do not modify `Home.tsx`.

- [ ] **Step 1: Write the failing test**

Create `src/pages/RedirectToSection.dom.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';
import { resetGitHubCache } from '../lib/githubCache';

afterEach(cleanup);

beforeEach(() => {
  // githubCache holds a module-level in-flight map that would otherwise leak
  // between test files in the same worker.
  resetGitHubCache();
  // About and Connect fetch on mount. A never-settling promise holds them on
  // their static fallback copy with no state update after the test body, which
  // would otherwise warn about updates outside act(). Same approach as
  // landmarks.test.tsx:18 and integration.a11y.test.tsx:27.
  vi.stubGlobal(
    'fetch',
    vi.fn(() => new Promise(() => {})),
  );
  vi.mocked(Element.prototype.scrollIntoView).mockClear();
});

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );

describe.each([
  ['/about', 'about'],
  ['/projects', 'projects'],
  ['/connect', 'connect'],
])('%s', (path, sectionId) => {
  it('renders the full home page, not a bare section', () => {
    renderAt(path);

    // Home owns the only <main> and Hero the only <h1> in the codebase. Finding
    // both is what proves the redirect landed on the assembled page rather than
    // rendering the section standalone.
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  it(`scrolls to the #${sectionId} section`, async () => {
    renderAt(path);

    // scrollToSection defers through setTimeout(…, 0), so the call has not
    // happened yet when render() returns.
    await waitFor(() => {
      const spy = vi.mocked(Element.prototype.scrollIntoView);
      expect(spy).toHaveBeenCalled();
      // `contexts` records each call's `this` — here, the scrolled element.
      // Asserting the id is the difference between "something scrolled" and
      // "the right section scrolled".
      expect((spy.mock.contexts[0] as Element).id).toBe(sectionId);
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/pages/RedirectToSection.dom.test.tsx`

Expected: FAIL. The first failure is `TypeError: Cannot read properties of undefined (reading 'mockClear')` from the `beforeEach`, because `Element.prototype.scrollIntoView` does not exist in jsdom yet.

- [ ] **Step 3: Add the scrollIntoView stub to the shared setup**

In `src/test/setup.ts`, inside the existing `if (typeof window !== 'undefined') {` block, after the `IntersectionObserver` definitions and before the closing brace, add:

```ts
  // jsdom does not implement scrollIntoView (probed: `typeof` is 'undefined').
  // Home's mount effect reaches it through scrollToSection
  // (useActiveSection.ts:90) whenever a targetId is present, inside a
  // setTimeout(…, 0) — so without this stub the failure surfaces as a
  // TypeError in a macrotask AFTER the test body, which is easy to
  // misattribute to something else entirely.
  //
  // A vi.fn() rather than a no-op: the mock records each call's `this` in
  // `mock.contexts`, which is what lets a test assert WHICH element was
  // scrolled to.
  Object.defineProperty(Element.prototype, 'scrollIntoView', {
    writable: true,
    configurable: true,
    value: vi.fn(),
  });
```

- [ ] **Step 4: Run the test again to confirm the failure moved**

Run: `npm test -- src/pages/RedirectToSection.dom.test.tsx`

Expected: still FAIL, but now on the assertions rather than the setup — `/about` renders `About` standalone, so `getByRole('main')` finds nothing. Expected message: `Unable to find an accessible element with the role "main"`.

This intermediate run matters: it confirms the stub fixed the harness without hiding the real defect.

- [ ] **Step 5: Create the redirect component**

Create `src/pages/RedirectToSection.tsx`:

```tsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface RedirectToSectionProps {
  id: string;
}

/**
 * Resolves a standalone section URL (/about, /projects, /connect) onto the
 * single canonical page.
 *
 * These sections render only inside `Home`, which owns the page's one <main>,
 * while `Hero` owns its one <h1>. Serving a section on its own route would
 * publish a page with neither landmark and no active nav highlight
 * (Navbar.tsx:23 disables it when pathname !== '/'), so these URLs redirect
 * rather than render.
 *
 * `replace: true` is required, not cosmetic: without it the section URL stays
 * in session history, so pressing Back returns to /about, which immediately
 * redirects forward again and traps the visitor.
 *
 * The scroll itself is not performed here — `Home` already has an effect that
 * reads `location.state.targetId` (Home.tsx:13-19). This component only
 * supplies that state.
 */
export default function RedirectToSection({ id }: RedirectToSectionProps) {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/', { replace: true, state: { targetId: id } });
  }, [navigate, id]);

  return null;
}
```

- [ ] **Step 6: Wire the three routes**

Replace the whole of `src/App.tsx` with:

```tsx
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import RedirectToSection from './pages/RedirectToSection';

function App() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<RedirectToSection id="about" />} />
        <Route path="/projects" element={<RedirectToSection id="projects" />} />
        <Route path="/connect" element={<RedirectToSection id="connect" />} />
      </Routes>
      <Footer />
    </div>
  );
}

export default App;
```

Note the `About`, `Projects`, and `Connect` imports are gone. They are still used — by `Home.tsx`, which imports them itself. Leaving them imported here would fail `npm run lint` under `noUnusedLocals`.

- [ ] **Step 7: Run the test to verify it passes**

Run: `npm test -- src/pages/RedirectToSection.dom.test.tsx`

Expected: PASS, 6 tests.

- [ ] **Step 8: Create the Vercel rewrite**

Create `vercel.json`:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

This exact source/destination pair is Vercel's own documented SPA example. Do not convert it to the legacy `routes` property — see Global Constraints.

**No test asserts this file's effect, and none can.** Probed: with no `vercel.json` present at all, `vite preview` already returns 200 and the SPA shell for all three routes. A local HTTP check passes identically before and after this change. Its verification is a manual post-deploy step, recorded in Task 5.

- [ ] **Step 9: Run the full suite and all gates**

Run each and confirm all three are green:

```bash
npm test
npm run lint
npm run typecheck
```

Expected: `npm test` reports **125 tests** across **19 files** (119 + 6). Lint and typecheck exit 0.

- [ ] **Step 10: Commit**

```bash
git add vercel.json src/App.tsx src/pages/RedirectToSection.tsx src/pages/RedirectToSection.dom.test.tsx src/test/setup.ts
git commit -m "fix: resolve /about, /projects and /connect instead of 404ing

Every link to those routes was dead in production. Vercel looked for a
file at the path, found none, and returned its own 404 before React
loaded, so the route table never ran. It survived six slices because
Navbar and Hero navigate with state and never push those URLs.

A catch-all rewrite hands unmatched paths to index.html, and the three
section URLs now replace themselves with / plus a targetId, feeding
the scroll effect Home already had. They redirect rather than render
standalone because Home owns the only <main> and Hero the only <h1> —
serving them alone would publish three landmark-less pages.

Adds the scrollIntoView stub jsdom lacks, which the redirect path is
the first test to reach."
```

---

### Task 2: Honest 404 for unmatched URLs

**Files:**
- Create: `src/pages/NotFound.tsx`
- Create: `src/pages/NotFound.dom.test.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `RedirectToSection` (Task 1) is already wired; leave those routes untouched.
- Produces: `NotFound` — default export, no props.

**Context you need:** Task 1's catch-all rewrite means `/nonexistent-xyz` no longer 404s at the edge. Without a `*` route, no `<Route>` matches and React renders `<Navbar />`, nothing, `<Footer />` — a blank shell with no explanation, which is worse than the 404 it replaced. This task is the other half of that decision, not an optional extra.

- [ ] **Step 1: Write the failing test**

Create `src/pages/NotFound.dom.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';
import { resetGitHubCache } from '../lib/githubCache';

afterEach(cleanup);

beforeEach(() => {
  resetGitHubCache();
  vi.stubGlobal(
    'fetch',
    vi.fn(() => new Promise(() => {})),
  );
});

describe('unmatched URLs', () => {
  const renderAt = (path: string) =>
    render(
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>,
    );

  it('explains that the page was not found', () => {
    renderAt('/nonexistent-xyz');

    expect(screen.getByRole('heading', { name: /page not found/i })).toBeInTheDocument();
  });

  it('offers a route back to the portfolio', () => {
    renderAt('/nonexistent-xyz');

    // Asserting the href, not just that a link exists: a "back home" link that
    // points anywhere else is the whole failure mode this guards.
    expect(screen.getByRole('link', { name: /back to portfolio/i })).toHaveAttribute('href', '/');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/pages/NotFound.dom.test.tsx`

Expected: FAIL with `Unable to find an accessible element with the role "heading" and name /page not found/i` — no route matches `/nonexistent-xyz`, so nothing renders between Navbar and Footer. That blank render is exactly the defect this task removes.

- [ ] **Step 3: Create the NotFound page**

Create `src/pages/NotFound.tsx`:

```tsx
import { Link } from 'react-router-dom';

/**
 * Rendered for any URL the route table does not match.
 *
 * Required by the catch-all rewrite in vercel.json: because every unmatched
 * path is now handed to index.html, an unknown URL would otherwise render
 * nothing at all between Navbar and Footer.
 *
 * This is a soft 404 — Vercel returns HTTP 200 because a rewrite cannot set a
 * status code. Correct for a human, imperfect for a crawler; a true 404 status
 * would need a serverless function. See the spec's decision D2.
 */
export default function NotFound() {
  return (
    <main className="min-h-[60vh] flex items-center justify-center px-4 sm:px-6 lg:px-8 py-20">
      <div className="text-center max-w-lg">
        <p className="font-mono text-blue-400 mb-4 text-sm uppercase tracking-widest">
          // Error_404
        </p>
        <h1 className="text-4xl sm:text-5xl font-black tracking-[-0.03em] mb-4">
          Page not found
        </h1>
        <p className="text-gray-400 mb-8 leading-relaxed">
          That URL does not exist. It may have been mistyped, or the link that
          brought you here may be out of date.
        </p>
        <Link
          to="/"
          className="inline-block px-6 py-3 rounded-md border border-blue-500/40 bg-blue-500/10 text-blue-300 hover:border-blue-400/70 hover:text-blue-200 transition-colors duration-200"
        >
          Back to portfolio
        </Link>
      </div>
    </main>
  );
}
```

The `<main>` here is deliberate and does not conflict with `Home`'s: only one route renders at a time, so the page still has exactly one `<main>` landmark.

- [ ] **Step 4: Add the catch-all route**

In `src/App.tsx`, add the import after the `RedirectToSection` import:

```tsx
import NotFound from './pages/NotFound';
```

and add this route as the **last** child of `<Routes>`, immediately after the `/connect` route:

```tsx
        <Route path="*" element={<NotFound />} />
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test -- src/pages/NotFound.dom.test.tsx`

Expected: PASS, 2 tests.

- [ ] **Step 6: Run the full suite and all gates**

```bash
npm test
npm run lint
npm run typecheck
```

Expected: **127 tests** across **20 files**. Lint and typecheck exit 0.

Task 1's redirect tests must still pass — the `*` route is last, so it does not shadow them. If they now fail, the route was inserted in the wrong position.

- [ ] **Step 7: Commit**

```bash
git add src/App.tsx src/pages/NotFound.tsx src/pages/NotFound.dom.test.tsx
git commit -m "fix: show a real 404 page for unmatched URLs

The catch-all rewrite means an unknown path no longer 404s at the
edge, so without a * route React rendered Navbar, nothing, Footer — a
blank shell with no explanation, worse than the 404 it replaced.

This is a soft 404: Vercel returns HTTP 200 because a rewrite cannot
set a status code. Correct for a human, imperfect for a crawler, and
documented as accepted in the spec rather than left to look like an
oversight."
```

---

### Task 3: Head metadata and the README live link

**Files:**
- Modify: `index.html:3-8`
- Modify: `README.md:5`
- Create: `scripts/head-metadata.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: the `ORIGIN`, `TITLE_HTML`, and `DESCRIPTION` constants in `scripts/head-metadata.test.ts`; Task 4 extends the same file with image assertions.

**Context you need — read this before writing the test file.** This test reads files from disk with `node:fs`, so it **must** live under `scripts/`. `tsconfig.app.json` sets `"types": ["vite/client"]` with no Node types, so a `node:` import under `src/` passes `npm test` and fails `npm run typecheck` with TS2307. This project has lost debugging time to that asymmetry twice. `vite.config.ts:13` already collects `scripts/**/*.test.ts`, so no config change is needed.

- [ ] **Step 1: Write the failing test**

Create `scripts/head-metadata.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Resolved from this file's own URL rather than process.cwd(), so the test does
// not depend on which directory vitest was invoked from.
const readRepoFile = (relative: string): string =>
  readFileSync(fileURLToPath(new URL(`../${relative}`, import.meta.url)), 'utf-8');

const html = readRepoFile('index.html');
const readme = readRepoFile('README.md');

const ORIGIN = 'https://supakornohm.vercel.app';
const DESCRIPTION =
  'Supakorn Ohm — Computer Engineering student at SIIT, Thammasat. Full-stack projects in React, TypeScript, and Node. Seeking a Software Engineer internship.';
// `&` must be written `&amp;` in HTML, so the file contains the encoded form.
const TITLE_HTML = 'Supakorn Ohm — Computer Engineering Student &amp; Developer';

/** Extracts a meta tag's content by its `name` or `property` attribute. */
const metaContent = (attr: 'name' | 'property', key: string): string | undefined =>
  html.match(new RegExp(`<meta\\s+${attr}="${key}"\\s+content="([^"]*)"`, 'i'))?.[1];

describe('index.html head metadata', () => {
  it('sets the document title', () => {
    expect(html).toContain(`<title>${TITLE_HTML}</title>`);
  });

  it('declares the meta description', () => {
    expect(metaContent('name', 'description')).toBe(DESCRIPTION);
  });

  it('keeps the description under the 155 characters Google truncates at', () => {
    expect(DESCRIPTION.length).toBeLessThanOrEqual(155);
  });

  it('declares a canonical URL', () => {
    expect(html).toContain(`<link rel="canonical" href="${ORIGIN}/" />`);
  });

  it('declares the theme colour Tailwind gray-950 paints on body', () => {
    expect(metaContent('name', 'theme-color')).toBe('#030712');
  });

  it('declares og:type as website', () => {
    expect(metaContent('property', 'og:type')).toBe('website');
  });

  it('declares og:url as the canonical root', () => {
    expect(metaContent('property', 'og:url')).toBe(`${ORIGIN}/`);
  });

  it('declares an ABSOLUTE og:image', () => {
    // Slack, LinkedIn and X do not reliably resolve relative image URLs, so a
    // path-only value silently produces a card with no image.
    expect(metaContent('property', 'og:image')).toBe(`${ORIGIN}/og.png`);
  });

  it('declares the og:image dimensions', () => {
    expect(metaContent('property', 'og:image:width')).toBe('1200');
    expect(metaContent('property', 'og:image:height')).toBe('630');
  });

  it('requests the large summary card', () => {
    expect(metaContent('name', 'twitter:card')).toBe('summary_large_image');
  });

  it('keeps og:title and og:description identical to their non-OG twins', () => {
    // Two copies of each string exist by necessity. This is what stops them
    // drifting apart when one gets edited.
    expect(metaContent('property', 'og:description')).toBe(DESCRIPTION);
    expect(html).toContain(`<meta property="og:title" content="${TITLE_HTML}" />`);
  });
});

describe('README live link', () => {
  // Co-located with the head metadata because it hardcodes the same origin and
  // must be updated in the same breath if a custom domain ever lands.
  it('points at the deployed site', () => {
    expect(readme).toContain(`🔗 **Live:** ${ORIGIN}`);
  });

  it('no longer advertises the repository URL as the live site', () => {
    expect(readme).not.toContain('**Live:** `https://github.com/SupaOhm/Supa-portfolio`');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- scripts/head-metadata.test.ts`

Expected: FAIL, 13 failing. The first is the title assertion — `index.html:7` currently reads `<title>Supakorn Ohm</title>`.

- [ ] **Step 3: Write the metadata into index.html**

Replace lines 3-8 of `index.html` (the entire `<head>` element) with:

```html
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/png" href="/icon.png" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Supakorn Ohm — Computer Engineering Student &amp; Developer</title>
    <meta name="description" content="Supakorn Ohm — Computer Engineering student at SIIT, Thammasat. Full-stack projects in React, TypeScript, and Node. Seeking a Software Engineer internship." />
    <link rel="canonical" href="https://supakornohm.vercel.app/" />
    <meta name="theme-color" content="#030712" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="Supakorn Ohm — Computer Engineering Student &amp; Developer" />
    <meta property="og:description" content="Supakorn Ohm — Computer Engineering student at SIIT, Thammasat. Full-stack projects in React, TypeScript, and Node. Seeking a Software Engineer internship." />
    <meta property="og:url" content="https://supakornohm.vercel.app/" />
    <meta property="og:image" content="https://supakornohm.vercel.app/og.png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta name="twitter:card" content="summary_large_image" />
  </head>
```

Do not retype the em-dashes — they are U+2014 (`—`). `twitter:title` and `twitter:description` are deliberately absent: X falls back to the `og:` equivalents, so adding them would create two more copies of the same strings to keep in sync.

- [ ] **Step 4: Fix the README live link**

In `README.md`, replace line 5:

```markdown
🔗 **Live:** `https://github.com/SupaOhm/Supa-portfolio`
```

with:

```markdown
🔗 **Live:** https://supakornohm.vercel.app
```

The backticks are removed deliberately: as code-formatted text the URL is not clickable, which is half of why the wrong link went unnoticed.

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test -- scripts/head-metadata.test.ts`

Expected: PASS, 13 tests.

If the title or description assertions fail on what looks like identical text, the em-dash was retyped as a hyphen or the `&` was not encoded as `&amp;`.

- [ ] **Step 6: Run the full suite and all gates**

```bash
npm test
npm run lint
npm run typecheck
```

Expected: **140 tests** across **21 files**. Lint and typecheck exit 0.

- [ ] **Step 7: Commit**

```bash
git add index.html README.md scripts/head-metadata.test.ts
git commit -m "feat: add head metadata and fix the README live link

index.html carried three tags and no description, so every shared link
rendered as a bare URL with no preview. Adds description, canonical,
theme-color, Open Graph and Twitter card tags.

og:image is absolute because Slack, LinkedIn and X do not reliably
resolve relative image URLs — a path-only value silently yields a card
with no image.

README line 5 advertised the GitHub repo URL under the label 'Live',
so the README never linked to the live site at all.

The test lives under scripts/ because it reads from disk with node:fs;
under src/ that import passes npm test and fails npm run typecheck
with TS2307, since tsconfig.app.json declares no Node types."
```

---

### Task 4: The OG card

**Files:**
- Create: `assets-src/og/og.html`
- Create: `scripts/render-og.ts`
- Create: `scripts/render-og.test.ts`
- Create: `public/og.png` (generated)
- Modify: `package.json` (scripts)
- Modify: `scripts/head-metadata.test.ts` (append one describe block)

**Interfaces:**
- Consumes: the `ORIGIN` constant already defined in `scripts/head-metadata.test.ts` (Task 3); `og:image` metadata already asserted there.
- Produces: `chromeArgs(sourceUrl: string, outputPath: string, width?: number, height?: number): string[]`, plus `OG_WIDTH: 1200`, `OG_HEIGHT: 630`, `CHROME_BIN: string` — all exported from `scripts/render-og.ts`.

**Context you need:** this mirrors `scripts/optimize-images.ts`, which already exists and follows the same shape — a pure exported helper that is unit-testable, plus a driver guarded so that importing the module in a test never shells out. Read that file first and match its structure.

- [ ] **Step 1: Write the failing test for the argument builder**

Create `scripts/render-og.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { chromeArgs, OG_WIDTH, OG_HEIGHT } from './render-og';

describe('chromeArgs', () => {
  it('requests a screenshot of the given source at the given path', () => {
    const args = chromeArgs('file:///tmp/og.html', '/tmp/out.png');

    expect(args).toContain('--headless');
    expect(args).toContain('--screenshot=/tmp/out.png');
    expect(args).toContain('file:///tmp/og.html');
  });

  it('pins the device scale factor to 1', () => {
    // Without this flag the screenshot scales with the host display's DPR, so
    // the same command yields 2400x1260 on a Retina machine. This is the single
    // flag that makes the output size reproducible across machines.
    expect(chromeArgs('file:///tmp/og.html', '/tmp/out.png')).toContain(
      '--force-device-scale-factor=1',
    );
  });

  it('sizes the window to the OG card dimensions', () => {
    expect(chromeArgs('file:///tmp/og.html', '/tmp/out.png')).toContain(
      `--window-size=${OG_WIDTH},${OG_HEIGHT}`,
    );
    expect([OG_WIDTH, OG_HEIGHT]).toEqual([1200, 630]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- scripts/render-og.test.ts`

Expected: FAIL with `Failed to resolve import "./render-og"`.

- [ ] **Step 3: Write the render script**

Create `scripts/render-og.ts`:

```ts
import { execFileSync } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { join } from 'node:path';

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

/**
 * Hardcoded because this script is macOS-and-local only, exactly like
 * `npm run images`. It must never run in CI.
 */
export const CHROME_BIN = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

/** Soft cap from the spec. Over this, re-encode as JPEG rather than shipping it. */
export const MAX_BYTES = 300_000;

/**
 * Builds the headless Chrome invocation.
 *
 * `--force-device-scale-factor=1` is the flag that pins the output to exactly
 * WIDTHxHEIGHT; without it the screenshot scales with the host display's device
 * pixel ratio and a Retina machine silently produces a 2400x1260 image.
 */
export function chromeArgs(
  sourceUrl: string,
  outputPath: string,
  width: number = OG_WIDTH,
  height: number = OG_HEIGHT,
): string[] {
  return [
    '--headless',
    '--disable-gpu',
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    `--screenshot=${outputPath}`,
    `--window-size=${width},${height}`,
    sourceUrl,
  ];
}

function main(): void {
  if (!existsSync(CHROME_BIN)) {
    throw new Error(
      `Google Chrome not found at ${CHROME_BIN}. This script is macOS-only, like npm run images.`,
    );
  }

  const root = fileURLToPath(new URL('..', import.meta.url));
  const source = pathToFileURL(join(root, 'assets-src/og/og.html')).href;
  const output = join(root, 'public/og.png');

  // Chrome prints `task_policy_set … (os/kern) invalid argument` to stderr on
  // macOS. It is harmless noise, not a failure — the exit code is what matters.
  execFileSync(CHROME_BIN, chromeArgs(source, output), { stdio: 'inherit' });

  // Belt and braces: --force-device-scale-factor=1 should already have produced
  // exact dimensions, so this normalises rather than corrects. Note sips takes
  // HEIGHT then WIDTH.
  execFileSync('sips', ['-z', String(OG_HEIGHT), String(OG_WIDTH), output], { stdio: 'ignore' });

  const bytes = statSync(output).size;
  console.log(`public/og.png: ${OG_WIDTH}x${OG_HEIGHT}, ${bytes} bytes`);
  if (bytes > MAX_BYTES) {
    console.warn(`WARNING: ${bytes} bytes exceeds the ${MAX_BYTES} cap. Re-encode as JPEG.`);
  }
}

// Guarded so that importing this module from a test never shells out to Chrome.
if (process.argv[1]?.endsWith('render-og.ts')) {
  main();
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- scripts/render-og.test.ts`

Expected: PASS, 3 tests. Chrome must NOT launch — if it does, the `process.argv[1]` guard is wrong.

- [ ] **Step 5: Build the card source**

Create `assets-src/og/og.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: 1200px; height: 630px; overflow: hidden; }

      body {
        position: relative;
        background: #030712;
        color: #f3f4f6;
        font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
      }

      /* Echoes the cursor-following glows the live site uses on its cards. */
      .glow {
        position: absolute;
        border-radius: 9999px;
        filter: blur(110px);
      }
      .glow-a { width: 620px; height: 620px; top: -220px; left: -140px;
                background: rgba(59, 130, 246, 0.28); }
      .glow-b { width: 520px; height: 520px; bottom: -240px; right: -120px;
                background: rgba(168, 85, 247, 0.22); }

      .frame {
        position: absolute;
        inset: 44px;
        border: 1px solid rgba(75, 85, 99, 0.5);
        background: rgba(3, 7, 18, 0.6);
        padding: 66px 72px;
        display: flex;
        flex-direction: column;
        justify-content: center;
      }

      /* The site's signature corner markers (index.css .marker-cross). */
      .frame::before, .frame::after,
      .corners::before, .corners::after {
        content: '';
        position: absolute;
        background-color: rgba(156, 163, 175, 0.4);
      }
      .frame::before { top: 16px; left: -1px; width: 34px; height: 1px; }
      .frame::after  { top: -1px; left: 16px; width: 1px; height: 34px; }
      .corners::before { bottom: 16px; right: -1px; width: 34px; height: 1px; }
      .corners::after  { bottom: -1px; right: 16px; width: 1px; height: 34px; }

      .eyebrow {
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size: 21px;
        letter-spacing: 0.32em;
        text-transform: uppercase;
        color: #60a5fa;
        margin-bottom: 30px;
      }

      h1 {
        font-size: 104px;
        font-weight: 900;
        letter-spacing: -0.04em;
        line-height: 0.92;
      }
      .given {
        background: linear-gradient(90deg, #93c5fd 0%, #a5f3fc 45%, #3b82f6 100%);
        -webkit-background-clip: text;
        background-clip: text;
        color: transparent;
      }
      .family { color: #f3f4f6; }

      .affiliation {
        margin-top: 26px;
        font-size: 30px;
        font-weight: 500;
        letter-spacing: -0.02em;
        color: #d1d5db;
      }

      .rule {
        margin: 44px 0 30px;
        height: 1px;
        background: linear-gradient(90deg, rgba(96,165,250,0.5), rgba(75,85,99,0.15));
      }

      .footer {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size: 22px;
        color: #9ca3af;
      }
      .footer .url { color: #93c5fd; }
    </style>
  </head>
  <body>
    <div class="glow glow-a"></div>
    <div class="glow glow-b"></div>
    <div class="frame">
      <div class="corners"></div>
      <p class="eyebrow">// Computer_Engineering</p>
      <h1>
        <span class="given">Supakorn</span>
        <span class="family">Prayongyam</span>
      </h1>
      <p class="affiliation">SIIT, Thammasat University</p>
      <div class="rule"></div>
      <div class="footer">
        <span>Full-stack &middot; React &middot; TypeScript &middot; Node</span>
        <span class="url">supakornohm.vercel.app</span>
      </div>
    </div>
  </body>
</html>
```

Fonts are system stacks by design — the CSP-free local render has no font CDN to rely on, and a webfont URL would silently fall back.

- [ ] **Step 6: Add the npm script**

In `package.json`, add to `"scripts"`, immediately after the `"images"` entry:

```json
    "og": "node scripts/render-og.ts"
```

Like `"images"`, this executes a bare `.ts` file and therefore needs Node 22.18+/23.6+ for unflagged native type stripping. It will fail with a parse error on the project's Node 20 `engines` floor. That is accepted for both scripts: they are manual, local, macOS-only tools.

- [ ] **Step 7: Render the card**

Run: `npm run og`

Expected output ends with a line of the form `public/og.png: 1200x630, <N> bytes`, with N well under 300000. The `task_policy_set … (os/kern) invalid argument` lines on stderr are harmless.

Then look at the generated file before trusting it:

```bash
sips -g pixelWidth -g pixelHeight public/og.png
stat -f%z public/og.png
```

Expected: `pixelWidth: 1200`, `pixelHeight: 630`.

**Open `public/og.png` and actually look at it.** The dimension test in Step 8 proves size, never appearance — a card with clipped text or an invisible gradient passes every automated check in this plan.

- [ ] **Step 8: Write the failing image assertions**

Append to the end of `scripts/head-metadata.test.ts`:

```ts
describe('public/og.png', () => {
  // Read lazily inside each test rather than in the describe body. A
  // describe-level read of a missing file throws during collection and takes
  // this whole file's other 13 tests down with a confusing error, instead of
  // failing one test with a clear ENOENT.
  //
  // The `readRepoFile` helper above cannot be reused: it decodes as UTF-8,
  // which corrupts binary bytes.
  const readPng = (): Buffer =>
    readFileSync(fileURLToPath(new URL('../public/og.png', import.meta.url)));

  /**
   * Reads dimensions straight from the IHDR chunk: bytes 0-7 are the PNG
   * signature, 8-11 the chunk length, 12-15 the type, then width and height as
   * big-endian uint32s.
   */
  const dimensions = (buffer: Buffer): { width: number; height: number } => {
    expect(buffer.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  };

  it('is exactly the 1200x630 the og:image tags advertise', () => {
    // Asserted from the file's own bytes rather than by requesting the URL:
    // probed, vite preview returns 200 for /og.png even when no such file
    // exists, because the SPA fallback serves index.html under the image's URL.
    // An HTTP check therefore passes on a missing file.
    expect(dimensions(readPng())).toEqual({ width: 1200, height: 630 });
  });

  it('stays under the size budget', () => {
    // Imported, not retyped: the cap also gates the warning in render-og.ts,
    // and two hardcoded copies would drift the moment one is tuned.
    expect(readPng().byteLength).toBeLessThanOrEqual(MAX_BYTES);
  });
});
```

Add `MAX_BYTES` to the imports at the top of the file:

```ts
import { MAX_BYTES } from './render-og';
```

Importing a value from `render-og.ts` does not shell out to Chrome — its driver is behind the `process.argv[1]` guard.

- [ ] **Step 9: Run the tests to verify they pass**

Run: `npm test -- scripts/head-metadata.test.ts scripts/render-og.test.ts`

Expected: PASS, 18 tests (13 from Task 3 + 2 image + 3 chromeArgs).

- [ ] **Step 10: Run the full suite and all gates**

```bash
npm test
npm run lint
npm run typecheck
```

Expected: **145 tests** across **22 files**. Lint and typecheck exit 0.

- [ ] **Step 11: Commit**

```bash
git add assets-src/og/og.html scripts/render-og.ts scripts/render-og.test.ts scripts/head-metadata.test.ts public/og.png package.json
git commit -m "feat: add a 1200x630 Open Graph card

The existing icon.png is 512x512, so previews either letterboxed it or
fell back to a small summary card.

Source lives in assets-src/ and the generated PNG in public/, matching
the convention Slice C2 set for project images. Rendering is scripted
rather than manual: no SVG rasteriser, ImageMagick, PIL or node-canvas
is available locally, but headless Chrome produces an exact 1200x630
PNG, so npm run og regenerates the card in one command.

--force-device-scale-factor=1 is the flag that makes the output size
reproducible; without it the screenshot scales with the host display's
DPR and a Retina machine yields 2400x1260.

The dimension test parses the PNG IHDR chunk from disk rather than
requesting the URL, because vite preview returns 200 for /og.png even
when no such file exists — the SPA fallback serves index.html under
the image's URL, so an HTTP check passes on a missing file.

og.png is fetched by crawlers, never by the page, so it does not count
against the Slice C2 payload budget."
```

---

### Task 5: Manual verification checklist

**Files:**
- Create: `docs/superpowers/manual-checks/2026-08-15-d-deep-links.md`

**Interfaces:**
- Consumes: everything Tasks 1-4 built.
- Produces: nothing consumed by code.

**Context you need:** the single most important thing in this slice — the Vercel rewrite — has no automated coverage and cannot have any. Probed: with no `vercel.json` present at all, `vite preview` already returns 200 and the SPA shell for all three routes. This document is the only verification that exists for it. Follow the format of `docs/superpowers/manual-checks/2026-08-15-c2-payload.md`.

- [ ] **Step 1: Write the checklist**

Create `docs/superpowers/manual-checks/2026-08-15-d-deep-links.md`:

```markdown
# Slice D manual checks — deep links & link previews

Every box here is unticked on purpose. Nothing in this list is covered by the
test suite, and most of it **cannot** be: the rewrite only takes effect on a
real deploy.

## Deep links (deployed)

- [ ] `https://supakornohm.vercel.app/about` returns 200, not 404
- [ ] `https://supakornohm.vercel.app/projects` returns 200, not 404
- [ ] `https://supakornohm.vercel.app/connect` returns 200, not 404
- [ ] Each lands on `/` in the URL bar (the redirect used `replace`)
- [ ] Each scrolls to the right section, not the top of the page
- [ ] Pressing Back after landing returns to the previous site, NOT to /about
- [ ] Nav highlight shows the correct section after landing

Command: `for p in /about /projects /connect; do curl -s -o /dev/null -w "$p %{http_code}\n" https://supakornohm.vercel.app$p; done`

## Static assets survived the catch-all

The rewrite is the highest-risk change in this slice. Vercel's docs say the
filesystem takes precedence, but confirm it rather than trusting it.

- [ ] `https://supakornohm.vercel.app/og.png` returns a PNG, not HTML
- [ ] Project images still load on the deployed page (open DevTools → Network, filter Img, confirm 200s and `image/webp`)
- [ ] `https://supakornohm.vercel.app/icon.png` still returns the favicon

## 404 behaviour (deployed)

- [ ] `/nonexistent-xyz` shows the "Page not found" page, not a blank shell
- [ ] Its "Back to portfolio" link returns to the homepage
- [ ] Known-and-accepted: the response status is **200**, not 404. A rewrite
      cannot set a status code. Confirm it is 200 and that this is understood,
      rather than discovering it later and treating it as a regression.

## Link previews

Each of these renders the card independently — passing one does not imply the others.

- [ ] Facebook / Open Graph: https://developers.facebook.com/tools/debug/
- [ ] X / Twitter card validator
- [ ] LinkedIn Post Inspector: https://www.linkedin.com/post-inspector/
- [ ] Paste the URL into Slack or Discord and confirm a large image card appears
- [ ] The card's text is legible at the small size used in a feed

## The card itself

- [ ] Open `public/og.png` and look at it — no clipped text, no missing gradient
- [ ] `sips -g pixelWidth -g pixelHeight public/og.png` reports 1200 x 630
- [ ] `stat -f%z public/og.png` is under 300000
- [ ] `npm run og` regenerates it reproducibly (run twice, compare sizes)

## Scroll landing accuracy

- [ ] On a COLD load of `/connect` (hard refresh, empty cache), the page lands
      on the Connect section and not slightly off it

`scrollToSection` (`useActiveSection.ts:90`) defers by `setTimeout(…, 0)`. On a
cold load, below-the-fold images have not laid out yet, so the offset may be
wrong. Deliberately not engineered around in advance — observe first, and only
fix it if it actually misbehaves.

- [ ] Repeat with reduced motion enabled (System Settings → Accessibility →
      Display → Reduce motion) and confirm it jumps instead of animating

## What no test in this branch proves

- That Vercel honours `vercel.json` at all. Probed: with no `vercel.json` in the
  repo, `vite preview` already returns 200 and the SPA shell for all three
  routes and for `/nonexistent-xyz`. No local check can tell a correct config
  from a missing one.
- That `/og.png` is reachable over HTTP. The same probe returned 200 for
  `/og.png` while no such file existed. The test asserts the file's bytes on
  disk instead.
- That the card looks right. The tests prove dimensions and byte size, never
  appearance.
- That crawlers actually fetch and render the card.
- That the redirect's `replace: true` produces correct Back behaviour in a real
  browser. `MemoryRouter` is not a history stack.
```

- [ ] **Step 2: Commit**

```bash
git add docs/superpowers/manual-checks/2026-08-15-d-deep-links.md
git commit -m "docs: add Slice D manual verification checklist

The rewrite is the most important change in this slice and has no
automated coverage, nor can it have any: probed, vite preview returns
200 and the SPA shell for all three routes with no vercel.json present
at all, so no local check distinguishes a correct config from a
missing one.

Includes the static-asset checks the catch-all makes worth confirming,
and records the accepted 200-status soft 404 so it is not later
mistaken for a regression."
```

---

## Definition of Done

- [ ] All 5 tasks complete
- [ ] `npm test` — 145 tests across 22 files
- [ ] `npm run lint` — exit 0
- [ ] `npm run typecheck` — exit 0
- [ ] `npm run build` — succeeds
- [ ] `public/og.png` exists, is 1200×630, and has been looked at
- [ ] Manual checklist exists with every box unticked, ready for post-deploy

# Hero Editorial Masthead Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the portfolio's AI-generated-looking hero — typewriter, fake code block, blueprint grid, cursor glow — with an editorial masthead set in a real typeface, putting the IEEE Best Paper award and the internship availability above the fold.

**Architecture:** One rewritten component (`Hero.tsx`) reading every fact from `src/data/profile.ts`, styled with Tailwind v4 utilities plus four `@utility` rules in `index.css` for the things Tailwind has no utility for (`font-variation-settings`, container-relative nameplate sizing). A self-hosted variable `.woff2` follows the repo's existing `assets-src/` → script → `public/` convention. Deletions of now-dead CSS and hooks happen last, after every consumer has stopped referencing them.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS v4 (`@utility`, container queries), Vitest + Testing Library (jsdom opt-in per file), Bricolage Grotesque variable from Fontsource 5.3.0.

**Spec:** `docs/superpowers/specs/2026-09-09-hero-editorial-redesign-design.md`

## Global Constraints

- **Nothing under `src/` may import a `node:` module.** `tsconfig.app.json` sets `"types": ["vite/client"]` with no Node types. Such an import passes `npm test` (vitest does not type-check) and fails `npm run typecheck` with TS2307. Node-using tests live in `scripts/`.
- **Tests default to `environment: 'node'`.** A file needing a DOM must have `// @vitest-environment jsdom` as its **first line**.
- **jsdom performs no layout.** Every `getBoundingClientRect()` returns zeros, `innerHeight` is 768. Do not write a test that asserts a breakpoint, a `cqi` size, or a pixel hit area — it will pass while asserting nothing.
- **No profile fact may be hardcoded in a component.** `scripts/profile-drift.test.ts` scans every `src/components/*.tsx` and fails on a `\d(?:st|nd|rd|th) Year` literal, a `GPA[:\s|]*\d\.\d{1,2}` literal, the email, the GitHub username, or the LinkedIn handle.
- **Custom utilities use `@utility`, never `@layer utilities`.** In Tailwind v4 the latter no longer generates variant-capable utilities, and this design needs `md:` variants on the nameplate.
- **There is no `tailwind.config.js`.** v4 is configured from CSS; do not create one.
- **Tailwind v4 does not error on a class whose `@utility` was deleted** — it renders unstyled, silently. Deletions happen only in Task 6, after every consumer is gone.
- **`useCursorGlow` must not be deleted.** `Connect.tsx` and `ProjectCard.tsx` still use it for six `cursor-glow` divs. Only `useTypewriter` becomes dead.
- Commit after every task. Branch is `design/hero-editorial`, already created.

---

### Task 1: Self-host the typeface

**Files:**
- Create: `assets-src/fonts/bricolage-grotesque-latin-wdth-normal.woff2` (binary, from Fontsource)
- Create: `scripts/subset-font.sh`
- Create: `public/fonts/bricolage-grotesque-wdth.woff2` (generated, binary)
- Create: `scripts/font-preload.test.ts`
- Modify: `src/index.css` (add `@font-face` after the `@import`)
- Modify: `index.html` (add preload in `<head>`)
- Modify: `package.json` (add the `fonts` script)

**Interfaces:**
- Consumes: nothing.
- Produces: the CSS font family name `'Bricolage Grotesque'`, available with axes `wght 200–800` and `wdth 75–100`. Tasks 3 and 4 depend on that exact family string and on the axes existing.

- [ ] **Step 1: Fetch the Fontsource original into `assets-src/`**

The `wdth` variant is the correct file: it carries `wght` + `wdth`. The `opsz` variant has no width axis, and `standard` (which has all three) costs 128.5 KB against this one's 76.3 KB. `wdth` is load-bearing for the condensed nameplate; `opsz` is not.

```bash
mkdir -p assets-src/fonts public/fonts
cd /tmp && npm pack @fontsource-variable/bricolage-grotesque@5.3.0 --silent
tar xzf fontsource-variable-bricolage-grotesque-5.3.0.tgz
cd - >/dev/null
cp /tmp/package/files/bricolage-grotesque-latin-wdth-normal.woff2 assets-src/fonts/
ls -l assets-src/fonts/bricolage-grotesque-latin-wdth-normal.woff2
```

Expected: a file of roughly 78,100 bytes (76.3 KB).

- [ ] **Step 2: Write the subset script**

Create `scripts/subset-font.sh`:

```bash
#!/usr/bin/env bash
# Regenerates public/fonts/bricolage-grotesque-wdth.woff2 from the Fontsource
# original in assets-src/fonts/.
#
# Manual/local only, never in CI — same as `npm run images` and `npm run og`.
# Requires pyftsubset:  pip install fonttools brotli
#
# The source is the `wdth` axis variant of
# @fontsource-variable/bricolage-grotesque@5.3.0, chosen because it carries the
# wght + wdth axes the design needs. The `opsz` axis is deliberately not
# shipped: the only file carrying all three axes is 128.5 KB against this one's
# 76.3 KB, and opsz only refines contrast across 12-96.
#
# The unicode range covers printable ASCII plus the punctuation the page uses:
# non-breaking space, middle dot, en/em dash, curly quotes, and the -> and
# down-arrow glyphs in the band and footer. Subsetting takes 76.3 KB to 43.6 KB.
set -euo pipefail

SRC="assets-src/fonts/bricolage-grotesque-latin-wdth-normal.woff2"
OUT="public/fonts/bricolage-grotesque-wdth.woff2"

pyftsubset "$SRC" \
  --unicodes="U+0020-007E,U+00A0,U+00B7,U+2013-2014,U+2018-2019,U+201C-201D,U+2192,U+2193" \
  --layout-features=kern,liga,calt \
  --flavor=woff2 \
  --output-file="$OUT"

ls -l "$OUT"
```

Then:

```bash
chmod +x scripts/subset-font.sh
```

- [ ] **Step 3: Add the npm script**

In `package.json`, add `fonts` to the `scripts` block, after `og`:

```json
    "images": "node scripts/optimize-images.ts",
    "og": "node scripts/render-og.ts",
    "fonts": "bash scripts/subset-font.sh"
```

- [ ] **Step 4: Generate the subset**

```bash
pip install --quiet fonttools brotli
npm run fonts
```

Expected: `public/fonts/bricolage-grotesque-wdth.woff2` exists, roughly 44,600 bytes (43.6 KB). If `pyftsubset` is not on PATH after the pip install, use `python3 -m fontTools.subset` with the same arguments.

- [ ] **Step 5: Write the failing guard test**

Create `scripts/font-preload.test.ts`. This follows the same pattern as `scroll-offset.test.ts` and `discoverability.test.ts`: a cross-file coupling that nothing in the browser enforces, so a test parses both sides.

```ts
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * index.html preloads the font by URL and index.css declares it by URL. Nothing
 * links the two: if either moves, the preload silently fetches a 404 and the
 * @font-face silently falls back to the system stack. Neither failure is
 * visible in a test that renders a component, because jsdom loads no fonts.
 *
 * This lives under scripts/ because tsconfig.app.json sets types: ["vite/client"]
 * with no Node types, so a node:fs import anywhere under src/ passes vitest and
 * fails typecheck with TS2307.
 */
const root = process.cwd();
const html = readFileSync(join(root, 'index.html'), 'utf8');
const css = readFileSync(join(root, 'src', 'index.css'), 'utf8');

const preloadHref = html.match(
  /<link[^>]*rel="preload"[^>]*href="([^"]+\.woff2)"[^>]*>/,
)?.[1];

const fontFaceSrc = css.match(/@font-face\s*\{[^}]*url\(['"]([^'"]+\.woff2)['"]\)/)?.[1];

describe('the font preload and the @font-face agree', () => {
  it('index.html preloads a woff2', () => {
    expect(preloadHref).toBeDefined();
  });

  it('index.css declares an @font-face with a woff2 src', () => {
    expect(fontFaceSrc).toBeDefined();
  });

  it('both point at the same URL', () => {
    expect(preloadHref).toBe(fontFaceSrc);
  });

  it('that URL resolves to a file that ships', () => {
    // Both are absolute site paths ("/fonts/..."), served from public/.
    expect(preloadHref!.startsWith('/')).toBe(true);
    expect(existsSync(join(root, 'public', preloadHref!))).toBe(true);
  });

  it('the preload carries crossorigin', () => {
    // A font preload without crossorigin is fetched twice: once anonymously by
    // the preload, once in CORS mode by the font loader. The attribute is
    // required even for a same-origin font.
    const tag = html.match(/<link[^>]*rel="preload"[^>]*\.woff2[^>]*>/)?.[0] ?? '';
    expect(tag).toMatch(/crossorigin/);
  });
});
```

- [ ] **Step 6: Run the test to verify it fails**

Run: `npx vitest run scripts/font-preload.test.ts`

Expected: FAIL — `index.html preloads a woff2` fails with `expected undefined to be defined`, because neither the preload nor the `@font-face` exists yet.

- [ ] **Step 7: Add the `@font-face` to `src/index.css`**

Insert immediately after the `@import 'tailwindcss';` line at the top of the file, before the `cursor-glow` utility:

```css
/* Bricolage Grotesque, variable, self-hosted. Regenerate with `npm run fonts`;
   the Fontsource original lives in assets-src/fonts/.

   This is the `wdth` axis variant: wght 200-800 and wdth 75-100. The `opsz`
   axis is deliberately absent — the only Fontsource latin file carrying all
   three axes is 128.5 KB against this one's 76.3 KB (43.6 KB subsetted), and
   the design only depends on wdth (the condensed nameplate) and wght.

   font-display: swap so the masthead renders in the fallback stack rather than
   staying invisible on a cold load. scripts/font-preload.test.ts pins this URL
   to the preload in index.html. */
@font-face {
  font-family: 'Bricolage Grotesque';
  src: url('/fonts/bricolage-grotesque-wdth.woff2') format('woff2-variations');
  font-weight: 200 800;
  font-stretch: 75% 100%;
  font-style: normal;
  font-display: swap;
}
```

- [ ] **Step 8: Add the preload to `index.html`**

Insert after the `<link rel="icon" ... />` line:

```html
    <link
      rel="preload"
      href="/fonts/bricolage-grotesque-wdth.woff2"
      as="font"
      type="font/woff2"
      crossorigin
    />
```

- [ ] **Step 9: Run the test to verify it passes**

Run: `npx vitest run scripts/font-preload.test.ts`

Expected: PASS, 5 tests.

- [ ] **Step 10: Commit**

```bash
git add assets-src/fonts scripts/subset-font.sh scripts/font-preload.test.ts \
        public/fonts src/index.css index.html package.json
git commit -m "feat: self-host Bricolage Grotesque for the hero masthead

The site has no typeface at all — no @font-face anywhere, everything on the
bare system stack. That is one of the reasons the landing screen reads as
generated.

Ships the wdth-axis variant from Fontsource, subsetted 76.3 KB -> 43.6 KB,
following the assets-src/ -> script -> public/ convention the image and OG
pipelines already use. Drops the opsz axis: the only file carrying all three
axes costs 128.5 KB, and opsz only refines contrast across 12-96.

Guards the preload against the @font-face with a test, because nothing in the
browser links them and both failure modes are silent — a 404 preload and a
system-stack fallback look identical to a component test."
```

---

### Task 2: Award constants in `profile.ts`

**Files:**
- Modify: `src/data/profile.ts`
- Modify: `src/components/About.tsx:43`
- Test: `src/data/profile.test.ts` (create)

**Interfaces:**
- Consumes: nothing.
- Produces: `PAPER_TITLE: string` (`'ESNIDSaaS'`), `AWARD: string` (`'Best Paper Award'`), `VENUE: string` (`'IEEE IMC 2026'`). Task 4's Hero imports all three.

Note on scope: no new `profile-drift.test.ts` guard is added for these. The prose in `About.tsx:99-101` and the long description in `src/data/projects.ts` both legitimately spell the award out in their own wording, so a "no component contains this literal" guard could not pass without rewriting prose that is out of scope. The constants exist so the hero's most prominent claim has one source, not to enforce global uniqueness.

- [ ] **Step 1: Write the failing test**

Create `src/data/profile.test.ts` (no jsdom needed — this is plain data):

```ts
import { describe, expect, it } from 'vitest';
import { AWARD, PAPER_TITLE, VENUE } from './profile';

describe('award identity', () => {
  it('names the paper', () => {
    expect(PAPER_TITLE).toBe('ESNIDSaaS');
  });

  it('names the award and venue separately so they can be composed', () => {
    expect(AWARD).toBe('Best Paper Award');
    expect(VENUE).toBe('IEEE IMC 2026');
  });

  it('composes into the string About already rendered', () => {
    // About.tsx had 'IEEE IMC 2026 Best Paper Award' typed out. This proves the
    // constants reproduce it exactly, so adopting them is not a copy change.
    expect(`${VENUE} ${AWARD}`).toBe('IEEE IMC 2026 Best Paper Award');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/data/profile.test.ts`

Expected: FAIL — the import cannot resolve `AWARD`, `PAPER_TITLE`, `VENUE`.

- [ ] **Step 3: Add the constants**

Append to `src/data/profile.ts`, after the `LINKEDIN_URL` line:

```ts
/**
 * Award identity rendered in more than one place.
 *
 * "Best Paper Award at IEEE IMC 2026" was typed out in Hero, About, projects.ts
 * and index.html — the same four-copy shape the year/GPA and contact blocks
 * above exist to prevent. The redesigned hero makes it the loudest claim on the
 * landing screen, so it gets a single source here.
 *
 * Kept as three parts rather than one sentence because the hero sets the paper
 * title on its own line as a link, and About composes venue + award into one
 * label. The prose in About and the long description in projects.ts keep their
 * own wording deliberately; these constants are not a uniqueness guarantee.
 */
export const PAPER_TITLE = 'ESNIDSaaS';
export const AWARD = 'Best Paper Award';
export const VENUE = 'IEEE IMC 2026';
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/data/profile.test.ts`

Expected: PASS, 3 tests.

- [ ] **Step 5: Adopt the constants in About**

In `src/components/About.tsx`, add `AWARD` and `VENUE` to the existing import from `../data/profile` (it already imports `ACADEMIC_YEAR`, `EMAIL`, `EXPECTED_GRADUATION`, `GPA` and others — keep the list alphabetical to match).

Then change line 43 from:

```tsx
  { label: 'Recognition', value: 'IEEE IMC 2026 Best Paper Award' },
```

to:

```tsx
  { label: 'Recognition', value: `${VENUE} ${AWARD}` },
```

The rendered string is byte-identical, so `About.test.tsx` needs no change.

- [ ] **Step 6: Verify nothing regressed**

Run: `npx vitest run src/components/About.test.tsx src/data/profile.test.ts scripts/profile-drift.test.ts`

Expected: PASS, all three files.

- [ ] **Step 7: Commit**

```bash
git add src/data/profile.ts src/data/profile.test.ts src/components/About.tsx
git commit -m "refactor: give the award identity one source

'Best Paper Award at IEEE IMC 2026' is typed out in Hero, About, projects.ts
and index.html — the same four-copy drift shape profile.ts already exists to
prevent for the year, GPA and contact details.

The redesigned hero is about to make it the most prominent claim on the landing
screen, so it gets constants first. About adopts them at the one non-prose site;
the rendered string is byte-identical."
```

---

### Task 3: Typographic utilities in `index.css`

**Files:**
- Modify: `src/index.css` (additive only — no deletions until Task 6)

**Interfaces:**
- Consumes: the `'Bricolage Grotesque'` family from Task 1.
- Produces: classes `font-nameplate`, `nameplate-two-line`, `nameplate-one-line`, `band-label`, `font-band`, `animate-rise`. Task 4's Hero uses all six.

- [ ] **Step 1: Add the utilities**

Insert into `src/index.css` after the `animate-fade-in` utility and before the `/* Engineer's Blueprint Theme Utilities */` comment:

```css
/* ---- Editorial masthead (Hero) -------------------------------------------

   Tailwind has no utility for font-variation-settings, and the nameplate is
   sized against its container rather than the viewport, so these live here.

   Declared with @utility, not @layer utilities: in v4 the latter no longer
   produces variant-capable utilities, and the nameplate needs a md: variant.  */

@utility font-nameplate {
  font-family: 'Bricolage Grotesque', ui-sans-serif, system-ui, sans-serif;
  font-variation-settings: 'wdth' 82, 'wght' 700;
  text-transform: uppercase;
  line-height: 0.86;
}

/* The nameplate must be sized so its LONGEST line reaches both edges, and the
   longest line changes when the line break does — hence two rules rather than
   one clamp.

   Sized in cqi against the max-w-7xl wrapper (which carries Tailwind's
   @container), not vw: the wrapper caps at 80rem, so past ~1344px of viewport a
   vw-based size keeps growing and overflows the box it is meant to fit.

   The coefficients are MEASURED, not guessed — shaped with HarfBuzz against the
   real font at wdth 82 / wght 700, kerning applied:

     "SUPAKORN PRAYONGYAM"  9.500em, less 0.045em x 19 tracking -> 8.645em
                            100 / 8.645 = 11.57cqi
     "PRAYONGYAM"           5.000em, less 0.03em x 10 tracking  -> 4.700em
                            100 / 4.700 = 21.28cqi

   Re-measure if the name, the weight, the width axis or the tracking changes.
   Nothing automated catches a wrong value; it shows as a gap at the right edge
   or as overflow. */
@utility nameplate-two-line {
  font-size: clamp(3.25rem, 21.2cqi, 9rem);
  letter-spacing: -0.03em;
}

@utility nameplate-one-line {
  font-size: clamp(4.5rem, 11.5cqi, 9.25rem);
  letter-spacing: -0.045em;
}

@utility band-label {
  font-family: 'Bricolage Grotesque', ui-sans-serif, system-ui, sans-serif;
  font-variation-settings: 'wght' 500;
  font-size: 0.6875rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

@utility font-band {
  font-family: 'Bricolage Grotesque', ui-sans-serif, system-ui, sans-serif;
  font-variation-settings: 'wght' 400;
}

/* One staggered entrance, reusing the existing fadeIn keyframe at a shorter
   duration. `backwards` fill-mode matters: without it a delayed element paints
   at full opacity for one frame before the animation starts. Delays are set
   inline per group in Hero.tsx. Disabled by the prefers-reduced-motion block at
   the foot of this file. */
@utility animate-rise {
  animation: fadeIn 0.5s ease-out backwards;
}
```

- [ ] **Step 2: Register `animate-rise` with reduced motion**

In the `@media (prefers-reduced-motion: reduce)` block at the foot of the file, add `.animate-rise` to the existing selector list:

```css
  .animate-blink,
  .animate-pulse,
  .animate-fade-in,
  .animate-rise {
    animation: none;
  }
```

(`.animate-blink` is still listed here; it is removed in Task 6 together with the utility itself.)

- [ ] **Step 3: Verify the stylesheet still builds**

Run: `npm run build`

Expected: PASS. A malformed `@utility` fails the PostCSS step with a parse error naming the line.

- [ ] **Step 4: Commit**

```bash
git add src/index.css
git commit -m "feat: add the masthead typographic utilities

font-variation-settings has no Tailwind utility, and the nameplate is sized
against its container rather than the viewport, so both live in CSS.

The two nameplate coefficients are measured with HarfBuzz against the real font
at wdth 82 / wght 700 rather than guessed — an earlier estimate was ~5% low,
which would have shipped as a visible gap at the right edge. The derivation is
in the comment so it can be redone if the name or the axes change.

Additive only. The blueprint utilities this replaces are deleted once their last
consumer is gone."
```

---

### Task 4: Rewrite `Hero.tsx`

**Files:**
- Modify: `src/components/Hero.tsx` (full rewrite)
- Modify: `src/components/Hero.test.tsx` (full rewrite)

**Interfaces:**
- Consumes: `PAPER_TITLE`, `AWARD`, `VENUE` (Task 2); `font-nameplate`, `nameplate-two-line`, `nameplate-one-line`, `band-label`, `font-band`, `animate-rise` (Task 3); `'Bricolage Grotesque'` (Task 1).
- Produces: a default-exported `Hero` component. No other module imports from it.

- [ ] **Step 1: Write the failing test**

Replace the entire contents of `src/components/Hero.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Hero from './Hero';
import {
  ACADEMIC_YEAR,
  AWARD,
  EXPECTED_GRADUATION,
  INSTITUTION,
  LOCATION,
  PAPER_TITLE,
  PROGRAM,
  VENUE,
} from '../data/profile';

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

/** Mounts a real target so scrollIntoView has something to be called on. */
const withSection = (id: string) => {
  const el = document.createElement('section');
  el.id = id;
  document.body.appendChild(el);
  return el;
};

describe('Hero', () => {
  it('states the academic facts from src/data/profile.ts', () => {
    // The landing screen showed a stale "3rd Year" for a full session after
    // About was corrected, because the value was hardcoded in two places.
    // scripts/profile-drift.test.ts stops the literal coming back; this proves
    // the constants actually reach the page. The GPA is deliberately no longer
    // on the landing screen — About states it, and About.test.tsx covers that.
    renderHero();

    expect(screen.getByText(PROGRAM)).toBeInTheDocument();
    expect(screen.getByText(ACADEMIC_YEAR)).toBeInTheDocument();
    expect(screen.getByText(INSTITUTION)).toBeInTheDocument();
    expect(screen.getByText(new RegExp(EXPECTED_GRADUATION))).toBeInTheDocument();
    expect(screen.getByText(LOCATION)).toBeInTheDocument();
  });

  it('states the award from the profile constants', () => {
    renderHero();

    expect(screen.getByRole('button', { name: new RegExp(PAPER_TITLE) })).toBeInTheDocument();
    // Exact string, not a regex: a regex also matches every ancestor whose
    // textContent contains it, and getByText throws on multiple matches. The
    // component gives this its own <span> so exactly one element's full text
    // equals it.
    expect(screen.getByText(`${AWARD}, ${VENUE}`)).toBeInTheDocument();
  });

  it('exposes exactly one top-level heading', () => {
    renderHero();

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('scrolls to the projects section from the footer link', async () => {
    const target = withSection('projects');
    renderHero();
    const scrollIntoView = target.scrollIntoView as unknown as ReturnType<typeof vi.fn>;

    await userEvent.click(screen.getByRole('button', { name: /see the work/i }));

    expect(scrollIntoView).toHaveBeenCalled();
    expect(scrollIntoView.mock.contexts).toContain(target);
    target.remove();
  });

  it('scrolls to the connect section from the availability link', async () => {
    const target = withSection('connect');
    renderHero();
    const scrollIntoView = target.scrollIntoView as unknown as ReturnType<typeof vi.fn>;

    await userEvent.click(screen.getByRole('button', { name: /get in touch/i }));

    expect(scrollIntoView).toHaveBeenCalled();
    expect(scrollIntoView.mock.contexts).toContain(target);
    target.remove();
  });

  it('no longer renders the typewriter or the fake code block', () => {
    // Guards the redesign against a revert-by-accident. Both were the loudest
    // generated-looking elements on the page.
    const { container } = renderHero();

    expect(container.querySelector('pre')).toBeNull();
    expect(container.querySelector('.cursor-glow')).toBeNull();
    expect(container.textContent).not.toMatch(/const developer/);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/Hero.test.tsx`

Expected: FAIL — `states the academic facts` fails on `getByText(PROGRAM)` (the current Hero renders `PROGRAM` inside a longer `PROGRAM, INSTITUTION` string, not as its own node), and `states the award from the profile constants` fails because no such button exists.

- [ ] **Step 3: Write the new component**

Replace the entire contents of `src/components/Hero.tsx`:

```tsx
import { useLocation, useNavigate } from 'react-router-dom';
import { currentScrollBehavior } from '../lib/scrollBehavior';
import {
  ACADEMIC_YEAR,
  AWARD,
  EXPECTED_GRADUATION,
  FULL_NAME,
  INSTITUTION,
  LOCATION,
  PAPER_TITLE,
  PROGRAM,
  VENUE,
} from '../data/profile';

/**
 * The nameplate sets each word as its own block below `md` and inline from `md`
 * up, so the same markup gives a two-line and a one-line masthead without a
 * <br>. Split from FULL_NAME rather than typed out, so the name has one source.
 */
const [FIRST_NAME, LAST_NAME] = FULL_NAME.split(' ');

/**
 * Inline links replace the old padded CTA buttons. `py-3 -my-3` grows the hit
 * area to ~44px without moving the text baseline, so the band's rhythm is
 * unchanged and the target still meets the minimum on touch.
 */
const LINK_CLASS =
  'inline-flex items-baseline gap-2 py-3 -my-3 text-blue-400 ' +
  'hover:underline underline-offset-4 ' +
  'focus:outline-hidden focus:ring-2 focus:ring-blue-400';

export default function Hero() {
  const location = useLocation();
  const navigate = useNavigate();

  // Matches Navbar: navigate to '/' then scroll, or just scroll if already on '/'.
  const handleSectionClick = (id: string) => {
    if (location.pathname !== '/') {
      navigate('/', { state: { targetId: id } });
    } else {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: currentScrollBehavior() });
      }
    }
  };

  return (
    <section
      id="home"
      aria-labelledby="hero-heading"
      // min-h-dvh, not min-h-screen: mobile browsers report 100vh without the
      // collapsing URL bar, which pushes the footer row off-screen on first
      // paint. min-h- rather than h- so a short landscape viewport scrolls
      // instead of clipping.
      //
      // pt-16 / sm:pt-24 clear the fixed Navbar (top-0 + h-14 = 57px, then
      // sm:top-6 + sm:h-16 = 90px). Those are the same numbers scroll-padding-top
      // in index.css is built from, but this is an independent third copy —
      // scroll-offset.test.ts does not cover it.
      className="relative flex min-h-dvh flex-col bg-[#030712] px-4 pt-16 pb-8 sm:px-6 sm:pt-24 lg:px-8"
    >
      {/* @container is what makes the nameplate's cqi units resolve against this
          box rather than the viewport. The box caps at 80rem. */}
      <div className="@container mx-auto flex w-full max-w-7xl flex-1 flex-col">
        <h1
          id="hero-heading"
          className="font-nameplate nameplate-two-line md:nameplate-one-line animate-rise text-gray-100"
        >
          <span className="block md:inline">{FIRST_NAME}</span>{' '}
          <span className="block md:inline">{LAST_NAME}</span>
        </h1>

        <hr className="mt-6 h-px border-0 bg-gray-800" />

        {/* Labels are <p>, not headings: three new h2s inside the hero would
            change the document outline that landmarks.test.tsx and
            integration.a11y.test.tsx read. */}
        <div
          className="font-band animate-rise mt-8 grid grid-cols-1 gap-8 text-[15px] leading-relaxed md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr]"
          style={{ animationDelay: '80ms' }}
        >
          {/* At md the paragraph column spans the full first row: three columns
              at 768px leave it ~14 characters a line. */}
          <div className="md:col-span-2 lg:col-span-1">
            <p className="band-label text-gray-500">What I do</p>
            <p className="mt-3 max-w-[34ch] text-gray-400">
              Security and retrieval systems &mdash; intrusion detection, RAG
              pipelines &mdash; and the measurements that show whether they work.
            </p>
          </div>

          <div>
            <p className="band-label text-gray-500">Recognition</p>
            <p className="mt-3 text-gray-400">
              <button
                type="button"
                onClick={() => handleSectionClick('projects')}
                className={LINK_CLASS}
              >
                <span aria-hidden="true">&rarr;</span>
                {PAPER_TITLE}
              </button>
              <span className="block">
                {AWARD}, {VENUE}
              </span>
            </p>
          </div>

          <div>
            <p className="band-label text-gray-500">Availability</p>
            <p className="mt-3 text-gray-400">Open to SWE internships.</p>
            <button
              type="button"
              onClick={() => handleSectionClick('connect')}
              className={`${LINK_CLASS} mt-3`}
            >
              <span aria-hidden="true">&rarr;</span>
              Get in touch
            </button>
            {/* Stacked rather than run into a sentence: INSTITUTION is itself
                'SIIT, Thammasat', and inlining it produces a comma pileup. */}
            <p className="mt-4 text-gray-400">
              <span className="block">{PROGRAM}</span>
              <span className="block">{ACADEMIC_YEAR}</span>
              <span className="block">{INSTITUTION}</span>
              <span className="block">Graduating {EXPECTED_GRADUATION}</span>
            </p>
          </div>
        </div>

        {/* mt-auto pins the footer to the bottom when there is slack and behaves
            as a plain margin when the content is taller than the viewport. */}
        <hr className="mt-auto h-px border-0 bg-gray-800" />
        <div className="band-label flex flex-wrap justify-between gap-x-6 gap-y-2 pt-4 text-gray-500">
          <button
            type="button"
            onClick={() => handleSectionClick('projects')}
            className={LINK_CLASS}
          >
            See the work
            <span aria-hidden="true">&darr;</span>
          </button>
          <span className="py-3">{LOCATION}</span>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/components/Hero.test.tsx`

Expected: PASS, 6 tests.

- [ ] **Step 5: Run the full suite to catch collateral damage**

Run: `npm test`

Expected: PASS except `src/hooks/useTypewriter.test.ts`, which still passes on its own (the hook exists, it just has no consumer — it is deleted in Task 6). If `landmarks.test.tsx` or `integration.a11y.test.tsx` fail, the band labels have become headings — they must stay `<p>`.

- [ ] **Step 6: Commit**

```bash
git add src/components/Hero.tsx src/components/Hero.test.tsx
git commit -m "feat: rebuild the hero as an editorial masthead

Replaces the typewriter cycling job titles, the fake 'const developer = {}'
block with its macOS traffic lights, the gradient-clipped name, the sci-fi HUD
labels, the cursor glow and the blueprint grid with a nameplate and a
three-column band: what he does, what he won, and that he is available.

The IEEE Best Paper award moves from a mono block below the fold of attention
into the band, where a five-second skim reaches it. The GPA comes off the
landing screen entirely — it has no room and 3.24 is not a number that wins an
interview; About still states it.

Both CTAs become inline links, so they carry py-3 -my-3 to keep a 44px hit area
without moving the text baseline."
```

---

### Task 5: Strip the costume from `Projects.tsx`

**Files:**
- Modify: `src/components/Projects.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces: nothing. This exists so `bg-grid-pattern` and `marker-cross*` have no consumers left when Task 6 deletes them.

No test changes: `grep` confirms no test asserts any of this markup.

- [ ] **Step 1: Remove the grid pattern overlay**

Delete this line (currently `src/components/Projects.tsx:122`):

```tsx
      <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none" />
```

- [ ] **Step 2: Remove the crosshair markers**

On the wrapper `div` (currently line 134), change:

```tsx
      <div className="max-w-7xl mx-auto relative z-10 marker-cross marker-cross-tl marker-cross-tr marker-cross-bl marker-cross-br p-4 sm:p-8 border border-gray-800/60 bg-gray-950/40 backdrop-blur-xs">
```

to:

```tsx
      <div className="max-w-7xl mx-auto relative z-10 p-4 sm:p-8 border border-gray-800/60 bg-gray-950/40 backdrop-blur-xs">
```

- [ ] **Step 3: Remove the mono kicker**

Delete this block (currently lines 141-143):

```tsx
            <p className="font-mono text-xs sm:text-sm uppercase tracking-[0.2em] text-blue-400 mb-2">
              // sys.logs.fetch("projects")
            </p>
```

- [ ] **Step 4: De-mono the section description**

Change (currently line 172):

```tsx
        <p className="font-mono text-gray-400/80 text-sm text-center mb-8 max-w-2xl mx-auto pt-6">
          &gt; Select filters or switch views to explore technical implementations.
        </p>
```

to:

```tsx
        <p className="text-gray-400/80 text-sm text-center mb-8 max-w-2xl mx-auto pt-6">
          Select filters or switch views to explore technical implementations.
        </p>
```

The decorative blue and purple hairlines just above the heading are deliberately left alone — restyling Projects beyond removing the shared utilities is out of scope.

- [ ] **Step 5: Confirm no consumers remain**

```bash
grep -rn "bg-grid-pattern\|bg-dot-pattern\|marker-cross\|shadow-tactile\|animate-blink" src/ | grep -v "src/index.css"
```

Expected: no output. If anything prints, Task 6 must not proceed.

- [ ] **Step 6: Run the suite**

Run: `npx vitest run src/components/Projects.test.tsx`

Expected: PASS, unchanged.

- [ ] **Step 7: Commit**

```bash
git add src/components/Projects.tsx
git commit -m "refactor: strip the blueprint costume from Projects

The grid overlay, the crosshair corner markers and the '// sys.logs.fetch()'
mono kicker are the same sci-fi dressing the hero just lost. Leaving them would
put a new editorial masthead two scrolls above leftover HUD decoration, which
reads as unfinished rather than intentional.

Nothing asserts this markup, and the carousel and filtering are untouched."
```

---

### Task 6: Delete what is now dead

**Files:**
- Modify: `src/index.css`
- Delete: `src/hooks/useTypewriter.ts`
- Delete: `src/hooks/useTypewriter.test.ts`

**Interfaces:**
- Consumes: the confirmation from Task 5 Step 5 that nothing references these.
- Produces: nothing.

- [ ] **Step 1: Re-confirm nothing references the utilities**

```bash
grep -rn "bg-grid-pattern\|bg-dot-pattern\|marker-cross\|shadow-tactile\|animate-blink" src/ | grep -v "src/index.css"
grep -rn "useTypewriter" src/ | grep -v "src/hooks/useTypewriter"
```

Expected: no output from either. Tailwind v4 renders a deleted-utility class as unstyled markup with no error, so this check is the only thing standing between a stale reference and a silent visual regression.

- [ ] **Step 2: Delete the blueprint utilities from `src/index.css`**

Remove these blocks entirely:

- the `/* Engineer's Blueprint Theme Utilities */` comment
- `@utility bg-grid-pattern { ... }`
- `@utility bg-dot-pattern { ... }`
- `/* Tactile / Offset Shadow for buttons */` comment
- `@utility shadow-tactile { ... }`
- `@utility shadow-tactile-dark { ... }`
- `/* Crosshair marker for sections */` comment
- `@utility marker-cross { ... }`
- `@utility marker-cross-tl { ... }`
- `@utility marker-cross-tr { ... }`
- `@utility marker-cross-bl { ... }`
- `@utility marker-cross-br { ... }`
- `@utility animate-blink { ... }`
- `@keyframes blink { ... }` inside the `@layer utilities` block

Keep: `cursor-glow` (Connect and ProjectCard still use it), `animate-fade-in`, `@keyframes fadeIn`, `@keyframes slideIn` (Skills applies it inline), the whole `@layer base` block, and everything added in Tasks 1 and 3.

- [ ] **Step 3: Drop `animate-blink` from the reduced-motion block**

Change:

```css
  .animate-blink,
  .animate-pulse,
  .animate-fade-in,
  .animate-rise {
    animation: none;
  }
```

to:

```css
  .animate-pulse,
  .animate-fade-in,
  .animate-rise {
    animation: none;
  }
```

- [ ] **Step 4: Delete the dead hook**

```bash
git rm src/hooks/useTypewriter.ts src/hooks/useTypewriter.test.ts
```

- [ ] **Step 5: Verify**

```bash
npm test && npm run typecheck && npm run lint && npm run build
```

Expected: all four PASS. The suite is now 34 files minus `useTypewriter.test.ts` plus `font-preload.test.ts` and `profile.test.ts`.

- [ ] **Step 6: Commit**

```bash
git add -A src/index.css src/hooks
git commit -m "chore: delete the blueprint utilities and the typewriter hook

Every consumer is gone: Hero was rewritten and Projects was stripped. Tailwind
v4 renders a class whose @utility has been deleted as unstyled markup with no
error, so these are removed only now, after grep confirmed zero references.

useCursorGlow deliberately survives — Connect and ProjectCard still use it for
six glow divs between them, despite it having been introduced for the hero."
```

---

### Task 7: Responsive verification

**Files:** none modified unless a defect is found.

**Interfaces:**
- Consumes: the completed build.
- Produces: a calibrated nameplate.

None of this is testable in jsdom — it performs no layout, so a test asserting a breakpoint or a `cqi` size would pass while asserting nothing. This task is a manual sweep, and it is where the nameplate coefficients get their only real check.

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`

Expected: serving on `http://localhost:5173`.

- [ ] **Step 2: Sweep the widths**

At each of **320, 375, 640, 768, 1024, 1280 and 1920** px, confirm:

- The nameplate's longest line reaches the right edge of the content box — within a few pixels, not a visible gap and not overflowing. Below 768 the longest line is `PRAYONGYAM`; from 768 it is the whole name on one line. `SUPAKORN` falling short of the edge in the two-line setting is expected and correct.
- The band is one column below 768, two columns from 768 (with "What I do" spanning the full first row), three from 1024.
- The page does not scroll horizontally.
- The footer hairline sits at the bottom of the viewport, not floating mid-page.

- [ ] **Step 3: Calibrate if needed**

If the nameplate gaps or overflows, adjust only the `cqi` coefficient in the relevant `@utility` in `src/index.css` — `nameplate-two-line` below `md`, `nameplate-one-line` from `md`. Do not change the clamp bounds to compensate; a clamp firing early is a different bug and shows as the text stopping mid-growth.

One known wrinkle: CSS applies `letter-spacing` after the final character too, so the real line is about `0.045em` narrower than the derivation assumes — under half a percent, and the reason this step exists rather than trusting the arithmetic.

- [ ] **Step 4: Check a short landscape viewport**

At roughly **812 × 375**, confirm the section grows past the viewport and the page scrolls rather than clipping the footer row. This is what `min-h-dvh` rather than `h-screen` buys.

- [ ] **Step 5: Check reduced motion**

With the OS "Reduce motion" setting on, reload. Expected: the masthead and band appear immediately with no fade. The `@media (prefers-reduced-motion: reduce)` block covers `animate-rise`.

- [ ] **Step 6: Check the font actually loads**

In DevTools → Network, filter to `Font`. Expected: exactly one request, `bricolage-grotesque-wdth.woff2`, ~43.6 KB, status 200, initiated by the preload. If it 404s, `public/fonts/` was not generated — re-run `npm run fonts`.

- [ ] **Step 7: Commit any calibration**

```bash
git add src/index.css
git commit -m "fix: calibrate the nameplate coefficient against the rendered page

The measured value assumed letter-spacing is not applied after the final
character. It is, so the line runs marginally narrow."
```

Skip this step if Step 3 changed nothing.

---

## Self-Review

**Spec coverage:**

| Spec requirement | Task |
| --- | --- |
| Self-hosted subset woff2, `@font-face`, preload, `assets-src/` convention | 1 |
| `scripts/font-preload.test.ts` guard | 1 |
| `PAPER_TITLE` / `AWARD` / `VENUE`, About adoption | 2 |
| Nameplate / band-label / body `@utility` rules, measured coefficients | 3 |
| Container query on the `max-w-7xl` wrapper | 3, 4 |
| Masthead layout, band, footer row, copy | 4 |
| Every fact from `profile.ts`; GPA and project count omitted | 4 |
| Palette: `#030712` ground, blue only on interactive | 4 |
| Motion: one staggered `fadeIn`, reduced-motion honoured | 3, 4, 7 |
| Touch targets ≥44px | 4 |
| `min-h-dvh`, `pt-16` / `sm:pt-24` navbar clearance | 4 |
| Breakpoints: 1 col / 2 col / 3 col; nameplate breaks at `md` | 4 |
| Rewritten `Hero.test.tsx` (5 spec'd assertions + a revert guard) | 4 |
| Projects costume stripped | 5 |
| Utilities and `useTypewriter` deleted; `useCursorGlow` kept | 6 |
| Manual width sweep at the named widths | 7 |
| `npm test` / `typecheck` / `lint` / `build` green | 6 |

**Placeholder scan:** none. Every code step carries the literal code; every command carries its expected output.

**Type consistency:** `PAPER_TITLE`, `AWARD`, `VENUE` are declared in Task 2 and imported under those exact names in Task 4's component and test. The six utility class names produced in Task 3 are used verbatim in Task 4. `handleSectionClick(id: string)` matches the existing `Navbar.tsx` signature.

**Spec amendments this plan is written against.** Both came out of measuring the real font file rather than trusting the spec's estimates, and both are already merged into the spec — they are not open deviations:

1. The nameplate line break moved from `lg` to **`md`**. A two-line setting held to `lg` reaches ~207px per line at a 1023px viewport — roughly 356px of nameplate before the band starts, which overflows a 768px-tall window.
2. The `opsz` axis was dropped, and the `cqi` coefficients were replaced with HarfBuzz-measured values. The spec's originals (9.9 and 19) were ~5% low and would have shipped as a visible gap at the right edge.

**One thing the plan decides that the spec left open:** no new `profile-drift.test.ts` guard is added for the award. The prose in `About.tsx:99-101` and the long description in `src/data/projects.ts` both legitimately spell it out, so a "no component contains this literal" guard could not pass without rewriting copy that is out of scope.

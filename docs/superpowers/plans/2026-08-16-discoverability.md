# Slice E — Discoverability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ship `robots.txt`, `sitemap.xml`, and inline JSON-LD structured data so crawlers can discover and understand the portfolio, without changing any rendered UI.

**Architecture:** Three static artifacts (`public/robots.txt`, `public/sitemap.xml`, a `<script type="application/ld+json">` block in `index.html`). None of the three is a TypeScript module, so none can import a shared origin constant. A single exported `ORIGIN` in `scripts/site-origin.ts` therefore acts as an *assertion point*: `scripts/discoverability.test.ts` reads all three files from disk and fails if any disagrees with it.

**Tech Stack:** Plain text / XML / JSON-LD authored by hand. Vitest 4.1 (`environment: 'node'`) for the tests. No new dependencies — in particular **no XML parser is installed and none is to be added**; `environment: 'node'` also means there is no `DOMParser`. Sitemap well-formedness is checked with string and tag-count assertions instead.

## Global Constraints

- `ORIGIN` is exactly `https://supakornohm.vercel.app` — **no trailing slash**. Trailing slashes are added at each use site.
- All new tests live under `scripts/`, never `src/`. `tsconfig.app.json` sets `"types": ["vite/client"]` with no Node types, so a `node:fs` import under `src/` **passes `npm test` and fails `npm run typecheck` with TS2307**. This has cost real debugging time twice in this repo.
- `tsconfig.node.json` governs `scripts/`: `strict`, `noUnusedLocals`, `noUnusedParameters`, `verbatimModuleSyntax`, `erasableSyntaxOnly`. No enums, no parameter properties, no unused imports.
- Read repo files via `fileURLToPath(new URL('../<path>', import.meta.url))`, never `process.cwd()` — matches `scripts/head-metadata.test.ts` and keeps tests independent of the invoking directory.
- The JSON-LD block **must use a literal `&`, never `&amp;`**. HTML5 treats `<script>` content as raw text and does not decode entities there, so `&amp;` would land in the structured data as the five literal characters `&amp;`.
- **No email in the JSON-LD.** The address currently appears only in JS-rendered markup; adding it to static HTML would newly expose it to non-rendering harvesters. This is a deliberate decision from spec E3, not an oversight.
- Do not add project data to the JSON-LD (spec E3, rejected alternative).
- Do not add `lastmod` to the sitemap (spec E2).
- Every new test must be seen to FAIL against a deliberately broken input before its task is considered done.

**Reference:** `docs/superpowers/specs/2026-08-16-discoverability-design.md`

**Branch:** `feat/discoverability` (already created; the spec is committed on it).

---

## File Structure

| File | Status | Responsibility |
|---|---|---|
| `scripts/site-origin.ts` | Create | Single definition of `ORIGIN`. Nothing else. |
| `scripts/head-metadata.test.ts` | Modify (line 14) | Drop its local `ORIGIN`, import the shared one. |
| `public/robots.txt` | Create | Crawl policy + absolute sitemap pointer. |
| `public/sitemap.xml` | Create | One canonical URL. |
| `index.html` | Modify (after line 18) | Inline JSON-LD `@graph`: `Person` + `WebSite`. |
| `scripts/discoverability.test.ts` | Create | All assertions for the three artifacts + origin drift. |
| `docs/superpowers/manual-checks/2026-08-16-e-discoverability.md` | Create | Post-deploy checks nothing local can prove. |
| `CLAUDE.md` | Modify | Document the two new `public/` artifacts. |

**Test count:** starts at 151, ends at 178 (Task 2 +11, Task 3 +12, Task 4 +4). `scripts/discoverability.test.ts` is the 24th test file.

---

## Task 1: Extract the ORIGIN constant

Pure refactor. No behaviour changes and no new tests — the deliverable is proven by the 15 existing `head-metadata` tests continuing to pass *while importing the new constant*, plus a sabotage step that proves the import is actually wired rather than shadowed.

**Files:**
- Create: `scripts/site-origin.ts`
- Modify: `scripts/head-metadata.test.ts:14`

**Interfaces:**
- Consumes: nothing.
- Produces: `export const ORIGIN: string` from `scripts/site-origin.ts`, value `'https://supakornohm.vercel.app'` (no trailing slash). Tasks 2, 3 and 4 all import this.

- [ ] **Step 1: Create the constant module**

Create `scripts/site-origin.ts`:

```ts
/**
 * The deployed origin, with no trailing slash.
 *
 * This string is duplicated by necessity into files that cannot import it:
 * `index.html`, `public/robots.txt` and `public/sitemap.xml` are not TypeScript
 * modules. It is therefore an assertion point rather than a substitution
 * source — `scripts/discoverability.test.ts` fails if any of those files
 * disagrees with this value.
 *
 * A custom domain is planned for later. When it lands, change this constant and
 * run `npm test`: the failures name every file still carrying the old origin.
 */
export const ORIGIN = 'https://supakornohm.vercel.app';
```

- [ ] **Step 2: Import it in the existing metadata test**

In `scripts/head-metadata.test.ts`, add the import beneath the existing `render-og` import:

```ts
import { MAX_BYTES } from './render-og';
import { ORIGIN } from './site-origin';
```

Then **delete** line 14, which currently reads:

```ts
const ORIGIN = 'https://supakornohm.vercel.app';
```

Leave `DESCRIPTION` and `TITLE_HTML` exactly as they are — they are not part of this slice.

- [ ] **Step 3: Run the suite**

Run: `npm test -- scripts/head-metadata.test.ts`
Expected: PASS, 15 tests. (If it fails with "Cannot find module './site-origin'", the file was created in the wrong directory.)

- [ ] **Step 4: Prove the import is really wired (sabotage)**

Temporarily change `ORIGIN` in `scripts/site-origin.ts` to `'https://wrong.example.com'`.

Run: `npm test -- scripts/head-metadata.test.ts`
Expected: **FAIL** — at least the canonical, `og:url`, `og:image` and README tests must fail.

This is the real verification for this task: it proves `head-metadata.test.ts` reads the shared constant rather than a leftover local copy that silently shadows it.

Now restore the correct value:

```ts
export const ORIGIN = 'https://supakornohm.vercel.app';
```

Run: `npm test -- scripts/head-metadata.test.ts`
Expected: PASS, 15 tests.

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: exit 0, no output beyond the `tsc -b --noEmit` echo. (`verbatimModuleSyntax` is on; `ORIGIN` is a value, not a type, so a plain `import` is correct — do **not** write `import type`.)

- [ ] **Step 6: Commit**

```bash
git add scripts/site-origin.ts scripts/head-metadata.test.ts
git commit -m "Extract ORIGIN into a single shared constant

index.html, robots.txt and sitemap.xml cannot import a TS module, so the
origin is duplicated into them by necessity. Giving it one definition makes
the upcoming drift test possible and turns the planned custom-domain move
into a one-constant change plus a test run that names every file missed.

Verified by sabotage: pointing ORIGIN at a wrong host fails the canonical,
og:url, og:image and README assertions, proving the import is wired rather
than shadowed by a leftover local."
```

---

## Task 2: robots.txt and sitemap.xml

**Files:**
- Create: `public/robots.txt`
- Create: `public/sitemap.xml`
- Create: `scripts/discoverability.test.ts`

**Interfaces:**
- Consumes: `ORIGIN` from `scripts/site-origin.ts`.
- Produces: `scripts/discoverability.test.ts` containing the module-level helpers `readRepoFile(relative: string): string` and `escapeRegExp(s: string): string`, which Tasks 3 and 4 extend the same file with.

- [ ] **Step 1: Write the failing tests**

Create `scripts/discoverability.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { ORIGIN } from './site-origin';

// Resolved from this file's own URL rather than process.cwd(), so the test does
// not depend on which directory vitest was invoked from.
const readRepoFile = (relative: string): string =>
  readFileSync(fileURLToPath(new URL(`../${relative}`, import.meta.url)), 'utf-8');

/** Escapes a literal string for safe embedding in a RegExp. */
const escapeRegExp = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const robots = readRepoFile('public/robots.txt');
const sitemap = readRepoFile('public/sitemap.xml');

describe('public/robots.txt', () => {
  it('opens a group for every user-agent', () => {
    expect(robots).toMatch(/^User-agent:\s*\*$/m);
  });

  it('allows the whole site', () => {
    expect(robots).toMatch(/^Allow:\s*\/$/m);
  });

  it('disallows nothing', () => {
    // A stray Disallow with a path is how a site silently falls out of the
    // index. An empty `Disallow:` is the older allow-all idiom and is fine.
    expect(robots).not.toMatch(/^Disallow:\s*\S/m);
  });

  it('points at the sitemap with an ABSOLUTE url', () => {
    // The robots.txt sitemap directive requires a full URL. A relative path is
    // ignored outright, leaving the sitemap effectively unannounced.
    const expected = escapeRegExp(`${ORIGIN}/sitemap.xml`);
    expect(robots).toMatch(new RegExp(`^Sitemap:\\s*${expected}$`, 'm'));
  });
});

describe('public/sitemap.xml', () => {
  it('declares the XML prolog', () => {
    expect(sitemap.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
  });

  it('declares the sitemaps.org 0.9 namespace', () => {
    // Without the namespace the file parses as XML but is not a sitemap, and
    // search engines reject it wholesale rather than partially.
    expect(sitemap).toContain('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"');
  });

  it('has balanced urlset and url tags', () => {
    // No XML parser is installed and `environment: 'node'` gives no DOMParser,
    // so tag counting stands in for well-formedness on this hand-authored file.
    expect((sitemap.match(/<urlset\b/g) ?? []).length).toBe(1);
    expect((sitemap.match(/<\/urlset>/g) ?? []).length).toBe(1);
    expect((sitemap.match(/<url>/g) ?? []).length).toBe((sitemap.match(/<\/url>/g) ?? []).length);
    expect((sitemap.match(/<loc>/g) ?? []).length).toBe((sitemap.match(/<\/loc>/g) ?? []).length);
  });

  it('lists exactly one URL', () => {
    expect((sitemap.match(/<loc>/g) ?? []).length).toBe(1);
  });

  it('lists the canonical root', () => {
    expect(sitemap).toContain(`<loc>${ORIGIN}/</loc>`);
  });

  it('does NOT list the redirect-only routes', () => {
    // /about, /projects and /connect each serve an index.html that declares
    // canonical:/ — they are non-canonical by the site's own statement, and a
    // sitemap must list canonical URLs only.
    for (const route of ['/about', '/projects', '/connect']) {
      expect(sitemap).not.toContain(`${ORIGIN}${route}`);
    }
  });

  it('omits lastmod', () => {
    // A static file cannot keep a modification date honest, and Google uses
    // lastmod only when it is verifiably accurate. A rotting date buys nothing
    // and costs credibility across the whole sitemap.
    expect(sitemap).not.toContain('<lastmod>');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- scripts/discoverability.test.ts`
Expected: **FAIL** during collection with `ENOENT: no such file or directory` for `public/robots.txt` — the module-level `readRepoFile` calls run before any test does.

- [ ] **Step 3: Create robots.txt**

Create `public/robots.txt` (note the blank line before `Sitemap:`, and the trailing newline):

```
User-agent: *
Allow: /

Sitemap: https://supakornohm.vercel.app/sitemap.xml
```

- [ ] **Step 4: Create sitemap.xml**

Create `public/sitemap.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://supakornohm.vercel.app/</loc>
  </url>
</urlset>
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test -- scripts/discoverability.test.ts`
Expected: PASS, 11 tests.

- [ ] **Step 6: Sabotage each assertion group**

Confirm the tests discriminate. Make each change, run `npm test -- scripts/discoverability.test.ts`, confirm the named test fails, then revert.

| Change | Test that must fail |
|---|---|
| In `robots.txt`, add a line `Disallow: /` | `disallows nothing` |
| In `robots.txt`, change `Sitemap:` to `Sitemap: /sitemap.xml` | `points at the sitemap with an ABSOLUTE url` |
| In `sitemap.xml`, add a second `<url><loc>https://supakornohm.vercel.app/about</loc></url>` | `lists exactly one URL` **and** `does NOT list the redirect-only routes` |
| In `sitemap.xml`, delete the `xmlns` attribute | `declares the sitemaps.org 0.9 namespace` |
| In `sitemap.xml`, add `<lastmod>2026-08-16</lastmod>` inside the `<url>` | `omits lastmod` |

After the last revert, run `npm test -- scripts/discoverability.test.ts` and expect PASS, 11 tests.

- [ ] **Step 7: Verify the files ship into the build**

Run: `npm run build`
Then run: `ls dist/robots.txt dist/sitemap.xml`
Expected: both paths exist. Vite copies `public/` to the build root verbatim.

- [ ] **Step 8: Commit**

```bash
git add public/robots.txt public/sitemap.xml scripts/discoverability.test.ts
git commit -m "Add robots.txt and sitemap.xml

Both paths currently return the SPA shell (200, text/html, 1509 bytes)
because neither file exists and vercel.json rewrites everything unmatched
to index.html. Production already serves /og.png as image/png, confirming
filesystem priority beats the catch-all, so these will be served as files.

robots.txt is permissive to every user-agent: this is a portfolio whose job
is to get its author found, so excluding AI answer engines would trade away
a real discovery channel for nothing.

The sitemap lists only /. /about, /projects and /connect each serve an
index.html declaring canonical:/, so listing them would submit four URLs
that all self-identify as one. lastmod is omitted rather than committed as
a date that silently rots.

Every assertion confirmed to fail against a deliberately broken input."
```

---

## Task 3: JSON-LD structured data

**Files:**
- Modify: `index.html` (insert after line 18, the `twitter:card` meta tag, before `</head>`)
- Modify: `scripts/discoverability.test.ts` (append)

**Interfaces:**
- Consumes: `readRepoFile` and `ORIGIN` from Task 2's file.
- Produces: nothing consumed by later tasks except the `index.html` content Task 4's drift scan reads.

- [ ] **Step 1: Write the failing tests**

Append to `scripts/discoverability.test.ts`:

```ts
const html = readRepoFile('index.html');
const connectSource = readRepoFile('src/components/Connect.tsx');

/**
 * HTML attribute values carry entity-encoded text (`&amp;`), while `<script>`
 * content is raw text that is NOT entity-decoded. Comparing one against the
 * other requires decoding the attribute side.
 */
const decodeEntities = (s: string): string =>
  s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');

const ldBlocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
const rawLd = ldBlocks[0]?.[1] ?? '';

type LdNode = Record<string, unknown> & { '@type'?: string; '@id'?: string };
const graph: LdNode[] = (() => {
  try {
    const parsed = JSON.parse(rawLd) as { '@graph'?: LdNode[] };
    return parsed['@graph'] ?? [];
  } catch {
    return [];
  }
})();
const nodeOfType = (type: string): LdNode | undefined =>
  graph.find((n) => n['@type'] === type);

describe('index.html JSON-LD', () => {
  it('carries exactly one ld+json block', () => {
    // Multiple blocks are legal but split the graph across documents, which
    // breaks the @id references between Person and WebSite below.
    expect(ldBlocks).toHaveLength(1);
  });

  it('parses as JSON', () => {
    expect(() => JSON.parse(rawLd)).not.toThrow();
  });

  it('declares the schema.org context', () => {
    expect((JSON.parse(rawLd) as Record<string, unknown>)['@context']).toBe('https://schema.org');
  });

  it('contains exactly one Person and one WebSite', () => {
    expect(graph.filter((n) => n['@type'] === 'Person')).toHaveLength(1);
    expect(graph.filter((n) => n['@type'] === 'WebSite')).toHaveLength(1);
  });

  it('identifies the person', () => {
    const person = nodeOfType('Person');
    expect(person?.['@id']).toBe(`${ORIGIN}/#person`);
    expect(person?.name).toBe('Supakorn Prayongyam');
    expect(person?.alternateName).toBe('Supakorn Ohm');
    expect(person?.jobTitle).toBe('Computer Engineering Student');
    expect(person?.url).toBe(`${ORIGIN}/`);
    expect(person?.image).toBe(`${ORIGIN}/og.png`);
  });

  it('states the university as a current affiliation, not alumniOf', () => {
    // PERSONAL_INFO in About.tsx lists an in-progress degree and "Looking for
    // Internships"; alumniOf would assert completed study.
    const person = nodeOfType('Person');
    expect(person?.alumniOf).toBeUndefined();
    expect(person?.affiliation).toEqual({
      '@type': 'CollegeOrUniversity',
      name: 'Sirindhorn International Institute of Technology, Thammasat University',
    });
  });

  it('links the same profiles the Connect section links', () => {
    // Derived from Connect.tsx rather than retyped, so the structured data
    // cannot drift away from the links a visitor actually sees.
    const github = connectSource.match(/href:\s*'(https:\/\/github\.com\/[^']+)'/)?.[1];
    const linkedin = connectSource.match(/href:\s*'(https:\/\/linkedin\.com\/[^']+)'/)?.[1];
    expect(github).toBeDefined();
    expect(linkedin).toBeDefined();
    expect(nodeOfType('Person')?.sameAs).toEqual([github, linkedin]);
  });

  it('publishes no email address', () => {
    // Deliberate (spec E3): the address currently appears only in JS-rendered
    // markup, so a harvester that does not run JS finds none. Adding it here
    // would put it in static HTML and hand it to every scraper.
    expect(nodeOfType('Person')).not.toHaveProperty('email');
    expect(rawLd).not.toContain('@gmail.com');
  });

  it('joins the WebSite to the Person by @id reference', () => {
    const site = nodeOfType('WebSite');
    const personId = nodeOfType('Person')?.['@id'];
    expect(site?.['@id']).toBe(`${ORIGIN}/#website`);
    expect(site?.about).toEqual({ '@id': personId });
    expect(site?.publisher).toEqual({ '@id': personId });
  });

  it('keeps the WebSite name identical to the document title', () => {
    const title = html.match(/<title>([^<]*)<\/title>/)?.[1] ?? '';
    expect(nodeOfType('WebSite')?.name).toBe(decodeEntities(title));
  });

  it('keeps the WebSite description identical to the meta description', () => {
    const description =
      html.match(/<meta\s+name="description"\s+content="([^"]*)"/i)?.[1] ?? '';
    expect(nodeOfType('WebSite')?.description).toBe(decodeEntities(description));
  });

  it('uses a literal ampersand, not an HTML entity', () => {
    // HTML5 treats <script> content as raw text and does NOT decode entities
    // there. An `&amp;` inside JSON-LD is read as the five literal characters
    // "&amp;", silently putting a wrong site name into the structured data.
    expect(rawLd).not.toContain('&amp;');
    expect(String(nodeOfType('WebSite')?.name)).toContain(' & ');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- scripts/discoverability.test.ts`
Expected: **FAIL**, 12 new failures (`carries exactly one ld+json block` reports `[]` has length 0; the rest fail on an empty graph). The 11 Task 2 tests still pass.

- [ ] **Step 3: Add the JSON-LD block to index.html**

In `index.html`, insert immediately after the `twitter:card` line and before `</head>`.

**Use a literal `&` in the WebSite name.** Do not write `&amp;` — see the Global Constraints.

```html
    <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "Person",
            "@id": "https://supakornohm.vercel.app/#person",
            "name": "Supakorn Prayongyam",
            "alternateName": "Supakorn Ohm",
            "url": "https://supakornohm.vercel.app/",
            "image": "https://supakornohm.vercel.app/og.png",
            "jobTitle": "Computer Engineering Student",
            "affiliation": {
              "@type": "CollegeOrUniversity",
              "name": "Sirindhorn International Institute of Technology, Thammasat University"
            },
            "address": {
              "@type": "PostalAddress",
              "addressLocality": "Bangkok",
              "addressCountry": "TH"
            },
            "knowsLanguage": ["th", "en"],
            "knowsAbout": [
              "React",
              "TypeScript",
              "Node.js",
              "Python",
              "SQL",
              "Full-stack web development",
              "Data Structures and Algorithms"
            ],
            "sameAs": [
              "https://github.com/SupaOhm",
              "https://linkedin.com/in/supakornpra"
            ]
          },
          {
            "@type": "WebSite",
            "@id": "https://supakornohm.vercel.app/#website",
            "url": "https://supakornohm.vercel.app/",
            "name": "Supakorn Ohm — Computer Engineering Student & Developer",
            "description": "Supakorn Ohm — Computer Engineering student at SIIT, Thammasat. Full-stack projects in React, TypeScript, and Node. Seeking a Software Engineer internship.",
            "inLanguage": "en",
            "about": { "@id": "https://supakornohm.vercel.app/#person" },
            "publisher": { "@id": "https://supakornohm.vercel.app/#person" }
          }
        ]
      }
    </script>
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- scripts/discoverability.test.ts`
Expected: PASS, 23 tests.

Then run the whole suite: `npm test`
Expected: PASS, 174 tests across 24 files. (`head-metadata.test.ts` reads the same `index.html`; if any of its 15 tests now fail, the block was inserted inside an existing tag rather than between them.)

- [ ] **Step 5: Sabotage each assertion group**

Make each change, run `npm test -- scripts/discoverability.test.ts`, confirm the named test fails, then revert.

| Change | Test that must fail |
|---|---|
| Change the WebSite `name` to use `&amp;` instead of `&` | `uses a literal ampersand, not an HTML entity` **and** `keeps the WebSite name identical to the document title` |
| Add `"email": "ohm.supakornth@gmail.com"` to the Person | `publishes no email address` |
| Rename `affiliation` to `alumniOf` | `states the university as a current affiliation, not alumniOf` |
| Change the Person `@id` to `.../#me` without updating `about`/`publisher` | `joins the WebSite to the Person by @id reference` |
| Remove `"https://linkedin.com/in/supakornpra"` from `sameAs` | `links the same profiles the Connect section links` |
| Delete a closing `}` so the JSON is malformed | `parses as JSON` (and most others) |

After the last revert: `npm test -- scripts/discoverability.test.ts`, expect PASS, 23 tests.

- [ ] **Step 6: Validate the JSON independently of the tests**

The tests parse the block, but confirm it with a second tool so a shared bug in the extraction regex cannot hide a malformed block:

```bash
node -e "
const fs=require('fs');
const html=fs.readFileSync('index.html','utf8');
const m=html.match(/<script type=\"application\/ld\+json\">([\s\S]*?)<\/script>/);
const o=JSON.parse(m[1]);
console.log('parsed ok; @graph nodes:', o['@graph'].map(n=>n['@type']).join(', '));
"
```

Expected output: `parsed ok; @graph nodes: Person, WebSite`

- [ ] **Step 7: Commit**

```bash
git add index.html scripts/discoverability.test.ts
git commit -m "Add Person and WebSite JSON-LD to index.html

The served HTML contains zero visible text — <div id=\"root\"></div> is
empty and the page is client-rendered — so for any crawler that does not
execute JavaScript this block is the only machine-readable content on the
site. That is why it is inline and static rather than injected by React,
which would deliver it only to the clients that least need it.

Every value comes from data already in the repo: name and education from
About.tsx PERSONAL_INFO, skills from Skills.tsx, languages from LANGUAGES,
profile URLs from Connect.tsx, title and description from index.html. The
sameAs test derives the URLs from Connect.tsx rather than retyping them, so
the structured data cannot drift from the links a visitor sees.

email is deliberately omitted: it currently appears only in JS-rendered
markup, so adding it here would be a new exposure to non-rendering
harvesters introduced by an SEO change.

The block uses a literal & because HTML5 does not decode entities inside
<script>; a test pins this, since &amp; would silently become five literal
characters in the site name."
```

---

## Task 4: Origin drift guard and documentation

**Files:**
- Modify: `scripts/discoverability.test.ts` (append)
- Create: `docs/superpowers/manual-checks/2026-08-16-e-discoverability.md`
- Modify: `CLAUDE.md`

**Interfaces:**
- Consumes: `readRepoFile` and `ORIGIN` from Task 2's file.
- Produces: nothing.

- [ ] **Step 1: Write the failing test**

Append to `scripts/discoverability.test.ts`:

```ts
describe('origin consistency', () => {
  // Every file that hardcodes the deployed origin. When a custom domain lands,
  // these are exactly the files to edit — and this test names any that were
  // missed instead of leaving a stale URL for a search engine to find.
  const FILES_WITH_HARDCODED_ORIGIN = [
    'index.html',
    'README.md',
    'public/robots.txt',
    'public/sitemap.xml',
  ];

  it.each(FILES_WITH_HARDCODED_ORIGIN)('every origin in %s matches ORIGIN', (relative) => {
    const contents = readRepoFile(relative);
    // Matches any absolute URL, then keeps the ones pointing at this site.
    // Catches a wrong TLD (…vercel.com) as well as a wrong subdomain, which a
    // literal `vercel.app` search would miss.
    const ours = (contents.match(/https?:\/\/[^\s"'<>)\]]+/g) ?? []).filter((u) =>
      u.toLowerCase().includes('supakornohm'),
    );

    expect(ours.length).toBeGreaterThan(0);
    for (const url of ours) {
      expect(url.startsWith(ORIGIN)).toBe(true);
    }
  });
});
```

- [ ] **Step 2: Run the test to verify it passes, then prove it discriminates**

Run: `npm test -- scripts/discoverability.test.ts`
Expected: PASS, 27 tests. (This one passes immediately — the files are already correct. Its value is caught by the sabotage below, so do not skip it.)

Sabotage: in `public/robots.txt`, change the `Sitemap:` host to `https://supakornohm.vercel.com/sitemap.xml` (note `.com`).

Run: `npm test -- scripts/discoverability.test.ts`
Expected: **FAIL** on `every origin in public/robots.txt matches ORIGIN` *and* on `points at the sitemap with an ABSOLUTE url`.

Revert, then re-run and expect PASS, 27 tests.

- [ ] **Step 3: Write the manual-check document**

Create `docs/superpowers/manual-checks/2026-08-16-e-discoverability.md`:

```markdown
# Slice E — Discoverability manual checks

Nothing local can prove these. `vite preview` serves `public/` straight from
the filesystem regardless of `vercel.json`, so it returns `robots.txt` and
`sitemap.xml` correctly **even if the production rewrite config is wrong** —
exactly the trap `vercel.json` already carries for the SPA routes.

## Post-deploy: the files are served as files, not rewritten

Before the deploy, both paths returned the SPA shell: `200`,
`text/html; charset=utf-8`, `1509` bytes. Anything still matching that shape
means the catch-all swallowed the file.

- [ ] `curl -sS -o /dev/null -w "%{http_code} %{content_type} %{size_download}\n" https://supakornohm.vercel.app/robots.txt`
      → `200`, a `text/plain` content type, and a size that is **not** 1509.
- [ ] `curl -sS -o /dev/null -w "%{http_code} %{content_type} %{size_download}\n" https://supakornohm.vercel.app/sitemap.xml`
      → `200`, an XML content type (`application/xml` or `text/xml`), size **not** 1509.
- [ ] `curl -sS https://supakornohm.vercel.app/robots.txt` prints the four
      expected lines, not HTML.
- [ ] The existing static assets still resolve, confirming nothing regressed:
      `/og.png` is `image/png` and `/images/projects/expense.webp` is `image/webp`.

## Structured data validators (browser, account-free)

- [ ] Google Rich Results Test (https://search.google.com/test/rich-results)
      against the live URL: the JSON-LD is detected and reports no errors.
      Expect **no rich result** to be claimed — `Person` and `WebSite` are not
      rich-result types here. Detection without errors is the pass condition.
- [ ] Schema Markup Validator (https://validator.schema.org/) against the live
      URL: `Person` and `WebSite` both listed, zero errors, and the
      `about`/`publisher` references resolve to the Person rather than showing
      as dangling `@id`s.

## Search Console (needs the site owner's Google account)

- [ ] Verify ownership of the property.
- [ ] Submit `https://supakornohm.vercel.app/sitemap.xml`; status reads
      "Success" with 1 discovered URL.
- [ ] Check Coverage after indexing settles. `/about`, `/projects` and
      `/connect` may appear as "Alternate page with proper canonical tag" —
      that is the correct outcome, not an error.
- [ ] Note whether any non-existent URL is reported as a **Soft 404**. This is
      the known, accepted D2 limitation: the SPA returns HTTP 200 for unmatched
      paths. Every such page declares `canonical:/`, so consolidation should
      handle it, but this slice cannot fix a status code.

## Not covered by anything here

- Whether any search engine acts on any of it. Indexing, entity association and
  ranking are third-party decisions on a third-party schedule. This slice ships
  valid inputs; it cannot ship outcomes.
- The empty served HTML. Every crawler that does not execute JavaScript still
  sees a page with no visible text. Prerendering is the fix and is deliberately
  out of scope — see the spec's "Out of scope".
```

- [ ] **Step 4: Document the new artifacts in CLAUDE.md**

In `CLAUDE.md`, find the paragraph beginning **`**`assets-src/` vs `public/`**`**. Append this sentence to the end of that paragraph:

```
`public/` also holds two hand-authored discoverability artifacts that are not generated by any script: `robots.txt` (permissive crawl policy plus an absolute sitemap pointer) and `sitemap.xml` (one URL, `/` only — `/about`, `/projects` and `/connect` are excluded because each serves an `index.html` declaring `canonical:/`, making them non-canonical by the site's own statement). Both hardcode the deployed origin, as does the JSON-LD block in `index.html`; `scripts/site-origin.ts` holds the single `ORIGIN` definition and `scripts/discoverability.test.ts` fails if any of those files disagrees with it. None of the three can import the constant, so the test is the enforcement, not the import.
```

- [ ] **Step 5: Run the full suite and all gates**

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

Expected: 178 tests across 24 files passing; lint `No issues found`; typecheck exit 0; build succeeds with `dist/robots.txt` and `dist/sitemap.xml` present.

- [ ] **Step 6: Commit**

```bash
git add scripts/discoverability.test.ts docs/superpowers/manual-checks/2026-08-16-e-discoverability.md CLAUDE.md
git commit -m "Guard origin drift across all four files, document Slice E

The origin is hardcoded in index.html, README.md, robots.txt and
sitemap.xml, none of which can import scripts/site-origin.ts. The new scan
matches every absolute URL pointing at this site and asserts each starts
with ORIGIN, so a wrong TLD is caught as well as a wrong subdomain — a
literal 'vercel.app' search would miss supakornohm.vercel.com.

Confirmed to discriminate: pointing robots.txt at a .com host fails both
the drift scan and the absolute-sitemap assertion.

The manual-check doc records what nothing local can prove. vite preview
serves public/ from the filesystem regardless of vercel.json, so it would
return both files even if the production rewrite config were wrong — the
same trap vercel.json already carries for the SPA routes. Pre-deploy both
paths returned the SPA shell at exactly 1509 bytes, which gives the
post-deploy checks a concrete failure signature to test against."
```

---

## After the plan

The branch is ready to merge, but **the deploy is what proves the central claim**. Once `main` is deployed, work the post-deploy section of `docs/superpowers/manual-checks/2026-08-16-e-discoverability.md`. If `/robots.txt` still returns `text/html` at 1509 bytes, the catch-all is swallowing the file and `vercel.json` needs revisiting — that is the one outcome this slice's tests cannot rule out.

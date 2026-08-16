# Slice E — Discoverability: robots.txt, sitemap.xml, JSON-LD

**Goal:** make the portfolio legible to search engines and other crawlers by
shipping the three artifacts Slice D explicitly deferred — `robots.txt`,
`sitemap.xml`, and structured data — without changing any rendered UI.

Slice D's spec listed these under "Out of scope" as "worth doing, but a
separate concern from fixing dead links and previews", alongside a custom
domain. This slice picks up that deferred work, minus the domain.

---

## Measured current state (2026-08-16, production)

`curl` against `https://supakornohm.vercel.app`:

| Path | Status | Content-Type | Bytes |
|---|---|---|---|
| `/robots.txt` | 200 | `text/html; charset=utf-8` | 1,509 |
| `/sitemap.xml` | 200 | `text/html; charset=utf-8` | 1,509 |
| `/og.png` | 200 | `image/png` | 108,369 |
| `/icon.png` | 200 | `image/png` | 7,310 |
| `/images/projects/expense.webp` | 200 | `image/webp` | 7,152 |

Three facts follow, and each one shapes a decision below.

**1. `/robots.txt` currently serves the SPA shell.** Neither file exists, so
`vercel.json`'s catch-all rewrite returns `index.html` for both. A crawler
requesting `robots.txt` today receives HTML with a 200 status. In practice this
is benign — an unparseable robots.txt is conventionally treated as "allow all",
which is what we want anyway — but it is sloppy, and it means the site currently
publishes no sitemap reference and no crawl policy.

**2. Filesystem priority already beats the catch-all.** `/og.png`, `/icon.png`
and the project `.webp` files all resolve with their true content types rather
than being swallowed by the `/(.*)` rewrite. This is the behaviour CLAUDE.md
documents for Vercel `rewrites`, now confirmed against the live deploy. It is
strong evidence that once `robots.txt` and `sitemap.xml` exist under `public/`,
they will be served as files — it is the same mechanism, not an analogous one.

**3. The served HTML contains zero visible text.** 1,509 bytes,
`<div id="root"></div>` empty, no `ld+json`. Any crawler that does not execute
JavaScript sees the title, description and Open Graph tags and nothing else.
Googlebot does render JavaScript; many crawlers do not. This is the single most
important constraint on the design below, and it is *not* fixed by this slice.

---

## Design decisions

### E1 — `robots.txt`: permissive to every agent

`public/robots.txt`:

```
User-agent: *
Allow: /

Sitemap: https://supakornohm.vercel.app/sitemap.xml
```

One rule, every user-agent, plus an absolute sitemap URL (the spec requires
absolute, not relative).

**Chosen because** this is a portfolio whose entire job is to get its author
found. Appearing in AI answer engines is a channel a recruiter may well arrive
through, so excluding those crawlers trades away upside for no concrete gain.

**Rejected: blocking AI training crawlers** (`GPTBot`, `CCBot`,
`Google-Extended`, `ClaudeBot`). Defensible for a publisher protecting a content
business; wrong for someone who wants to be discovered. Also a maintenance
burden — the bot taxonomy shifts, and a stale blocklist gives the illusion of a
policy that no longer matches reality.

**Rejected: `Disallow:` with an empty value** as the allow-all idiom. It is the
older convention and equally valid, but `Allow: /` states the intent plainly to
a human reader, which is the only reader who will ever audit this file.

### E2 — `sitemap.xml`: one URL, no `lastmod`

`public/sitemap.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://supakornohm.vercel.app/</loc>
  </url>
</urlset>
```

**Only `/` is listed.** `/about`, `/projects` and `/connect` are redirect-only
routes: each serves the same `index.html`, which declares
`<link rel="canonical" href="https://supakornohm.vercel.app/">`. They are
therefore non-canonical URLs by the site's own declaration, and a sitemap should
list canonical URLs only. Listing them would ask search engines to index four
URLs that all self-identify as one.

**`lastmod` is omitted deliberately.** A static file cannot keep a modification
date honest. The sitemaps.org protocol itself is neutral on this — the relevant
guidance is Google's, which states it uses `lastmod` only when the value is
consistently and verifiably accurate, and otherwise ignores it. A hardcoded date
that silently rots therefore buys nothing and costs credibility.

**Rejected: generating the sitemap at build with a real `lastmod`.** Correct in
principle, but for a single-URL sitemap it buys one accurate timestamp at the
cost of a build script (see E5).

**Acknowledged limitation:** a one-URL sitemap is close to ceremonial. Google
will find `/` without it. It is included because it costs three lines, it is
what Search Console asks for, and it gives `robots.txt` something to point at.
This slice should not pretend it is doing more than that.

### E3 — JSON-LD: inline, static, `Person` + `WebSite`, no email

A single `<script type="application/ld+json">` block in `index.html`'s `<head>`,
written into the static HTML — **not** injected by React. The audience for this
data is precisely the crawler that does not run JavaScript (see measured fact 3),
so React injection would deliver it only to clients that least need it.

An `@graph` with two nodes joined by `@id` reference:

```json
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
        "React", "TypeScript", "Node.js", "Python", "SQL",
        "Full-stack web development", "Data Structures and Algorithms"
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
```

Every value above is taken from data already in the repo: the full name and
education from `About.tsx`'s `PERSONAL_INFO`, most skills from `Skills.tsx`'s
`SKILL_CATEGORIES` (with "Full-stack web development" drawn instead from the
meta description in `index.html`, which has no literal counterpart in
`SKILL_CATEGORIES`), the languages from `About.tsx`'s `LANGUAGES`, the profile
URLs from `Connect.tsx`, and the title and description from `index.html`.

**`email` is deliberately omitted.** Today the address appears only inside
JavaScript-rendered markup, so a harvester that does not execute JS finds no
address on this site at all. Adding it to JSON-LD would place it in the static
HTML and hand it to every scraper that fetches the page — a real, new exposure
introduced by an SEO change. The `mailto:` link in `Connect` continues to serve
human visitors, which is the only audience the address needs to reach.

**`affiliation`, not `alumniOf`.** `alumniOf` asserts completed study;
`PERSONAL_INFO` lists an in-progress degree and "Looking for Internships".

**`name` vs `alternateName`.** `About.tsx` gives the full name as "Supakorn
Prayongyam" while the page title brands as "Supakorn Ohm". Schema.org models
this directly, so both are carried and nothing is lost. If the intent is for
"Supakorn Ohm" to be the primary professional identity, swap the two values —
this is the one field in the slice that is a personal preference rather than a
technical call.

**`addressLocality` is "Bangkok" only.** `PERSONAL_INFO` says "Pathum Thani |
Bangkok, Thailand"; `PostalAddress` wants a single locality, and Bangkok is the
recognisable one. No street address is published.

**Rejected: including the 12 projects as an `ItemList` of `CreativeWork`.**
It would give non-rendering crawlers something about the actual work, which is
genuinely attractive given fact 3. But hand-writing them duplicates
`src/data/projects.ts` and will drift, and generating them needs the build
machinery E5 rejects. More honestly: it half-solves the empty-HTML problem by
smuggling a little content into the head, when the real fix is prerendering.
Deferred rather than approximated.

**Rejected: `ProfilePage` as the page type.** It fits a profile page, but
Google's `ProfilePage` rich result targets social and forum profiles with
follower and post counts. `WebSite` + `Person` is the accurate description here.

### E4 — one `ORIGIN` constant, enforced by test

The origin string appears in `index.html` (canonical, `og:url`, `og:image`, and
now three JSON-LD fields), in `robots.txt`, and in `sitemap.xml`. None of these
is a TypeScript module, so none can import a shared constant.

`scripts/site-origin.ts` exports `ORIGIN = 'https://supakornohm.vercel.app'`.
`scripts/head-metadata.test.ts` currently declares its own local `ORIGIN`; that
declaration is replaced by an import so there is exactly one definition in the
repo. A test then asserts that every origin occurrence across all three files
equals it.

This makes the constant an *assertion point* rather than a source that is
substituted in. That is the honest description: the files still contain literal
strings, and the test is what stops them diverging.

**Why this matters now:** a custom domain is planned for later. When it lands,
migration is a mechanical edit of three files plus the constant, and the test
names any file that was missed instead of leaving a stale URL to be discovered
by a search engine months later.

### E5 — static files, not generated

`robots.txt` and `sitemap.xml` are committed under `public/` as literal files.

**Rejected: a generator script** (the pattern of `scripts/render-og.ts` and
`scripts/optimize-images.ts`). Those two exist because their outputs — a
rendered PNG, re-encoded images — genuinely cannot be hand-authored. Three lines
of `robots.txt` can. Both existing scripts also carry a documented trap: they
execute bare `.ts` files, needing Node 22.18+/23.6+ native type stripping, and
fail against the project's Node 20 `engines` floor with a parse error rather
than a friendly message. Adding a third script with the same trap, to emit text
a person could type, is not a trade worth making.

**Rejected: a Vite plugin using `transformIndexHtml`/`generateBundle`.** True
single-sourcing and CI-safe, unlike a manual script. But the shipped files would
no longer exist in the repo to read, so tests would have to build first, and the
artifacts become invisible to anyone auditing the repo. Disproportionate for
three small files that change roughly never.

---

## Testing

New file `scripts/discoverability.test.ts`, following the established pattern in
`scripts/head-metadata.test.ts`: read the real files from disk, resolved from
`import.meta.url` rather than `process.cwd()`. It must live under `scripts/`,
not `src/` — it imports `node:fs`, and `tsconfig.app.json` sets
`types: ["vite/client"]` with no Node types, so a `node:` import under `src/`
passes `npm test` and fails `npm run typecheck` with TS2307.

| Assertion | Guards against |
|---|---|
| `robots.txt` has a `User-agent: *` group allowing `/` | An accidental disallow silently deindexing the site |
| `robots.txt` `Sitemap:` line is an absolute URL equal to `ORIGIN + '/sitemap.xml'` | A relative or stale sitemap reference |
| `sitemap.xml` declares the sitemaps.org 0.9 namespace, and its `urlset`/`url`/`loc` tags are balanced (no XML parser is installed, so tag counting stands in for well-formedness) | A malformed file that search engines reject wholesale |
| `sitemap.xml` contains exactly one `<loc>`, equal to `ORIGIN + '/'` | Silent growth of the URL set |
| `sitemap.xml` contains no `/about`, `/projects` or `/connect` | Someone "helpfully" adding the redirect-only routes, undoing E2's reasoning |
| `index.html` contains exactly one `ld+json` block, and it `JSON.parse`s | An unescaped character silently invalidating the whole block |
| The graph contains one `Person` and one `WebSite`; `WebSite.about` and `.publisher` resolve to the `Person`'s `@id` | A broken `@id` reference that quietly decouples the two nodes |
| `Person.sameAs` equals the GitHub and LinkedIn URLs derived from `Connect.tsx` | The profile links diverging between the page and the structured data |
| `Person` has no `email` key | E3's deliberate omission being reversed without the reasoning being revisited |
| `WebSite.name` / `.description` equal the `<title>` / `meta[name=description]` content | Structured data drifting from the head metadata it is supposed to describe |
| Every `https://…vercel.app` occurrence across four source files equals `ORIGIN`, plus a second scan of the bare host (with or without a scheme) across those four files and `assets-src/og/og.html` | Origin drift, especially during the future domain migration |

Each assertion is to be confirmed to fail against a deliberately broken input
before the task is considered done — a test that has never been seen red is not
yet known to discriminate.

---

## What no test here can prove

- **That Vercel serves the two new files rather than rewriting them.** No local
  check distinguishes a correct deploy from a broken one: `vite preview` serves
  `public/` from the filesystem regardless of `vercel.json`, so it would return
  the files even if the production config were wrong. The measured evidence
  above makes this very likely to work, but likely is not verified. Requires a
  post-deploy `curl` for both paths, asserting `text/plain` and
  `application/xml` rather than `text/html`, and a byte count that is not 1,509.
- **That any search engine acts on any of it.** Indexing, rich results and
  Knowledge Graph association are decisions made by third parties on their own
  schedule. This slice ships correct, valid inputs; it cannot ship outcomes.
- **That the JSON-LD is semantically sensible**, only that it is syntactically
  valid and internally consistent. Google's Rich Results Test and the Schema
  Markup Validator are the authorities, and both are manual.
- **The soft-404 interaction.** `/nonexistent-xyz` still returns HTTP 200 with
  the SPA shell (D2's accepted limitation). Those URLs now also carry the
  JSON-LD, describing a person and a website on a page that is really a 404.
  Every such URL declares `canonical: /`, so consolidation should handle it, but
  robots.txt cannot fix a status code and neither can this slice.

## Out of scope

- **Prerendering or SSR.** The empty served HTML is the root cause of most of
  this slice's awkwardness and deserves its own design, not a bolt-on.
- Project data in structured form (E3's rejected alternative).
- The custom domain migration — E4 prepares for it; it does not perform it.
- A true HTTP 404 status, still needing a serverless function (D's out-of-scope
  item, unchanged).
- Google Search Console verification and sitemap submission: an account action
  only the site owner can take.

# Slice E — Discoverability manual checks

Nothing local can prove these. `vite preview` serves `public/` straight from
the filesystem regardless of `vercel.json`, so it returns `robots.txt` and
`sitemap.xml` correctly **even if the production rewrite config is wrong** —
exactly the trap `vercel.json` already carries for the SPA routes.

## Post-deploy: the files are served as files, not rewritten

Before the deploy, both paths returned the SPA shell: `200`,
`text/html; charset=utf-8`, `1509` bytes. Anything still matching that shape
means the catch-all swallowed the file.

- [x] `curl -sS -o /dev/null -w "%{http_code} %{content_type} %{size_download}\n" https://supakornohm.vercel.app/robots.txt`
      → `200`, a `text/plain` content type, and a size that is **not** 1509.
- [x] `curl -sS -o /dev/null -w "%{http_code} %{content_type} %{size_download}\n" https://supakornohm.vercel.app/sitemap.xml`
      → `200`, an XML content type (`application/xml` or `text/xml`), size **not** 1509.
- [x] `curl -sS https://supakornohm.vercel.app/robots.txt` prints the four
      expected lines, not HTML.
- [x] The existing static assets still resolve, confirming nothing regressed:
      `/og.png` is `image/png` and `/images/projects/expense.webp` is `image/webp`.

### Measured 2026-08-16, immediately after PR #12 merged as 9ed150b

**The claim no test could prove is now proven.** Both files are served as
files, at exactly their on-disk byte sizes, not rewritten to the SPA shell:

| Path | Status | Content-Type | Bytes | Pre-deploy was |
|---|---|---|---|---|
| `/robots.txt` | 200 | `text/plain; charset=utf-8` | 76 | 200 `text/html` 1509 |
| `/sitemap.xml` | 200 | `application/xml` | 174 | 200 `text/html` 1509 |

Both bodies fetched and confirmed correct: `robots.txt` prints its four lines,
`sitemap.xml` its single `<loc>`. Neither is HTML.

**No regression.** Static assets still resolve with true content types
(`/og.png` `image/png`, `/icon.png` `image/png`,
`/images/projects/expense.webp` `image/webp`), and every SPA route still
returns the shell (`/`, `/about`, `/projects`, `/connect`, and
`/nonexistent-xyz` — the last being D2's accepted soft 404).

**JSON-LD verified in the LIVE served HTML**, not just the source file:
parsed straight off the wire, `@graph` is `[Person, WebSite]`,
`name` is `Supakorn Prayongyam`, the WebSite name carries a literal `&`
("Supakorn Ohm — Computer Engineering Student & Developer"), and **no `email`
key is present**. The entity-encoding trap did not bite in production, and the
deliberate omission survived the build.

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

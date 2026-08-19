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
  });

  it('publishes no Person image', () => {
    // Deliberate: schema.org Person.image means a depiction of the person, and
    // the only image in the repo is og.png, a text branding card with no
    // photograph. Declaring it invites a knowledge panel to show a banner
    // where a headshot belongs. Restore this only with a real photo.
    expect(nodeOfType('Person')).not.toHaveProperty('image');
  });

  it('records the IEEE Best Paper Award', () => {
    // The strongest credential on the site; schema.org Person.award is the only
    // field that states it in machine-readable form.
    const award = nodeOfType('Person')?.award as string | undefined;
    expect(award).toContain('Best Paper Award');
    expect(award).toContain('IEEE IMC 2026');
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

  it('identifies the website', () => {
    const site = nodeOfType('WebSite');
    expect(site?.['@id']).toBe(`${ORIGIN}/#website`);
    expect(site?.url).toBe(`${ORIGIN}/`);
    expect(site?.inLanguage).toBe('en');
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

  // The OG card template writes the origin as a BARE HOST with no scheme, so
  // the URL scan above finds nothing in it. This second pass catches the host
  // wherever it appears, with or without a scheme.
  const HOST = new URL(ORIGIN).host;
  const FILES_WITH_HARDCODED_HOST = [
    'index.html',
    'README.md',
    'public/robots.txt',
    'public/sitemap.xml',
    'assets-src/og/og.html',
  ];

  it.each(FILES_WITH_HARDCODED_HOST)('every host in %s matches ORIGIN', (relative) => {
    const contents = readRepoFile(relative);
    const hosts = contents.match(/supakornohm[a-z0-9.-]*\.[a-z]{2,}/gi) ?? [];
    expect(hosts.length).toBeGreaterThan(0);
    for (const host of hosts) {
      expect(host.toLowerCase()).toBe(HOST);
    }
  });
});

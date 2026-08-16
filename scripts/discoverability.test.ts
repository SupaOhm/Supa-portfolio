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

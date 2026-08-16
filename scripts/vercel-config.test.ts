import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Resolved from this file's own URL rather than process.cwd(), so the test does
// not depend on which directory vitest was invoked from. Matches the idiom in
// scripts/head-metadata.test.ts.
const readRepoFile = (relative: string): string =>
  readFileSync(fileURLToPath(new URL(`../${relative}`, import.meta.url)), 'utf-8');

// NOTE: this does not prove Vercel honours vercel.json in production — probed,
// `vite preview` returns 200 and the SPA shell for every route even with
// vercel.json absent entirely. What it proves is that the file exists, is
// well-formed JSON, and has not been converted to the dangerous legacy form
// described below.
describe('vercel.json', () => {
  const raw = readRepoFile('vercel.json');

  it('parses as JSON', () => {
    expect(() => JSON.parse(raw)).not.toThrow();
  });

  it('rewrites every path to index.html for the SPA shell', () => {
    const config = JSON.parse(raw);
    expect(config.rewrites).toEqual([{ source: '/(.*)', destination: '/index.html' }]);
  });

  it('has no `routes` key', () => {
    // Per Vercel's docs, `rewrites` "checks the filesystem by default" and
    // "precedence is given to the filesystem prior to rewrites being
    // applied" — so /images/*, /og.png, etc. are served as real files before
    // the SPA rewrite ever applies. The legacy `routes` property does not get
    // that behaviour for free: it requires an explicit
    // `{"handle": "filesystem"}` phase to restore filesystem precedence.
    // Converting this config from `rewrites` to `routes` without adding that
    // phase would 404 every static asset on the site — every project image,
    // the favicon, og.png — because the catch-all route would swallow them
    // before the filesystem was ever checked.
    const config = JSON.parse(raw);
    expect(config).not.toHaveProperty('routes');
  });
});

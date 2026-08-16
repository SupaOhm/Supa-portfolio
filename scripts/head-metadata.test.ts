import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { MAX_BYTES } from './render-og';
import { ORIGIN } from './site-origin';

// Resolved from this file's own URL rather than process.cwd(), so the test does
// not depend on which directory vitest was invoked from.
const readRepoFile = (relative: string): string =>
  readFileSync(fileURLToPath(new URL(`../${relative}`, import.meta.url)), 'utf-8');

const html = readRepoFile('index.html');
const readme = readRepoFile('README.md');

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

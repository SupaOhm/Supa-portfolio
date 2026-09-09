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

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The navbar is `fixed`, so it is out of flow and the sections know nothing
 * about it. `scrollIntoView` and `#hash` jumps both align a section flush to
 * the top of the scrollport, which put every section heading *behind* the bar
 * — on the navbar's own links, on the /about /projects /connect redirects, and
 * on a pasted deep link.
 *
 * `scroll-padding-top` on `html` fixes it for all three at once, but it is a
 * number in a stylesheet that has to agree with class names in a component.
 * Nothing in the browser links them, so this does: it reads the navbar's
 * Tailwind position and height classes, computes where the bar actually ends,
 * and fails if the stylesheet no longer clears it.
 *
 * It lives under scripts/ because tsconfig.app.json sets types: ["vite/client"]
 * with no Node types, so a node:fs import anywhere under src/ passes vitest and
 * fails typecheck.
 */
const NAVBAR = readFileSync(join(process.cwd(), 'src', 'components', 'Navbar.tsx'), 'utf8');
const CSS = readFileSync(join(process.cwd(), 'src', 'index.css'), 'utf8');

/** Tailwind's default spacing scale: one step is 0.25rem. */
const REM_PX = 16;
const spacingPx = (step: number) => step * 0.25 * REM_PX;

/**
 * Matches exactly once or throws. A silent second match would let the test
 * measure the wrong element; a silent zero would let a renamed class pass.
 */
function soleMatch(source: string, pattern: RegExp, label: string): RegExpMatchArray {
  const matches = [...source.matchAll(new RegExp(pattern, 'g'))];
  if (matches.length !== 1) {
    throw new Error(`expected exactly one ${label}, found ${matches.length}`);
  }
  return matches[0];
}

/**
 * Distance from the viewport top to the bottom of the navbar, in px.
 *
 * The bar's height is read from the responsive pair `h-14 sm:h-16` rather than
 * a bare `h-*`, because the navbar also sizes icons and buttons — a lone
 * `h-(\d+)` matches seven things and would silently measure an svg.
 */
function navbarBottomPx(breakpoint: 'base' | 'sm'): number {
  const height = soleMatch(
    NAVBAR,
    /\bh-(\d+) sm:h-(\d+)\b/,
    'h-* sm:h-* (the navbar bar row)',
  );
  if (breakpoint === 'base') {
    soleMatch(NAVBAR, /\btop-0\b/, 'top-0 (mobile navbar offset)');
    return 0 + spacingPx(Number(height[1]));
  }
  const top = soleMatch(NAVBAR, /\bsm:top-(\d+)\b/, 'sm:top-* (desktop navbar offset)');
  return spacingPx(Number(top[1])) + spacingPx(Number(height[2]));
}

/** The declared scroll-padding-top, in px, at a breakpoint. */
function scrollPaddingPx(breakpoint: 'base' | 'sm'): number {
  const declaration = /scroll-padding-top:\s*([\d.]+)rem/;
  if (breakpoint === 'base') {
    // The first declaration is the unconditional one on `html`; the second
    // lives inside the min-width query and is read separately below.
    const [first] = [...CSS.matchAll(new RegExp(declaration, 'g'))];
    if (!first) throw new Error('no scroll-padding-top declared in src/index.css');
    return Number(first[1]) * REM_PX;
  }
  const query = soleMatch(
    CSS,
    /@media \(min-width: 640px\) \{[^]*?scroll-padding-top:\s*([\d.]+)rem/,
    'scroll-padding-top inside the 640px query',
  );
  return Number(query[1]) * REM_PX;
}

describe('scroll offset clears the fixed navbar', () => {
  it.each(['base', 'sm'] as const)(
    'at the %s breakpoint, a scrolled-to section starts below the bar',
    (breakpoint) => {
      expect(scrollPaddingPx(breakpoint)).toBeGreaterThanOrEqual(navbarBottomPx(breakpoint));
    },
  );

  it.each(['base', 'sm'] as const)(
    'at the %s breakpoint, the gap stays a gap and not a void',
    (breakpoint) => {
      // Clearing the bar is the requirement; this catches the other direction,
      // where a stale value survives because it happens to be large enough.
      const slack = scrollPaddingPx(breakpoint) - navbarBottomPx(breakpoint);
      expect(slack).toBeLessThanOrEqual(32);
    },
  );

  it('declares a larger offset from sm up, where the bar is taller and inset', () => {
    expect(navbarBottomPx('sm')).toBeGreaterThan(navbarBottomPx('base'));
    expect(scrollPaddingPx('sm')).toBeGreaterThan(scrollPaddingPx('base'));
  });

  it('reads the values it claims to read', () => {
    // Guards the parser itself: if a regex silently stops matching the real
    // markup, every assertion above degrades into comparing two zeros.
    expect(navbarBottomPx('base')).toBe(56);
    expect(navbarBottomPx('sm')).toBe(88);
  });
});

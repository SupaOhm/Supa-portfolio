/**
 * The deployed origin, with no trailing slash.
 *
 * This string is duplicated by necessity into files that cannot import it:
 * `index.html`, `README.md`, `public/robots.txt`, `public/sitemap.xml`, and
 * `assets-src/og/og.html` are not TypeScript modules. It is therefore an
 * assertion point rather than a substitution source —
 * `scripts/discoverability.test.ts` guards exactly those source files and
 * fails if any of them disagrees with this value.
 *
 * `public/og.png` is NOT guarded: it is a rendered binary carrying the origin
 * as pixels, not text, so no test can check it. A domain change additionally
 * requires re-running `npm run og` to re-render it.
 *
 * A custom domain is planned for later. When it lands, change this constant and
 * run `npm test`: the failures name every guarded source file still carrying
 * the old origin (`public/og.png` still needs the manual re-render above).
 */
export const ORIGIN = 'https://supakornohm.vercel.app';

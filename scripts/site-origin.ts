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

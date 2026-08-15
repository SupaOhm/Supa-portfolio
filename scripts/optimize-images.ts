import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import { basename, extname, join } from 'node:path';

/**
 * Run via `npm run images` (`node scripts/optimize-images.ts`), executed as a
 * bare `.ts` file. That relies on Node's unflagged native type stripping,
 * which only ships from Node 22.18 / 23.6 onward — the project's `engines`
 * floor (Node 20.x, or 22.12–22.17) throws a parse error before you ever
 * reach the `sips`/`cwebp` install hints below. `engines` in package.json is
 * intentionally NOT raised for this: the app itself runs fine on Node 20,
 * this script is a dev-only, manually-run tool. Also requires macOS (for
 * `sips`) and `cwebp` (`brew install webp`).
 */

/**
 * Widest slot any project image renders into is ~400 CSS px: the carousel card
 * is `w-[360px]` (Projects.tsx:308) and the grid at lg:grid-cols-3 inside
 * max-w-7xl lands near 400px. 800 covers that at 2x DPR.
 */
export const TARGET_WIDTH = 800;

/** Quality the spec's measured 6.82 MB -> 288 KB table was produced at. */
export const WEBP_QUALITY = 82;

const SOURCE_DIR = 'assets-src/projects';
const OUTPUT_DIR = 'public/images/projects';

/**
 * cwebp resize arguments, or none.
 *
 * cwebp has no "downscale only" flag: `-resize 800 0` on a 300px-wide source
 * UPSCALES it. revrace.jpeg (300x168) went 8.1 KB -> 16.3 KB that way, the one
 * file of eleven a blanket resize makes worse. Hence the explicit clamp.
 */
export function resizeArgs(srcWidth: number, target: number): string[] {
  return srcWidth > target ? ['-resize', String(target), '0'] : [];
}

/**
 * Pull the pixel width out of `sips -g pixelWidth <file>` output, which is two
 * lines: the absolute path, then `  pixelWidth: 2940`.
 */
export function parsePixelWidth(sipsOutput: string): number {
  const match = sipsOutput.match(/pixelWidth:\s*(\d+)/);
  if (!match) {
    throw new Error(`sips printed no pixelWidth:\n${sipsOutput}`);
  }
  return Number(match[1]);
}

function requireTool(tool: string, brewFormula: string): void {
  try {
    execFileSync('which', [tool], { stdio: 'ignore' });
  } catch {
    throw new Error(`${tool} not found. Install it with: brew install ${brewFormula}`);
  }
}

function main(): void {
  // sips ships with macOS; cwebp comes from the webp formula.
  requireTool('sips', 'sips');
  requireTool('cwebp', 'webp');

  if (!existsSync(SOURCE_DIR)) {
    throw new Error(`Missing ${SOURCE_DIR}. Originals belong there, not in public/.`);
  }
  mkdirSync(OUTPUT_DIR, { recursive: true });

  const sources = readdirSync(SOURCE_DIR).filter((file) =>
    ['.png', '.jpg', '.jpeg'].includes(extname(file).toLowerCase()),
  );

  for (const file of sources) {
    const source = join(SOURCE_DIR, file);
    const output = join(OUTPUT_DIR, `${basename(file, extname(file))}.webp`);
    const width = parsePixelWidth(
      execFileSync('sips', ['-g', 'pixelWidth', source], { encoding: 'utf8' }),
    );

    execFileSync('cwebp', [
      '-quiet',
      '-q',
      String(WEBP_QUALITY),
      ...resizeArgs(width, TARGET_WIDTH),
      source,
      '-o',
      output,
    ]);

    console.log(`${file} (${width}px) -> ${basename(output)}`);
  }

  console.log(`\n${sources.length} images encoded to ${OUTPUT_DIR}`);
}

// Only run the driver when executed directly, so importing the helpers in a
// test does not shell out to sips and cwebp.
if (process.argv[1]?.endsWith('optimize-images.ts')) {
  main();
}

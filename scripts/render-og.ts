import { execFileSync } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { join } from 'node:path';

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

/**
 * Hardcoded because this script is macOS-and-local only, exactly like
 * `npm run images`. It must never run in CI.
 */
export const CHROME_BIN = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

/** Soft cap from the spec. Over this, re-encode as JPEG rather than shipping it. */
export const MAX_BYTES = 300_000;

/**
 * Builds the headless Chrome invocation.
 *
 * `--force-device-scale-factor=1` is the flag that pins the output to exactly
 * WIDTHxHEIGHT; without it the screenshot scales with the host display's device
 * pixel ratio and a Retina machine silently produces a 2400x1260 image.
 */
export function chromeArgs(
  sourceUrl: string,
  outputPath: string,
  width: number = OG_WIDTH,
  height: number = OG_HEIGHT,
): string[] {
  return [
    '--headless',
    '--disable-gpu',
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    `--screenshot=${outputPath}`,
    `--window-size=${width},${height}`,
    sourceUrl,
  ];
}

function main(): void {
  if (!existsSync(CHROME_BIN)) {
    throw new Error(
      `Google Chrome not found at ${CHROME_BIN}. This script is macOS-only, like npm run images.`,
    );
  }

  const root = fileURLToPath(new URL('..', import.meta.url));
  const source = pathToFileURL(join(root, 'assets-src/og/og.html')).href;
  const output = join(root, 'public/og.png');

  // Chrome prints `task_policy_set … (os/kern) invalid argument` to stderr on
  // macOS. It is harmless noise, not a failure — the exit code is what matters.
  execFileSync(CHROME_BIN, chromeArgs(source, output), { stdio: 'inherit' });

  const bytes = statSync(output).size;
  console.log(`public/og.png: ${OG_WIDTH}x${OG_HEIGHT}, ${bytes} bytes`);
  if (bytes > MAX_BYTES) {
    console.warn(`WARNING: ${bytes} bytes exceeds the ${MAX_BYTES} cap. Re-encode as JPEG.`);
  }
}

// Guarded so that importing this module from a test never shells out to Chrome.
if (process.argv[1]?.endsWith('render-og.ts')) {
  main();
}

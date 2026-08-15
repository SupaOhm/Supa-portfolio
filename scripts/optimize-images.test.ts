import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import { resizeArgs, parsePixelWidth, TARGET_WIDTH, WEBP_QUALITY } from './optimize-images';
import { PROJECTS } from '../src/data/projects';

describe('resizeArgs', () => {
  it('resizes when the source is wider than the target', () => {
    expect(resizeArgs(2940, 800)).toEqual(['-resize', '800', '0']);
  });

  it('returns no args when the source is narrower than the target', () => {
    // revrace.jpeg is 300x168. Upscaling it to 800 made it 8.1 KB -> 16.3 KB,
    // the one file a blanket resize would make WORSE.
    expect(resizeArgs(300, 800)).toEqual([]);
  });

  it('returns no args when the source is exactly the target width', () => {
    expect(resizeArgs(800, 800)).toEqual([]);
  });
});

describe('parsePixelWidth', () => {
  it('reads the width out of real sips output', () => {
    // Exact two-line shape of `sips -g pixelWidth <file>`.
    const output = '/abs/path/hci.png\n  pixelWidth: 2940\n';
    expect(parsePixelWidth(output)).toBe(2940);
  });

  it('throws when sips printed no width', () => {
    expect(() => parsePixelWidth('/abs/path/broken.png\n')).toThrow('pixelWidth');
  });
});

describe('encoder constants', () => {
  it('pins the values the spec measured against', () => {
    // The spec's 6.82 MB -> 288 KB table was produced at exactly these settings.
    expect(TARGET_WIDTH).toBe(800);
    expect(WEBP_QUALITY).toBe(82);
  });
});

describe('project image references', () => {
  it('points every non-empty imageUrl at a file that exists', () => {
    // Catches a rename typo in projects.ts, which would otherwise ship as a
    // silently broken image: the src 404s and the card renders an empty box.
    const missing = PROJECTS.filter(
      (project) => project.imageUrl && !existsSync(join('public', project.imageUrl)),
    ).map((project) => project.imageUrl);

    expect(missing).toEqual([]);
  });

  it('uses only .webp, so no original sneaks back into public/', () => {
    const notWebp = PROJECTS.map((project) => project.imageUrl)
      .filter((url): url is string => url !== '' && url !== undefined)
      .filter((url) => !url.endsWith('.webp'));

    expect(notWebp).toEqual([]);
  });
});

import { describe, it, expect } from 'vitest';
import { resizeArgs, parsePixelWidth, TARGET_WIDTH, WEBP_QUALITY } from './optimize-images';

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

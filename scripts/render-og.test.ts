import { describe, it, expect } from 'vitest';
import { chromeArgs, OG_WIDTH, OG_HEIGHT } from './render-og';

describe('chromeArgs', () => {
  it('requests a screenshot of the given source at the given path', () => {
    const args = chromeArgs('file:///tmp/og.html', '/tmp/out.png');

    expect(args).toContain('--headless');
    expect(args).toContain('--screenshot=/tmp/out.png');
    expect(args).toContain('file:///tmp/og.html');
  });

  it('pins the device scale factor to 1', () => {
    // Without this flag the screenshot scales with the host display's DPR, so
    // the same command yields 2400x1260 on a Retina machine. This is the single
    // flag that makes the output size reproducible across machines.
    expect(chromeArgs('file:///tmp/og.html', '/tmp/out.png')).toContain(
      '--force-device-scale-factor=1',
    );
  });

  it('sizes the window to the OG card dimensions', () => {
    expect(chromeArgs('file:///tmp/og.html', '/tmp/out.png')).toContain(
      `--window-size=${OG_WIDTH},${OG_HEIGHT}`,
    );
    expect([OG_WIDTH, OG_HEIGHT]).toEqual([1200, 630]);
  });
});

import { describe, expect, it } from 'vitest';
import { HUE_STOPS, hueAtProgress, lerpHue, scrollProgress } from './pageHue';

describe('lerpHue', () => {
  it('returns the endpoints exactly', () => {
    expect(lerpHue(250, 185, 0)).toBe(250);
    expect(lerpHue(250, 185, 1)).toBe(185);
  });

  it('takes the short way round the circle', () => {
    // The whole reason this is not a plain lerp. 350 and 10 are 20 degrees
    // apart; interpolating them the long way walks backwards through the entire
    // spectrum, which is what makes an animated background look like a rainbow
    // rather than a colour shift.
    expect(lerpHue(350, 10, 0.5)).toBe(0);
    expect(lerpHue(10, 350, 0.5)).toBe(0);
  });

  it('always returns a hue inside one turn', () => {
    for (let t = 0; t <= 1; t += 0.05) {
      const h = lerpHue(350, 10, t);
      expect(h).toBeGreaterThanOrEqual(0);
      expect(h).toBeLessThan(360);
    }
  });

  it('moves monotonically across a segment', () => {
    // A sweep that reverses direction mid-segment reads as a wobble.
    const samples = Array.from({ length: 11 }, (_, i) => lerpHue(250, 185, i / 10));
    for (let i = 1; i < samples.length; i += 1) {
      expect(samples[i]).toBeLessThan(samples[i - 1]);
    }
  });
});

describe('hueAtProgress', () => {
  it('starts on the first stop and ends on the last', () => {
    expect(hueAtProgress(0)).toBe(HUE_STOPS[0]);
    expect(hueAtProgress(1)).toBe(HUE_STOPS[HUE_STOPS.length - 1]);
  });

  it('does not index past the end at exactly 1', () => {
    // Math.floor(1 * segments) lands ON segments, one past the last valid
    // start index; without the clamp this reads undefined and returns NaN,
    // which CSS then drops silently -- the background would simply stop
    // updating at the very bottom of the page.
    expect(Number.isNaN(hueAtProgress(1))).toBe(false);
  });

  it('clamps out-of-range progress rather than extrapolating', () => {
    // Rubber-band scrolling on iOS reports negative scrollY routinely.
    expect(hueAtProgress(-0.5)).toBe(HUE_STOPS[0]);
    expect(hueAtProgress(1.5)).toBe(HUE_STOPS[HUE_STOPS.length - 1]);
  });

  it('hits each stop at its own position in the scroll', () => {
    const segments = HUE_STOPS.length - 1;
    HUE_STOPS.forEach((stop, i) => {
      expect(hueAtProgress(i / segments)).toBeCloseTo(stop, 6);
    });
  });

  it('never holds one value across a span, which is the seam it exists to remove', () => {
    // The point of the whole mechanism: the colour is always between two stops
    // and never parks on one for a screen and then switches. A background that
    // holds and switches is what reads as "pages by pages".
    const samples = Array.from({ length: 40 }, (_, i) => hueAtProgress(i / 39));
    const repeats = samples.filter((h, i) => i > 0 && h === samples[i - 1]);
    expect(repeats).toHaveLength(0);
  });

  it('survives degenerate stop lists', () => {
    expect(hueAtProgress(0.5, [])).toBe(0);
    expect(hueAtProgress(0.5, [42])).toBe(42);
  });
});

describe('scrollProgress', () => {
  it('maps the scrollable range onto 0..1', () => {
    expect(scrollProgress(0, 3000, 1000)).toBe(0);
    expect(scrollProgress(1000, 3000, 1000)).toBe(0.5);
    expect(scrollProgress(2000, 3000, 1000)).toBe(1);
  });

  it('returns 0 when the page does not scroll, rather than dividing by zero', () => {
    // This is the state every jsdom test renders in -- jsdom performs no
    // layout, so scrollHeight and innerHeight leave nothing scrollable. It is
    // also a genuinely short page on a tall display.
    expect(scrollProgress(0, 800, 800)).toBe(0);
    expect(scrollProgress(0, 0, 0)).toBe(0);
    expect(scrollProgress(50, 500, 900)).toBe(0);
  });

  it('clamps overscroll at both ends', () => {
    expect(scrollProgress(-120, 3000, 1000)).toBe(0);
    expect(scrollProgress(9999, 3000, 1000)).toBe(1);
  });
});

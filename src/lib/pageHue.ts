/**
 * Scroll-position-to-hue mapping for the page's background.
 *
 * Pure, so the interpolation can be tested without a DOM or a scroll. The
 * listener that drives it lives in hooks/usePageHue.ts.
 *
 * The whole reason this is hue arithmetic rather than a stack of cross-fading
 * layers: OKLCH separates hue from lightness and chroma, so moving along the
 * hue axis alone changes the colour without changing how bright or how vivid it
 * is. Cross-fading two RGB colours dips through whatever sits between them --
 * usually a grey, often a muddy one. Rotating a hue never does, which is what
 * makes a continuous sweep across four colours stay the same weight the whole
 * way.
 */

/** The page's hue path, in the order you meet it scrolling down. */
export const HUE_STOPS = [250, 185, 75, 295] as const;

/**
 * Interpolate between two hue angles the short way round.
 *
 * Hue is a circle, so 350 and 10 are 20 degrees apart, not 340. Interpolating
 * them naively walks backwards through the entire spectrum -- which looks
 * exactly like a rainbow sweep and is the single most common way a
 * colour-animated background ends up looking cheap.
 */
export function lerpHue(a: number, b: number, t: number): number {
  const delta = ((((b - a) % 360) + 540) % 360) - 180;
  return (((a + delta * t) % 360) + 360) % 360;
}

/**
 * The hue at a point in the scroll, `progress` running 0 at the top to 1 at the
 * bottom.
 *
 * The stops are spread evenly across the scroll and each segment is
 * interpolated independently, so the colour is always moving and never sits
 * still on one value -- a background that holds a colour for a screen and then
 * switches is the "pages by pages" effect this replaces.
 */
export function hueAtProgress(progress: number, stops: readonly number[] = HUE_STOPS): number {
  if (stops.length === 0) {
    return 0;
  }
  if (stops.length === 1) {
    return stops[0];
  }

  const clamped = Math.min(1, Math.max(0, progress));
  const segments = stops.length - 1;
  const scaled = clamped * segments;
  // The last stop must not index past the end when progress is exactly 1.
  const index = Math.min(segments - 1, Math.floor(scaled));

  return lerpHue(stops[index], stops[index + 1], scaled - index);
}

/**
 * Scroll progress from raw measurements.
 *
 * Returns 0 rather than dividing when the document is not taller than the
 * viewport. That is not a defensive flourish -- it is the state every jsdom
 * test renders in, since jsdom performs no layout and reports every height as
 * 0, and it is also a real short page on a tall display.
 */
export function scrollProgress(scrollY: number, scrollHeight: number, viewportHeight: number): number {
  const scrollable = scrollHeight - viewportHeight;
  if (scrollable <= 0) {
    return 0;
  }
  return Math.min(1, Math.max(0, scrollY / scrollable));
}

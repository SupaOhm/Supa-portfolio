import { describe, it, expect } from 'vitest';
import { POSITION_STYLES, REDUCED_POSITION_STYLES } from './carouselPositionStyles';

describe('carousel position styles', () => {
  it('defines the same slots in both maps', () => {
    expect(Object.keys(REDUCED_POSITION_STYLES).sort()).toEqual(
      Object.keys(POSITION_STYLES).sort(),
    );
  });

  it('covers slots -2 through 2', () => {
    expect(Object.keys(POSITION_STYLES).map(Number).sort((a, b) => a - b)).toEqual([
      -2, -1, 0, 1, 2,
    ]);
  });

  it('drops rotateY and scale from every reduced slot', () => {
    for (const [slot, style] of Object.entries(REDUCED_POSITION_STYLES)) {
      const transform = String(style.transform);
      expect(transform, `slot ${slot} must not rotate`).not.toContain('rotateY');
      expect(transform, `slot ${slot} must not scale`).not.toContain('scale');
    }
  });

  it('keeps translateX in every reduced slot so position stays legible', () => {
    for (const [slot, style] of Object.entries(REDUCED_POSITION_STYLES)) {
      expect(String(style.transform), `slot ${slot}`).toContain('translateX');
    }
  });

  it('keeps opacity and zIndex identical between the two maps', () => {
    for (const key of Object.keys(POSITION_STYLES)) {
      const slot = Number(key);
      expect(REDUCED_POSITION_STYLES[slot].opacity).toBe(POSITION_STYLES[slot].opacity);
      expect(REDUCED_POSITION_STYLES[slot].zIndex).toBe(POSITION_STYLES[slot].zIndex);
    }
  });

  it('keeps the full-motion map rotating, so the two are genuinely different', () => {
    expect(String(POSITION_STYLES[1].transform)).toContain('rotateY');
    expect(String(POSITION_STYLES[-1].transform)).toContain('rotateY');
  });

  it('dims the neighbour slots with opacity alone, never a filter', () => {
    for (const map of [POSITION_STYLES, REDUCED_POSITION_STYLES]) {
      for (const slot of [1, -1]) {
        // 0.8 keeps in-card body text at 4.86:1 against the card's own
        // background, clearing the 4.5:1 needed by WCAG 1.4.3. A brightness()
        // filter would dim text and background together and collapse it to
        // 2.46:1, as well as forcing a re-raster on every frame.
        expect(map[slot].opacity, `slot ${slot}`).toBe(0.8);
      }
    }
  });

  it('sets no filter on any slot in either map', () => {
    for (const map of [POSITION_STYLES, REDUCED_POSITION_STYLES]) {
      for (const [slot, style] of Object.entries(map)) {
        expect(style.filter, `slot ${slot}`).toBeUndefined();
      }
    }
  });
});

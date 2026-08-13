import { describe, it, expect } from 'vitest';
import { getCarouselPosition } from './useCarousel';

/**
 * These tests CHARACTERIZE current behaviour. The `total === 4` case is
 * asymmetric (slot -2 is never filled while slot 2 is). That is recorded here
 * as an audit finding, not endorsed as correct. Changing it is a separate,
 * deliberate commit against a then-failing test.
 */
describe('getCarouselPosition', () => {
  const slotsFor = (total: number): Array<number | null> =>
    Array.from({ length: Math.max(total, 1) }, (_, i) => getCarouselPosition(i, 0, total));

  const SLOT_TABLE: Array<{ total: number; slots: Array<number | null> }> = [
    { total: 0, slots: [null] },
    { total: 1, slots: [0] },
    { total: 2, slots: [0, 1] },
    { total: 3, slots: [0, 1, -1] },
    { total: 4, slots: [0, 1, 2, -1] },
    { total: 5, slots: [0, 1, 2, -2, -1] },
    { total: 6, slots: [0, 1, 2, null, -2, -1] },
  ];

  for (const { total, slots } of SLOT_TABLE) {
    it(`assigns slots ${JSON.stringify(slots)} when total=${total}`, () => {
      expect(slotsFor(total)).toEqual(slots);
    });
  }

  it('leaves slot -2 empty at total=4 while slot 2 is filled (known asymmetry)', () => {
    const slots = slotsFor(4);
    expect(slots).toContain(2);
    expect(slots).not.toContain(-2);
  });

  it('returns null for total=0 rather than NaN leaking through', () => {
    expect(getCarouselPosition(0, 0, 0)).toBeNull();
  });

  it('is invariant under rotation of index and current together', () => {
    const total = 5;
    for (let index = 0; index < total; index += 1) {
      for (let current = 0; current < total; current += 1) {
        expect(getCarouselPosition(index, current, total)).toBe(
          getCarouselPosition((index + 1) % total, (current + 1) % total, total),
        );
      }
    }
  });
});

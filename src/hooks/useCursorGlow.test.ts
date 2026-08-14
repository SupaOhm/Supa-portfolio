import { describe, it, expect } from 'vitest';
import {
  nextGlowPosition,
  hasConverged,
  DEFAULT_SMOOTHING,
  CONVERGENCE_EPSILON,
} from './useCursorGlow';

describe('nextGlowPosition', () => {
  it('moves 15% of the way toward the target by default', () => {
    expect(nextGlowPosition({ x: 0, y: 0 }, { x: 100, y: 40 })).toEqual({ x: 15, y: 6 });
  });

  it('honours an explicit smoothing factor', () => {
    expect(nextGlowPosition({ x: 0, y: 0 }, { x: 100, y: 0 }, 0.5)).toEqual({ x: 50, y: 0 });
  });

  it('is a no-op when current already equals target', () => {
    expect(nextGlowPosition({ x: 12, y: 34 }, { x: 12, y: 34 })).toEqual({ x: 12, y: 34 });
  });

  it('closes the gap from either direction', () => {
    expect(nextGlowPosition({ x: 100, y: 0 }, { x: 0, y: 0 })).toEqual({ x: 85, y: 0 });
  });

  it('exposes 0.15 as the default smoothing', () => {
    expect(DEFAULT_SMOOTHING).toBe(0.15);
  });
});

describe('hasConverged', () => {
  it('is false while the gap is large', () => {
    expect(hasConverged({ x: 0, y: 0 }, { x: 100, y: 0 })).toBe(false);
  });

  it('is true once both axes are inside epsilon', () => {
    expect(hasConverged({ x: 99.6, y: 10.2 }, { x: 100, y: 10 })).toBe(true);
  });

  it('requires BOTH axes to be inside epsilon', () => {
    expect(hasConverged({ x: 99.6, y: 0 }, { x: 100, y: 50 })).toBe(false);
    expect(hasConverged({ x: 0, y: 49.9 }, { x: 50, y: 50 })).toBe(false);
  });

  it('honours an explicit epsilon', () => {
    expect(hasConverged({ x: 0, y: 0 }, { x: 3, y: 0 }, 5)).toBe(true);
  });

  it('exposes 0.5 as the default epsilon', () => {
    expect(CONVERGENCE_EPSILON).toBe(0.5);
  });
});

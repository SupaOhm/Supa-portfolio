// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { createIntersectionObserver, createMatchMedia } from './doubles';

describe('createIntersectionObserver().install()', () => {
  it('round-trips window.IntersectionObserver: double while installed, original after restore', () => {
    const original = window.IntersectionObserver;
    const double = createIntersectionObserver();

    const restore = double.install();
    expect(window.IntersectionObserver).not.toBe(original);

    restore();
    expect(window.IntersectionObserver).toBe(original);
  });
});

describe('createMatchMedia().install()', () => {
  it('round-trips window.matchMedia: double while installed, original after restore', () => {
    const original = window.matchMedia;
    const double = createMatchMedia();

    const restore = double.install();
    expect(window.matchMedia).not.toBe(original);

    restore();
    expect(window.matchMedia).toBe(original);
  });
});

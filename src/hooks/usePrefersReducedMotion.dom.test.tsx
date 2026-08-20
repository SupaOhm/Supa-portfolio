// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { renderHook, cleanup } from '@testing-library/react';
import { act } from 'react';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';
import { createMatchMedia } from '../test/doubles';

let restore: (() => void) | undefined;

afterEach(() => {
  cleanup();
  restore?.();
  restore = undefined;
});

describe('usePrefersReducedMotion', () => {
  it('is already true on the first render when the query matches', () => {
    // The hook reads matchMedia in the useState initialiser specifically so the
    // first paint is correct. If that moved into the effect, this value would
    // be false on the initial render and flip afterwards — a visible flash of
    // animation for someone who asked for none.
    const media = createMatchMedia({ reduced: true });
    restore = media.install();

    const { result } = renderHook(() => usePrefersReducedMotion());

    expect(result.current).toBe(true);
  });

  it('is false on the first render when the query does not match', () => {
    const media = createMatchMedia({ reduced: false });
    restore = media.install();

    const { result } = renderHook(() => usePrefersReducedMotion());

    expect(result.current).toBe(false);
    // Pins the literal query string the hook asks matchMedia for. Without this,
    // the hook could query any string (or a typo'd one) and still pass every
    // other assertion in this file, since createMatchMedia answers any query.
    expect(media.queries()).toContain('(prefers-reduced-motion: reduce)');
  });

  it('follows the setting changing while the page is open', () => {
    const media = createMatchMedia({ reduced: false });
    restore = media.install();

    const { result } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(false);

    act(() => {
      media.setMatches(true);
    });

    expect(result.current).toBe(true);
  });

  it('unsubscribes on unmount', () => {
    const media = createMatchMedia();
    restore = media.install();

    const { unmount } = renderHook(() => usePrefersReducedMotion());
    expect(media.removeListenerCount()).toBe(0);

    unmount();

    expect(media.removeListenerCount()).toBe(1);
  });
});

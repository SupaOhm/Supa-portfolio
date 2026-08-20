import { describe, it, expect, afterEach, vi } from 'vitest';
import { currentScrollBehavior } from './scrollBehavior';
import { createMatchMedia } from '../test/doubles';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('currentScrollBehavior', () => {
  it('returns smooth when there is no window at all', () => {
    // Runs in the node environment, so `window` is genuinely undefined rather
    // than stubbed away. This is the server-render branch.
    expect(typeof window).toBe('undefined');
    expect(currentScrollBehavior()).toBe('smooth');
  });

  it('returns auto when the user asks for reduced motion', () => {
    const media = createMatchMedia({ reduced: true });
    vi.stubGlobal('window', { matchMedia: media.matchMedia });

    expect(currentScrollBehavior()).toBe('auto');
  });

  it('returns smooth when the user has not asked for reduced motion', () => {
    const media = createMatchMedia({ reduced: false });
    vi.stubGlobal('window', { matchMedia: media.matchMedia });

    expect(currentScrollBehavior()).toBe('smooth');
  });

  it('asks for the exact reduced-motion media query', () => {
    // A typo here would never match anything, so the site would silently
    // animate for everyone who asked it not to, with every other test still
    // green. There is no other detector for that failure.
    const media = createMatchMedia();
    vi.stubGlobal('window', { matchMedia: media.matchMedia });

    currentScrollBehavior();

    expect(media.queries()).toEqual(['(prefers-reduced-motion: reduce)']);
  });
});

import { describe, it, expect } from 'vitest';
import { revealStyle, REVEAL_DURATION_MS } from './revealStyle';

describe('revealStyle', () => {
  it('is visible with a fadeIn animation when revealed and motion is allowed', () => {
    const style = revealStyle(true, 300, false);
    expect(style.opacity).toBe(1);
    expect(style.animation).toContain('fadeIn');
    expect(style.animation).toContain('300ms');
    expect(style.animation).toContain('both');
  });

  it('is hidden with no animation when not yet revealed', () => {
    const style = revealStyle(false, 300, false);
    expect(style.opacity).toBe(0);
    expect(style.animation).toBe('none');
  });

  it('is VISIBLE with no animation when revealed under reduced motion', () => {
    // This is the case that would reintroduce the blanking bug if it regressed.
    const style = revealStyle(true, 300, true);
    expect(style.opacity).toBe(1);
    expect(style.animation).toBe('none');
  });

  it('is hidden with no animation when not revealed under reduced motion', () => {
    const style = revealStyle(false, 300, true);
    expect(style.opacity).toBe(0);
    expect(style.animation).toBe('none');
  });

  it('NEVER returns a transition property', () => {
    // Five of the six call sites carry transition-transform / transition-all in
    // their className. An inline transition longhand would clobber the class and
    // retime their hover, so this is asserted rather than assumed.
    for (const isVisible of [true, false]) {
      for (const reduced of [true, false]) {
        const keys = Object.keys(revealStyle(isVisible, 100, reduced));
        expect(keys.filter((k) => k.startsWith('transition'))).toEqual([]);
      }
    }
  });

  it('uses the default duration when none is supplied', () => {
    expect(revealStyle(true, 0, false).animation).toContain(`${REVEAL_DURATION_MS}ms`);
  });

  it('honours a custom duration', () => {
    const style = revealStyle(true, 0, false, 450);
    expect(style.animation).toContain('450ms');
    expect(style.animation).not.toContain('500ms');
  });

  it('carries the delay only when motion is allowed', () => {
    expect(revealStyle(true, 750, false).animation).toContain('750ms');
    expect(revealStyle(true, 750, true).animation).toBe('none');
  });
});

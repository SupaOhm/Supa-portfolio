// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { renderHook, cleanup } from '@testing-library/react';
import { act } from 'react';
import { useActiveSection, scrollToSection } from './useActiveSection';
import { stubRect, createMatchMedia } from '../test/doubles';

const IDS = ['home', 'about', 'projects'] as const;

let restoreMatchMedia: (() => void) | undefined;

afterEach(() => {
  cleanup();
  document.body.innerHTML = '';
  vi.restoreAllMocks();
  vi.useRealTimers();
  restoreMatchMedia?.();
  restoreMatchMedia = undefined;
});

/** Creates the three sections and gives each a fake layout box. */
function mountSections(boxes: Record<string, { top: number; bottom: number }>) {
  for (const id of IDS) {
    const section = document.createElement('section');
    section.id = id;
    document.body.appendChild(section);
    stubRect(section, boxes[id] ?? { top: 2000, bottom: 2100 });
  }
}

describe('useActiveSection', () => {
  it('starts on the first id before anything is measured', () => {
    // No sections in the document at all, so the mount pass finds nothing.
    const { result } = renderHook(() => useActiveSection(IDS));

    expect(result.current).toBe('home');
  });

  it('activates whichever section fills most of the viewport', () => {
    mountSections({
      home: { top: -700, bottom: 68 }, // 68px visible
      about: { top: 68, bottom: 768 }, // 700px visible — wins
    });

    const { result } = renderHook(() => useActiveSection(IDS));

    expect(result.current).toBe('about');
  });

  it('holds the last active section when nothing clears the threshold', () => {
    // Sub-threshold must not reset to the first id. Scrolling into a gap
    // between sections would otherwise snap the navbar highlight back to Home.
    mountSections({
      home: { top: -700, bottom: 68 },
      about: { top: 68, bottom: 768 },
    });

    const { result } = renderHook(() => useActiveSection(IDS));
    expect(result.current).toBe('about');

    // Move every section far off-screen: occupancy 0 for all of them.
    for (const id of IDS) {
      stubRect(document.getElementById(id)!, { top: 5000, bottom: 5100 });
    }
    act(() => {
      window.dispatchEvent(new Event('scroll'));
    });

    expect(result.current).toBe('about');
  });

  it('recomputes on scroll', () => {
    mountSections({
      home: { top: 0, bottom: 768 },
      about: { top: 768, bottom: 1536 },
    });

    const { result } = renderHook(() => useActiveSection(IDS));
    expect(result.current).toBe('home');

    stubRect(document.getElementById('home')!, { top: -768, bottom: 0 });
    stubRect(document.getElementById('about')!, { top: 0, bottom: 768 });
    act(() => {
      window.dispatchEvent(new Event('scroll'));
    });

    expect(result.current).toBe('about');
  });

  it('recomputes when the about section finishes a transition', () => {
    // About expands and collapses; its height change moves every section below
    // it without any scroll event firing.
    mountSections({
      home: { top: 0, bottom: 768 },
      about: { top: 768, bottom: 1536 },
    });

    const { result } = renderHook(() => useActiveSection(IDS));
    expect(result.current).toBe('home');

    stubRect(document.getElementById('home')!, { top: -768, bottom: 0 });
    stubRect(document.getElementById('about')!, { top: 0, bottom: 768 });
    act(() => {
      document.getElementById('about')!.dispatchEvent(new Event('transitionend'));
    });

    expect(result.current).toBe('about');
  });

  it('stays below threshold just under the cutoff and activates just over it', () => {
    // DEFAULT_VISIBILITY_THRESHOLD is 0.1 and jsdom's window.innerHeight is 768,
    // so the occupancy cutoff is 76.8px of visible height (visibleHeight / 768).
    // 60px (60/768 ≈ 0.078) sits clearly below that; 120px (120/768 ≈ 0.156)
    // sits clearly above it — both comfortably clear of rounding at the boundary.
    mountSections({
      home: { top: 5000, bottom: 5100 }, // fully off-screen: 0 occupancy
      about: { top: 0, bottom: 60 }, // 60px visible — below threshold
      projects: { top: 5000, bottom: 5100 },
    });

    const { result } = renderHook(() => useActiveSection(IDS));
    // Below threshold: nothing clears 0.1, so the initial id is retained.
    expect(result.current).toBe('home');

    stubRect(document.getElementById('about')!, { top: 0, bottom: 120 }); // 120px — above threshold
    act(() => {
      window.dispatchEvent(new Event('scroll'));
    });

    expect(result.current).toBe('about');
  });

  it('does nothing at all when disabled', () => {
    mountSections({ about: { top: 0, bottom: 768 } });
    const addSpy = vi.spyOn(window, 'addEventListener');

    const { result } = renderHook(() => useActiveSection(IDS, { enabled: false }));

    expect(result.current).toBe('home');
    expect(addSpy.mock.calls.filter(([type]) => type === 'scroll')).toHaveLength(0);
  });

  it('removes both listeners on unmount', () => {
    mountSections({ about: { top: 0, bottom: 768 } });
    const removeWindowSpy = vi.spyOn(window, 'removeEventListener');
    const about = document.getElementById('about')!;
    const removeAboutSpy = vi.spyOn(about, 'removeEventListener');

    const { unmount } = renderHook(() => useActiveSection(IDS));
    unmount();

    expect(removeWindowSpy.mock.calls.some(([type]) => type === 'scroll')).toBe(true);
    expect(removeAboutSpy.mock.calls.some(([type]) => type === 'transitionend')).toBe(true);
  });
});

describe('scrollToSection', () => {
  it('does nothing when the id is not on the page', () => {
    vi.useFakeTimers();
    const scrollSpy = vi.spyOn(Element.prototype, 'scrollIntoView');

    scrollToSection('does-not-exist');
    vi.runAllTimers();

    expect(scrollSpy).not.toHaveBeenCalled();
  });

  it('scrolls to the element, honouring reduced motion, after the timer', () => {
    // The setTimeout(…, 0) is load-bearing: it lets layout settle before the
    // scroll. Asserting before the timer runs proves the call really is
    // deferred rather than synchronous.
    vi.useFakeTimers();
    const target = document.createElement('section');
    target.id = 'projects';
    document.body.appendChild(target);
    const scrollSpy = vi.spyOn(Element.prototype, 'scrollIntoView');

    scrollToSection('projects');
    expect(scrollSpy).not.toHaveBeenCalled();

    vi.runAllTimers();

    expect(scrollSpy).toHaveBeenCalledTimes(1);
    expect(scrollSpy.mock.contexts).toContain(target);
    // setup.ts's matchMedia stub reports matches:false, so currentScrollBehavior()
    // returns 'smooth' here too — this assertion alone would still pass with a
    // hardcoded 'smooth' at the call site. It only proves the *default* value is
    // reached, not that the behaviour argument is actually wired through to
    // currentScrollBehavior(); the reduced-motion test below proves the wiring.
    expect(scrollSpy).toHaveBeenCalledWith({ behavior: 'smooth' });
  });

  it('scrolls with behavior "auto" when reduced motion is preferred', () => {
    vi.useFakeTimers();
    const media = createMatchMedia({ reduced: true });
    restoreMatchMedia = media.install();

    const target = document.createElement('section');
    target.id = 'projects';
    document.body.appendChild(target);
    const scrollSpy = vi.spyOn(Element.prototype, 'scrollIntoView');

    scrollToSection('projects');
    vi.runAllTimers();

    expect(scrollSpy).toHaveBeenCalledWith({ behavior: 'auto' });
  });
});

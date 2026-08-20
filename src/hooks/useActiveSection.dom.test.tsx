// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { renderHook, cleanup } from '@testing-library/react';
import { act } from 'react';
import { useActiveSection, scrollToSection } from './useActiveSection';
import { stubRect } from '../test/doubles';

const IDS = ['home', 'about', 'projects'] as const;

afterEach(() => {
  cleanup();
  document.body.innerHTML = '';
  vi.restoreAllMocks();
  vi.useRealTimers();
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
    // setup.ts's matchMedia stub reports matches:false, so the behaviour
    // currentScrollBehavior() returns here is 'smooth'.
    expect(scrollSpy).toHaveBeenCalledWith({ behavior: 'smooth' });
  });
});

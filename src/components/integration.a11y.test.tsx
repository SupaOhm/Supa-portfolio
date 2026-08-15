// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Home from '../pages/Home';
import Skills from './Skills';
import Projects from './Projects';

// @testing-library/react only auto-registers cleanup when a global `afterEach`
// exists, which requires vitest's `test.globals: true`. This project does not
// set it, so every render would otherwise accumulate in the shared document.
afterEach(cleanup);

/**
 * Cross-file guards. Every other test in this slice renders ONE component in
 * isolation, which is precisely the blind spot that let defects through on two
 * earlier slices: `Home` stacks all five sections together and renders
 * `ProjectCard` a dozen times over, so id collisions and broken references only
 * become reachable once everything is on the page at once.
 */
describe('assembled page', () => {
  beforeEach(() => {
    // About and Connect fetch the GitHub profile on mount. A never-settling
    // promise holds them on their static fallback copy with no state update
    // after the test body, which would otherwise warn about updates outside act().
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise(() => {})),
    );
  });

  const renderPage = () =>
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );

  it('has no duplicate ids anywhere on the assembled page', () => {
    const { container } = renderPage();
    const ids = Array.from(container.querySelectorAll('[id]')).map((el) => el.id);
    const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);

    // Asserted as an object so a failure names the offending ids rather than
    // just reporting a length mismatch.
    expect({ duplicates }).toEqual({ duplicates: [] });
  });

  it('resolves every aria-labelledby to an element that exists', () => {
    const { container } = renderPage();
    const referrers = Array.from(container.querySelectorAll('[aria-labelledby]'));
    expect(referrers.length).toBeGreaterThan(0);

    const unresolved = referrers
      .map((el) => el.getAttribute('aria-labelledby') as string)
      .filter((id) => container.querySelector(`#${id}`) === null);

    expect(unresolved).toEqual([]);
  });

  it('exposes exactly five named regions once every section is stacked', () => {
    renderPage();

    // The nav is deliberately not asserted here: `Navbar` is rendered by
    // `App`, not by `Home`, so it is absent from this tree. Its accessible
    // name is covered in landmarks.test.tsx, which renders it directly.
    expect(screen.getAllByRole('region')).toHaveLength(5);
  });
});

/**
 * The carousel live region empties in grid view instead of unmounting, so that
 * returning to carousel view is announced. Without this round trip the design's
 * central claim rests on a comment: a conditionally rendered region would still
 * pass every other live-region test in this suite.
 */
describe('carousel live region round trip', () => {
  it('repopulates when returning from grid view', async () => {
    const user = userEvent.setup();
    render(<Projects />);
    const toggle = screen.getByRole('button', { name: 'Carousel view' });

    await user.click(toggle);
    expect(screen.getByTestId('carousel-status')).toBeEmptyDOMElement();

    await user.click(toggle);
    expect(screen.getByTestId('carousel-status').textContent).toMatch(/^Project 1 of /);
  });
});

/**
 * Guards against this slice regressing the two slices before it. The dots were
 * restructured into a padded button wrapping a visual span, and the skill chips
 * became list items — both changes sit directly on top of earlier work.
 */
describe('earlier slices still hold', () => {
  it('keeps every carousel dot reachable and activatable by keyboard', async () => {
    const user = userEvent.setup();
    render(<Projects />);
    const dots = screen.getAllByRole('button', { name: /^Go to project \d+$/ });

    dots[2].focus();
    expect(dots[2]).toHaveFocus();

    await user.keyboard('{Enter}');
    expect(screen.getByTestId('carousel-status').textContent).toMatch(/^Project 3 of /);
  });

  it('still marks exactly one carousel card non-inert', () => {
    render(<Projects />);
    const cards = screen.getAllByTestId('carousel-card');
    expect(cards.filter((card) => !card.hasAttribute('inert'))).toHaveLength(1);
  });

  it('still honours reduced motion for the skill chips as list items', () => {
    // Both overrides are required for this test to discriminate anything.
    //
    // The shared IntersectionObserver stub in src/test/setup.ts never invokes
    // its callback, so `isVisible` stays false for every jsdom render of Skills
    // — and revealStyle returns `animation: 'none'` whenever isVisible is false,
    // REGARDLESS of the reduced flag. Asserting 'none' against the shared stub
    // therefore passes even if reduced-motion support is deleted outright.
    // Firing the callback on observe() is what makes the flag observable.
    const originalObserver = globalThis.IntersectionObserver;
    const originalMatchMedia = window.matchMedia;

    class FiringObserver {
      // An explicit field, not a constructor parameter property: this project
      // enables `erasableSyntaxOnly`, under which parameter properties are a
      // compile error (TS1294) even though the tests themselves still run.
      private readonly callback: IntersectionObserverCallback;

      constructor(callback: IntersectionObserverCallback) {
        this.callback = callback;
      }

      observe(): void {
        this.callback(
          [{ isIntersecting: true } as IntersectionObserverEntry],
          this as unknown as IntersectionObserver,
        );
      }
      unobserve(): void {}
      disconnect(): void {}
      takeRecords(): IntersectionObserverEntry[] {
        return [];
      }
    }

    const setReducedMotion = (matches: boolean) => {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: (query: string) => ({
          matches,
          media: query,
          onchange: null,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        }),
      });
    };

    Object.defineProperty(globalThis, 'IntersectionObserver', {
      writable: true,
      value: FiringObserver,
    });

    try {
      setReducedMotion(true);
      render(<Skills />);
      const reducedChip = screen.getByText('TypeScript');

      // The chip became an <li>; revealStyle's output must have travelled with it.
      expect(reducedChip.tagName).toBe('LI');
      expect(reducedChip.style.opacity).toBe('1');
      expect(reducedChip.style.animation).toBe('none');

      cleanup();

      setReducedMotion(false);
      render(<Skills />);
      const movingChip = screen.getByText('TypeScript');

      // Same element, motion allowed: the reveal animation must actually run,
      // which is what proves the assertion above was reading the reduced flag
      // rather than the not-yet-visible default.
      expect(movingChip.tagName).toBe('LI');
      expect(movingChip.style.animation).toContain('fadeIn');
    } finally {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: originalMatchMedia,
      });
      Object.defineProperty(globalThis, 'IntersectionObserver', {
        writable: true,
        value: originalObserver,
      });
    }
  });
});

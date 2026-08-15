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

  it('still applies reveal styling to the skill chips as list items', () => {
    const originalMatchMedia = window.matchMedia;
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: (query: string) => ({
        matches: true,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }),
    });

    try {
      render(<Skills />);
      const chip = screen.getByText('TypeScript');

      // The chip became an <li>; revealStyle's output must have travelled with
      // it, and under reduced motion must carry no running animation.
      expect(chip.tagName).toBe('LI');
      expect(chip.getAttribute('style')).toBeTruthy();
      expect(chip.style.animation === '' || chip.style.animation === 'none').toBe(true);
    } finally {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: originalMatchMedia,
      });
    }
  });
});

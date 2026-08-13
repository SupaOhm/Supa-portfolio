// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import Projects from './Projects';

// @testing-library/react only auto-registers its cleanup when a global `afterEach`
// exists, which requires vitest's `test.globals: true`. This project does not set it,
// so without an explicit cleanup every render accumulates in the document and later
// queries in this file match multiple elements. Discovered in Task 2.
afterEach(cleanup);

/**
 * Asserts ATTRIBUTE OUTPUT only. jsdom does not implement inert semantics, so a
 * "not focusable" assertion would test jsdom rather than the browser. Real
 * focusability is covered by the manual keyboard pass in the plan's final task.
 */
describe('Projects carousel', () => {
  it('marks every non-centre card inert and leaves the centre card interactive', () => {
    render(<Projects />);
    const cards = screen.getAllByTestId('carousel-card');

    // The carousel renders slots -2..2, so more than one card is mounted.
    expect(cards.length).toBeGreaterThan(1);

    const interactive = cards.filter((card) => !card.hasAttribute('inert'));
    expect(interactive).toHaveLength(1);
  });

  it('gives no card a click handler that a keyboard user cannot reach', () => {
    render(<Projects />);
    for (const card of screen.getAllByTestId('carousel-card')) {
      expect(card).not.toHaveAttribute('role', 'button');
      expect(card).not.toHaveAttribute('tabindex');
    }
  });
});

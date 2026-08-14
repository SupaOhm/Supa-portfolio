// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Projects from './Projects';
import { PROJECTS } from '../data/projects';
import { PROJECT_CATEGORIES } from '../types/project';

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

describe('active filter pills', () => {
  it('renders each active filter as a button with a descriptive label', async () => {
    const user = userEvent.setup();
    render(<Projects />);

    // Open the filter dropdown and tick the first category.
    await user.click(screen.getByRole('button', { name: /^filter/i }));
    const firstCategory = screen.getAllByRole('checkbox')[0];
    await user.click(firstCategory);

    // The corresponding removal pill must be a button, not a span.
    const removal = screen.getByRole('button', { name: /^remove .+ filter$/i });
    expect(removal.tagName).toBe('BUTTON');
    expect(removal).toHaveAttribute('type', 'button');
  });

  it('clears the filter when its removal button is activated', async () => {
    const user = userEvent.setup();
    render(<Projects />);

    await user.click(screen.getByRole('button', { name: /^filter/i }));
    await user.click(screen.getAllByRole('checkbox')[0]);

    const removal = screen.getByRole('button', { name: /^remove .+ filter$/i });
    await user.click(removal);

    expect(screen.queryByRole('button', { name: /^remove .+ filter$/i })).toBeNull();
  });
});

describe('filter dropdown keyboard handling', () => {
  it('closes on Escape and returns focus to the trigger', async () => {
    const user = userEvent.setup();
    render(<Projects />);

    const trigger = screen.getByRole('button', { name: /^filter/i });
    await user.click(trigger);
    expect(screen.getAllByRole('checkbox').length).toBeGreaterThan(0);

    await user.keyboard('{Escape}');

    expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
    expect(trigger).toHaveFocus();
  });

  it('does not steal focus when Escape is pressed with the dropdown closed', async () => {
    const user = userEvent.setup();
    render(<Projects />);

    const viewToggle = screen.getByRole('button', { name: 'Carousel view' });
    viewToggle.focus();
    expect(viewToggle).toHaveFocus();

    await user.keyboard('{Escape}');

    // Focus must stay where it was — the handler must be a no-op when closed.
    expect(viewToggle).toHaveFocus();
  });
});

describe('decorative brackets', () => {
  it('keeps the bracket glyphs out of the projects heading accessible name', () => {
    render(<Projects />);

    // getByRole's string `name` matcher is an exact, whitespace-normalised match.
    // Without aria-hidden on the two decorative spans the computed name is
    // "[ Featured Projects ]" and this query finds nothing.
    expect(screen.getByRole('heading', { name: 'Featured Projects' })).toBeInTheDocument();
  });
});

describe('carousel navigation dots', () => {
  it('exposes one uniquely named button per project and renders a visual child inside each', () => {
    render(<Projects />);

    const dots = screen.getAllByRole('button', { name: /^Go to project \d+$/ });
    expect(dots).toHaveLength(PROJECTS.length);

    // The hit area and the visual dot are separate elements: the button owns the
    // padding, an inner element owns the size and colour. Without the child the
    // dot is invisible even though the button is still 24x24.
    for (const dot of dots) {
      expect(dot.children).toHaveLength(1);
    }
  });
});

describe('view toggle', () => {
  it('reports its pressed state and keeps a constant accessible name', async () => {
    const user = userEvent.setup();
    render(<Projects />);

    // The carousel is the default view, so the toggle starts pressed.
    const toggle = screen.getByRole('button', { name: 'Carousel view' });
    expect(toggle).toHaveAttribute('aria-pressed', 'true');

    await user.click(toggle);

    // Same element, same name — only the state changed. A name that changed with
    // the state would make the control unfindable by its stable label.
    expect(screen.getByRole('button', { name: 'Carousel view' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });
});

describe('live regions', () => {
  it('reports the filtered project count and updates it when a filter changes', async () => {
    const user = userEvent.setup();
    render(<Projects />);

    const status = screen.getByTestId('filter-status');
    expect(status).toHaveAttribute('role', 'status');
    // textContent equality, not toHaveTextContent: that matcher is a substring
    // match, so "5 projects shown" would also pass against "15 projects shown".
    expect(status.textContent).toBe(`${PROJECTS.length} projects shown`);

    await user.click(screen.getByRole('button', { name: /^filter/i }));
    await user.click(screen.getAllByRole('checkbox')[0]);

    // The dropdown lists categories before statuses, so checkbox 0 is the first
    // category. Compute the expectation from the data rather than restating the
    // component's filter logic.
    const firstCategory = PROJECT_CATEGORIES[0];
    const expected = PROJECTS.filter((p) => p.categories.includes(firstCategory)).length;
    expect(expected).toBeGreaterThan(0);
    expect(expected).toBeLessThan(PROJECTS.length);

    expect(screen.getByTestId('filter-status').textContent).toBe(`${expected} projects shown`);
  });

  it('reports the centred carousel card and updates it on navigation', async () => {
    const user = userEvent.setup();
    render(<Projects />);

    const status = screen.getByTestId('carousel-status');
    expect(status).toHaveAttribute('role', 'status');
    expect(status.textContent).toBe(`Project 1 of ${PROJECTS.length}: ${PROJECTS[0].title}`);

    await user.click(screen.getByRole('button', { name: 'Next project' }));

    expect(screen.getByTestId('carousel-status').textContent).toBe(
      `Project 2 of ${PROJECTS.length}: ${PROJECTS[1].title}`,
    );
  });

  it('empties the carousel region in grid view but keeps it mounted', async () => {
    const user = userEvent.setup();
    render(<Projects />);

    await user.click(screen.getByRole('button', { name: 'Carousel view' }));

    // Still in the document — an unmounted region would not announce when the
    // user switches back, because the text would appear at insertion time.
    const status = screen.getByTestId('carousel-status');
    expect(status).toBeInTheDocument();
    // toBeEmptyDOMElement, not toHaveTextContent(''): jest-dom rejects the empty
    // string outright because it would match anything.
    expect(status).toBeEmptyDOMElement();
  });
});

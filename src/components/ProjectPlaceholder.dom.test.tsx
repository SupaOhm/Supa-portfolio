// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import ProjectPlaceholder from './ProjectPlaceholder';
import { PROJECTS } from '../data/projects';
import { CATEGORY_PALETTES, FALLBACK_PALETTE } from '../lib/projectPlaceholder';
import type { Project } from '../types/project';

afterEach(cleanup);

/**
 * src/lib/projectPlaceholder.test.ts already covers paletteFor and wordmark as
 * functions. This file covers only what a unit test of those cannot see: that
 * the component actually wires their output into the DOM, and that the
 * accessibility contract in its docblock holds.
 */

const baseProject: Project = {
  id: 'opsbot',
  title: 'OpsBot - Multi-Agent RAG Assistant',
  description: 'A retrieval-augmented assistant.',
  tags: ['FastAPI', 'RAG'],
  categories: ['AI', 'Backend'],
};

const renderPlaceholder = (overrides: Partial<Project> = {}) =>
  render(<ProjectPlaceholder project={{ ...baseProject, ...overrides }} />);

/**
 * jsdom parses the inline `background` shorthand and re-serialises every colour
 * inside the gradient from #rrggbb to rgb(r, g, b), so a substring search for
 * the palette's own hex never matches. Convert before comparing.
 */
const asRgb = (hex: string): string => {
  const [, r, g, b] = /^#(\w{2})(\w{2})(\w{2})$/.exec(hex)!;
  return `rgb(${parseInt(r, 16)}, ${parseInt(g, 16)}, ${parseInt(b, 16)})`;
};

describe('ProjectPlaceholder accessibility', () => {
  it('hides itself from the accessibility tree', () => {
    // Load-bearing, not cosmetic: the wordmark and category repeat text the
    // card already exposes in its <h3> and tag list, so dropping aria-hidden
    // makes a screen reader announce the project name twice.
    const { container } = renderPlaceholder();

    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
  });

  it('contains nothing focusable', () => {
    // aria-hidden on an ancestor of a focusable element is an authoring error
    // -- the element stays tabbable but is unreachable to a screen reader. The
    // placeholder is decorative, so it must stay free of links and buttons; if
    // one is ever needed here, aria-hidden has to come off at the same time.
    const { container } = renderPlaceholder();

    expect(
      container.querySelectorAll('a, button, input, select, textarea, [tabindex]'),
    ).toHaveLength(0);
  });
});

describe('ProjectPlaceholder content', () => {
  it('renders the wordmark, not the full title', () => {
    renderPlaceholder();

    expect(screen.getByText('OpsBot')).toBeInTheDocument();
    expect(screen.queryByText(baseProject.title)).not.toBeInTheDocument();
  });

  it('labels the card with its primary category', () => {
    renderPlaceholder({ categories: ['AI', 'Backend'] });

    expect(screen.getByText('AI')).toBeInTheDocument();
    expect(screen.queryByText('Backend')).not.toBeInTheDocument();
  });

  it('omits the eyebrow element entirely when a project has no categories', () => {
    // Counting siblings rather than querying for absent text: without the
    // `category &&` guard the component still renders the <span>, just empty,
    // and its 10px line-height plus the wordmark's mt-2.5 keep occupying space
    // above the wordmark -- pushing it off the vertical centre. Text-absence
    // assertions cannot see that; an empty span has no text either way.
    renderPlaceholder({ categories: [] });

    const withoutCategory = screen.getByText('OpsBot').parentElement!;
    expect(withoutCategory.children).toHaveLength(2);

    cleanup();
    renderPlaceholder({ categories: ['AI'] });

    const withCategory = screen.getByText('OpsBot').parentElement!;
    expect(withCategory.children).toHaveLength(3);
  });
});

describe('ProjectPlaceholder palette wiring', () => {
  it('paints the gradient from the primary category palette', () => {
    const { container } = renderPlaceholder({ categories: ['Security'] });
    const style = container.firstElementChild?.getAttribute('style') ?? '';

    // Asserting the raw attribute rather than toHaveStyle: jest-dom compares
    // `background` as one opaque shorthand string, so it can confirm the whole
    // declaration matches but not that these two stops specifically came from
    // the Security palette.
    expect(style).toContain(asRgb(CATEGORY_PALETTES.Security.from));
    expect(style).toContain(asRgb(CATEGORY_PALETTES.Security.via));
  });

  it('accents the eyebrow with the same palette', () => {
    renderPlaceholder({ categories: ['Security'] });

    expect(screen.getByText('Security')).toHaveStyle({
      color: CATEGORY_PALETTES.Security.accent,
    });
  });

  it('falls back to the neutral palette with no categories', () => {
    const { container } = renderPlaceholder({ categories: [] });
    const style = container.firstElementChild?.getAttribute('style') ?? '';

    expect(style).toContain(asRgb(FALLBACK_PALETTE.from));
    expect(style).toContain(asRgb(FALLBACK_PALETTE.via));
  });
});

describe('ProjectPlaceholder against real data', () => {
  const imageless = PROJECTS.filter((project) => !project.imageUrl);

  it('has projects to stand in for', () => {
    // Guards the guard: if every project gains an image this suite would
    // silently iterate an empty array and assert nothing.
    expect(imageless.length).toBeGreaterThan(0);
  });

  it.each(imageless.map((project) => project.id))(
    'renders a non-empty wordmark for %s',
    (id) => {
      const project = imageless.find((candidate) => candidate.id === id)!;
      const { container } = renderPlaceholder(project);

      expect(container.textContent?.trim()).not.toBe('');
      expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
    },
  );
});

// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import About from './About';

afterEach(cleanup);

beforeEach(() => {
  // Never-settling fetch keeps the GitHub card on its static fallback copy.
  vi.stubGlobal(
    'fetch',
    vi.fn(() => new Promise(() => {})),
  );
});

describe('About heading outline', () => {
  it('does not expose the GitHub display name as a heading', () => {
    render(<About />);

    // The fallback copy while the profile is loading. It is card data, not a
    // section label, so it must not appear in the heading outline at all.
    expect(screen.getByText('GitHub Profile')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'GitHub Profile' })).toBeNull();
  });

  it('separates the GitHub heading from the profile link in its accessible name', () => {
    render(<About />);

    // The visual gap is `ml-3`, a margin — margins contribute no character to
    // accessible name computation, so without an explicit separator the name
    // concatenates to "GitHub Activity@SupaOhm" and is announced run-together.
    const heading = screen.getByRole('heading', { level: 3, name: /GitHub Activity/ });
    const name = heading.textContent ?? '';
    expect(name).not.toMatch(/Activity@/);
    expect(name).toMatch(/GitHub Activity\s+@/);
  });

  it('hides the decorative arrow from the accessible name', () => {
    render(<About />);

    // The arrow is ornamental; left exposed a screen reader announces its
    // Unicode name at the end of both the heading and the link.
    const link = screen.getByRole('link', { name: /@/ });
    expect(link).toHaveAccessibleName('@SupaOhm');
    expect(link.textContent).toContain('\u2197');
  });

  it('nests the info card titles one level below the Details heading', () => {
    render(<About />);

    const details = screen.getByRole('heading', { name: 'Details', level: 3 });
    expect(details).toBeInTheDocument();

    // Every InfoCard sits inside the Details panel, so its title is a subsection
    // of Details — not a sibling of it at the same level.
    expect(screen.getByRole('heading', { name: /Personal Information/, level: 4 })).toBeInTheDocument();
  });
});

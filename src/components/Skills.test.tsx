// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import Skills from './Skills';

afterEach(cleanup);

describe('skill chips', () => {
  it('exposes each category of chips as a list', () => {
    render(<Skills />);

    // One list per skill category. SKILL_CATEGORIES is module-private, so the
    // count is stated here rather than imported.
    const lists = screen.getAllByRole('list');
    expect(lists).toHaveLength(4);

    expect(screen.getAllByRole('listitem').length).toBeGreaterThan(0);

    // Every chip must have become an <li>; a <span> left behind in the
    // conversion would still render but expose no listitem role.
    for (const list of lists) {
      for (const child of Array.from(list.children)) {
        expect(child.tagName).toBe('LI');
      }
    }

    // `listitem` is not a name-from-content role, so it cannot be queried by
    // accessible name. Reach a known chip by its text instead.
    expect(screen.getByText('TypeScript').tagName).toBe('LI');
  });
});

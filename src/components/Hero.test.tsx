// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Hero from './Hero';
import { ACADEMIC_YEAR, GPA, INSTITUTION, LOCATION, PROGRAM } from '../data/profile';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const renderHero = () =>
  render(
    <MemoryRouter initialEntries={['/']}>
      <Hero />
    </MemoryRouter>,
  );

describe('Hero', () => {
  it('states the academic facts from src/data/profile.ts', () => {
    // The landing screen showed a stale "3rd Year [GPA: 3.23]" for a full
    // session after About was corrected, because the value was hardcoded in
    // two places. scripts/profile-drift.test.ts stops the literal coming back;
    // this proves the constants actually reach the page.
    renderHero();

    expect(screen.getByText(new RegExp(`${PROGRAM}, ${INSTITUTION}`))).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`${ACADEMIC_YEAR} \\[GPA: ${GPA}\\]`))).toBeInTheDocument();
    expect(screen.getByText(new RegExp(LOCATION))).toBeInTheDocument();
  });

  it('exposes exactly one top-level heading', () => {
    renderHero();

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('scrolls to the projects section when the primary call to action is used', async () => {
    // The CTAs are buttons with onClick handlers, not links — there is no href
    // to assert, so this asserts what the button is for.
    const target = document.createElement('section');
    target.id = 'projects';
    document.body.appendChild(target);

    renderHero();
    const scrollIntoView = target.scrollIntoView as unknown as ReturnType<typeof vi.fn>;

    await userEvent.click(screen.getByRole('button', { name: /view projects/i }));

    expect(scrollIntoView).toHaveBeenCalled();
    expect(scrollIntoView.mock.contexts).toContain(target);
    target.remove();
  });
});

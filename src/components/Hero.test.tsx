// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Hero from './Hero';
import {
  ACADEMIC_YEAR,
  AWARD,
  EXPECTED_GRADUATION,
  INSTITUTION,
  LOCATION,
  PAPER_TITLE,
  PROGRAM,
  VENUE,
} from '../data/profile';

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

/** Mounts a real target so scrollIntoView has something to be called on. */
const withSection = (id: string) => {
  const el = document.createElement('section');
  el.id = id;
  document.body.appendChild(el);
  return el;
};

describe('Hero', () => {
  it('states the academic facts from src/data/profile.ts', () => {
    // The landing screen showed a stale "3rd Year" for a full session after
    // About was corrected, because the value was hardcoded in two places.
    // scripts/profile-drift.test.ts stops the literal coming back; this proves
    // the constants actually reach the page. The GPA is deliberately no longer
    // on the landing screen — About states it, and About.test.tsx covers that.
    renderHero();

    expect(screen.getByText(PROGRAM)).toBeInTheDocument();
    expect(screen.getByText(ACADEMIC_YEAR)).toBeInTheDocument();
    expect(screen.getByText(INSTITUTION)).toBeInTheDocument();
    expect(screen.getByText(new RegExp(EXPECTED_GRADUATION))).toBeInTheDocument();
    expect(screen.getByText(LOCATION)).toBeInTheDocument();
  });

  it('states the award from the profile constants', () => {
    renderHero();

    expect(screen.getByRole('button', { name: new RegExp(PAPER_TITLE) })).toBeInTheDocument();
    // Exact string, not a regex: a regex also matches every ancestor whose
    // textContent contains it, and getByText throws on multiple matches. The
    // component gives this its own <span> so exactly one element's full text
    // equals it.
    expect(screen.getByText(`${AWARD}, ${VENUE}`)).toBeInTheDocument();
  });

  it('exposes exactly one top-level heading', () => {
    renderHero();

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('scrolls to the projects section from the footer link', async () => {
    const target = withSection('projects');
    renderHero();
    const scrollIntoView = target.scrollIntoView as unknown as ReturnType<typeof vi.fn>;

    await userEvent.click(screen.getByRole('button', { name: /see the work/i }));

    expect(scrollIntoView).toHaveBeenCalled();
    expect(scrollIntoView.mock.contexts).toContain(target);
    target.remove();
  });

  it('scrolls to the connect section from the availability link', async () => {
    const target = withSection('connect');
    renderHero();
    const scrollIntoView = target.scrollIntoView as unknown as ReturnType<typeof vi.fn>;

    await userEvent.click(screen.getByRole('button', { name: /get in touch/i }));

    expect(scrollIntoView).toHaveBeenCalled();
    expect(scrollIntoView.mock.contexts).toContain(target);
    target.remove();
  });

  it('no longer renders the typewriter or the fake code block', () => {
    // Guards the redesign against a revert-by-accident. Both were the loudest
    // generated-looking elements on the page.
    const { container } = renderHero();

    expect(container.querySelector('pre')).toBeNull();
    expect(container.querySelector('.cursor-glow')).toBeNull();
    expect(container.textContent).not.toMatch(/const developer/);
  });
});

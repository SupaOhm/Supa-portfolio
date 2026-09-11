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
  GPA,
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
    // Exact accessible name, not a regex: the Selected work index below the
    // band renders the SAME project under its full title, so /ESNIDSaaS/ now
    // matches two buttons and getByRole throws. The Recognition link's name is
    // exactly the paper title; the index row's is the full title plus its
    // number and categories.
    renderHero();

    expect(screen.getByRole('button', { name: PAPER_TITLE })).toBeInTheDocument();
    // Exact string, not a regex: a regex also matches every ancestor whose
    // textContent contains it, and getByText throws on multiple matches. The
    // component gives this its own <span> so exactly one element's full text
    // equals it.
    // The award and the venue sit on separate lines in the Recognition panel,
    // so they are asserted separately. Exact strings, not regexes: each is its
    // own element's entire text, which keeps the query unambiguous against the
    // panel and against any ancestor.
    expect(screen.getByText(AWARD)).toBeInTheDocument();
    expect(screen.getByText(VENUE)).toBeInTheDocument();
  });

  it('exposes one h1 and no other headings', () => {
    renderHero();

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    // The band labels are deliberately <p>, not <h2>. Nothing else in the repo
    // asserts heading levels — the landmark tests only check that regions
    // resolve by accessible name — so without this, converting the three
    // labels to headings would put three h2s inside the hero ahead of every
    // section heading on the assembled page, with a green suite.
    expect(screen.queryAllByRole('heading', { level: 2 })).toHaveLength(0);
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

  it('scrolls to the projects section from the paper link', async () => {
    const target = withSection('projects');
    renderHero();
    const scrollIntoView = target.scrollIntoView as unknown as ReturnType<typeof vi.fn>;

    await userEvent.click(screen.getByRole('button', { name: PAPER_TITLE }));

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
    // The GPA is deliberately off the landing screen — it has no room in the
    // band and About states it. Nothing else asserts this: profile-drift only
    // forbids a hardcoded literal, so re-adding {GPA} from the constant would
    // otherwise pass every test.
    expect(container.textContent).not.toContain(GPA);
  });
});

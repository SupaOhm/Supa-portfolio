import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  ACADEMIC_YEAR,
  AWARD,
  EMAIL,
  GITHUB_USERNAME,
  GPA,
  LINKEDIN_HANDLE,
  PAPER_TITLE,
  VENUE,
} from '../src/data/profile';

/**
 * Hero and About both state the academic year and GPA. They were hardcoded
 * separately and drifted: About was corrected to 4th Year / 3.24 while Hero
 * kept rendering 3rd Year / 3.23 on the landing screen for a full session.
 * Nothing caught it because nothing was looking.
 *
 * This scans the components for a literal year-or-GPA and fails, forcing the
 * value through src/data/profile.ts. It lives under scripts/ because
 * tsconfig.app.json sets types: ["vite/client"] with no Node types, so a
 * node:fs import anywhere under src/ passes vitest and fails typecheck.
 */
const COMPONENTS_DIR = join(process.cwd(), 'src', 'components');

const componentSources = readdirSync(COMPONENTS_DIR)
  .filter((name) => name.endsWith('.tsx') && !name.includes('.test.'))
  .map((name) => ({ name, contents: readFileSync(join(COMPONENTS_DIR, name), 'utf8') }));

describe('profile facts are not duplicated into components', () => {
  it('finds components to scan', () => {
    expect(componentSources.length).toBeGreaterThan(5);
  });

  it.each(componentSources.map((s) => s.name))(
    '%s hardcodes no GPA literal',
    (name) => {
      const { contents } = componentSources.find((s) => s.name === name)!;
      expect(contents).not.toMatch(/GPA[:\s|]*\d\.\d{1,2}/);
    },
  );

  it.each(componentSources.map((s) => s.name))(
    '%s hardcodes no academic-year literal',
    (name) => {
      const { contents } = componentSources.find((s) => s.name === name)!;
      expect(contents).not.toMatch(/\b\d(?:st|nd|rd|th) Year\b/);
    },
  );

  it('states a plausible year and GPA', () => {
    expect(ACADEMIC_YEAR).toMatch(/^\d(?:st|nd|rd|th) Year$/);
    expect(Number(GPA)).toBeGreaterThan(0);
    expect(Number(GPA)).toBeLessThanOrEqual(4);
  });
});

/**
 * The same drift shape, one fact further out. The GitHub username was declared
 * separately in About and Connect, the email was typed into About, Connect and
 * Footer, and the profile URL was hardcoded a fourth time in Navbar — five
 * copies with nothing forcing them to agree. Changing a handle meant finding
 * every one of them by memory.
 *
 * These scan for the literal value rather than a shape, so they stay correct
 * when the value changes: update src/data/profile.ts and the guard follows.
 */
describe('contact identity is not duplicated into components', () => {
  it.each(componentSources.map((s) => s.name))(
    '%s hardcodes no email address',
    (name) => {
      const { contents } = componentSources.find((s) => s.name === name)!;
      expect(contents).not.toContain(EMAIL);
    },
  );

  it.each(componentSources.map((s) => s.name))(
    '%s hardcodes no GitHub username',
    (name) => {
      const { contents } = componentSources.find((s) => s.name === name)!;
      expect(contents).not.toContain(GITHUB_USERNAME);
    },
  );

  it.each(componentSources.map((s) => s.name))(
    '%s hardcodes no LinkedIn handle',
    (name) => {
      const { contents } = componentSources.find((s) => s.name === name)!;
      expect(contents).not.toContain(LINKEDIN_HANDLE);
    },
  );

  it('exports contact values in a usable shape', () => {
    expect(EMAIL).toMatch(/^[^@\s]+@[^@\s]+\.[^@\s]+$/);
    expect(GITHUB_USERNAME).not.toContain('/');
    expect(LINKEDIN_HANDLE.startsWith('/')).toBe(true);
  });
});

/**
 * The same drift shape, one fact further out, but scoped to Hero.tsx only
 * rather than every component. About's prose and the long description in
 * src/data/projects.ts both legitimately spell the award out in their own
 * wording, so a repo-wide guard on these literals could never pass — Hero is
 * the one place the identity must come from src/data/profile.ts, because the
 * redesigned hero makes it the loudest claim on the landing screen.
 *
 * This guard exists because a probe proved the opposite assumption false:
 * hardcoding 'Best Paper Award, IEEE IMC 2026' directly into Hero.tsx in place
 * of {AWARD}, {VENUE} left all six Hero.test.tsx tests green. That test file
 * imports the same constants it asserts against, so both sides move together
 * and neither catches the value being wrong. Only an independently-authored
 * copy of the literal, like this one, catches it.
 */
describe('the award identity is not hardcoded into Hero', () => {
  const heroSource = readFileSync(join(COMPONENTS_DIR, 'Hero.tsx'), 'utf8');

  it('does not hardcode the award name', () => {
    expect(heroSource).not.toContain(AWARD);
  });

  it('does not hardcode the award venue', () => {
    expect(heroSource).not.toContain(VENUE);
  });

  it('does not hardcode the paper title', () => {
    expect(heroSource).not.toContain(PAPER_TITLE);
  });
});

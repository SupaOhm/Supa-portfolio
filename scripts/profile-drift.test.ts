import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ACADEMIC_YEAR, GPA } from '../src/data/profile';

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

import { describe, expect, it } from 'vitest';
import { PROJECT_CATEGORIES } from '../types/project';
import { PROJECTS } from '../data/projects';
import {
  CATEGORY_PALETTES,
  FALLBACK_PALETTE,
  paletteFor,
  wordmark,
} from './projectPlaceholder';

describe('paletteFor', () => {
  it('covers every declared category', () => {
    // The Record is typed exhaustively, but a category could still be mapped
    // to an undefined-valued key by a bad merge; this asserts the values.
    for (const category of PROJECT_CATEGORIES) {
      expect(CATEGORY_PALETTES[category]).toBeDefined();
    }
  });

  it('falls back rather than returning undefined for an empty list', () => {
    expect(paletteFor([])).toBe(FALLBACK_PALETTE);
  });

  it('keys on the first category', () => {
    expect(paletteFor(['AI', 'Backend'])).toBe(CATEGORY_PALETTES.AI);
  });

  it('gives adjacent imageless cards distinct palettes', () => {
    // The regression this design exists to prevent: a hash of the project id
    // put opsbot and voke on the same palette while they flanked the centred
    // carousel card, so two neighbouring placeholders rendered identically.
    const imageless = PROJECTS.filter((project) => !project.imageUrl);
    expect(imageless.length).toBeGreaterThan(1);

    const accents = imageless.map((project) => paletteFor(project.categories).accent);
    expect(new Set(accents).size).toBe(accents.length);
  });
});

describe('wordmark', () => {
  it('takes the short name before a spaced hyphen', () => {
    expect(wordmark('OpsBot - Multi-Agent RAG Assistant')).toBe('OpsBot');
  });

  it('handles an en dash separator', () => {
    expect(wordmark('AckLab – Interactive Networking Platform')).toBe('AckLab');
  });

  it('leaves an unspaced hyphen alone', () => {
    // The separator is " - ", not "-": splitting on the bare character would
    // reduce this title to "Full".
    expect(wordmark('Full-Stack Expense Management')).toBe(
      'Full-Stack Expense Management',
    );
  });

  it('trims surrounding whitespace', () => {
    expect(wordmark('  Voke  ')).toBe('Voke');
  });
});

import type { ProjectCategory } from '../types/project';

/**
 * Visual identity for a project card that has no image yet.
 *
 * Colour is keyed to the project's primary category, not to a hash of its id.
 * A hash gave no guarantee of spread: `opsbot` and `voke` both landed on the
 * same palette while sitting either side of the centred carousel card, so two
 * adjacent placeholders rendered identically. Keying on category also makes
 * the colour carry meaning — every Mobile card shares a tone deliberately,
 * rather than colliding by accident.
 *
 * The Record is exhaustive by type: adding a category to PROJECT_CATEGORIES
 * without adding a palette here fails the build rather than falling through to
 * a default at runtime.
 */
export interface PlaceholderPalette {
  /** Gradient start. */
  from: string;
  /** Gradient midpoint, 58% along. */
  via: string;
  /** Eyebrow text and accent rule. */
  accent: string;
}

export const CATEGORY_PALETTES: Record<ProjectCategory, PlaceholderPalette> = {
  Web: { from: '#1e3a8a', via: '#1e293b', accent: '#60a5fa' },
  Mobile: { from: '#3730a3', via: '#1e1b4b', accent: '#818cf8' },
  Backend: { from: '#1e40af', via: '#0f172a', accent: '#38bdf8' },
  Database: { from: '#115e59', via: '#0f172a', accent: '#2dd4bf' },
  Tools: { from: '#155e75', via: '#0f172a', accent: '#22d3ee' },
  Embedded: { from: '#065f46', via: '#0f172a', accent: '#34d399' },
  Security: { from: '#9f1239', via: '#1e1b4b', accent: '#fb7185' },
  Cloud: { from: '#0369a1', via: '#0f172a', accent: '#7dd3fc' },
  AI: { from: '#6b21a8', via: '#1e1b4b', accent: '#c084fc' },
  Design: { from: '#a21caf', via: '#1e1b4b', accent: '#f0abfc' },
  Data: { from: '#854d0e', via: '#1e1b4b', accent: '#fcd34d' },
};

/** Palette for a card with no categories at all. */
export const FALLBACK_PALETTE: PlaceholderPalette = {
  from: '#1e293b',
  via: '#0f172a',
  accent: '#94a3b8',
};

export function paletteFor(categories: readonly ProjectCategory[]): PlaceholderPalette {
  const [primary] = categories;
  return primary ? CATEGORY_PALETTES[primary] : FALLBACK_PALETTE;
}

/**
 * The short product name for display: "OpsBot - Multi-Agent RAG Assistant"
 * becomes "OpsBot", which reads as a wordmark at display size where the full
 * title would wrap to three cramped lines. Splits only on a spaced hyphen or
 * dash, so "Full-Stack Expense Management" survives intact.
 */
export function wordmark(title: string): string {
  const [head] = title.split(/\s+[-–—]\s+/);
  return head.trim() || title.trim();
}

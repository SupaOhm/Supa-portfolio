import type { Project } from '../types/project';
import { paletteFor, wordmark } from '../lib/projectPlaceholder';

interface ProjectPlaceholderProps {
  project: Project;
}

/**
 * Stands in for a missing project image.
 *
 * `aria-hidden` is required, not cosmetic: the wordmark and category repeat
 * text the card already exposes in its <h3> and tag list, so leaving this
 * readable would make a screen reader announce the project name twice.
 * The real <img> it replaces is likewise decorative (alt="").
 */
export default function ProjectPlaceholder({ project }: ProjectPlaceholderProps) {
  const palette = paletteFor(project.categories);
  const name = wordmark(project.title);
  const category = project.categories[0];

  return (
    <div
      aria-hidden="true"
      className="relative w-full h-48 overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${palette.from} 0%, ${palette.via} 58%, #030712 100%)`,
      }}
    >
      {/* Blueprint grid. Pure CSS so the card costs no extra request. */}
      <div
        className="absolute inset-0 opacity-[0.14]"
        style={{
          backgroundImage:
            'linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* Corner bloom, brightening slightly on hover to match the <img> path. */}
      <div
        className="absolute -top-10 -right-10 w-40 h-40 rounded-full blur-[50px] opacity-40 group-hover:opacity-70 transition-opacity duration-300"
        style={{ backgroundColor: palette.accent }}
      />

      <div className="relative h-full flex flex-col items-center justify-center px-6 text-center">
        {category && (
          <span
            className="font-mono text-[10px] uppercase tracking-[0.28em]"
            style={{ color: palette.accent }}
          >
            {category}
          </span>
        )}
        <span className="mt-2.5 text-3xl font-bold tracking-tight text-white/95 [text-wrap:balance] leading-tight">
          {name}
        </span>
        <span
          className="mt-3 h-px w-10 rounded-full"
          style={{ backgroundColor: palette.accent }}
        />
      </div>
    </div>
  );
}

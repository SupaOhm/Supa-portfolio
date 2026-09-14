import type { Project } from '../types/project';
import ProjectPlaceholder from './ProjectPlaceholder';

interface ProjectCardProps {
  project: Project;
}

/**
 * Status is information, so it is written, not merely coloured.
 *
 * Each badge carries its label as text and the colour is a second, redundant
 * channel -- which is the rule for any state a reader has to act on, and the
 * reason the tokens behind these are deliberately desaturated. The previous
 * badges were two-stop gradients (green-to-emerald, yellow-to-orange,
 * blue-to-cyan) at full saturation, so three states read as three brand
 * colours rather than three values of one property.
 */
const STATUS_STYLES: Record<string, string> = {
  completed: 'border-state-done/40 text-state-done',
  'in-progress': 'border-state-live/40 text-state-live',
  planned: 'border-state-planned/40 text-state-planned',
};

const STATUS_LABELS: Record<string, string> = {
  completed: 'Completed',
  'in-progress': 'In Progress',
  planned: 'Planned',
};

export default function ProjectCard({ project }: ProjectCardProps) {
  return (
    /* No cursor-following glow, no backdrop blur, no coloured drop shadow.
       The card used to carry two blurred gradient blobs that tracked the
       pointer -- 250px and 150px, blue-to-purple -- on top of a gradient
       surface and a `hover:shadow-blue-500/20`. On a dark ground a coloured
       halo around a card is one of the named generated-UI tells, and it was
       also doing the work a border does, less legibly.

       Hover moves the border and the title only: two signals, not five. */
    <article className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-rule/60 bg-paper-2 transition-colors duration-300 hover:border-rule">
      {project.imageUrl ? (
        <img
          src={project.imageUrl}
          alt=""
          loading="lazy"
          decoding="async"
          className="h-48 w-full object-cover"
        />
      ) : (
        <ProjectPlaceholder project={project} />
      )}

      <div className="flex flex-1 flex-col p-6">
        <h3 className="text-[17px] font-semibold tracking-[-0.01em] text-ink transition-colors duration-200 group-hover:text-[var(--section-accent)]">
          {project.title}
        </h3>
        <p className="mt-2 text-[14px] leading-relaxed text-muted">{project.description}</p>

        <ul className="mt-4 flex flex-wrap gap-1.5">
          {project.tags.map((tag) => (
            <li
              key={tag}
              className="rounded border border-rule/60 px-2 py-0.5 text-[11px] text-muted"
            >
              {tag}
            </li>
          ))}
        </ul>

        {/* mt-auto pins the action row to the bottom edge whatever the
            description's length, so a row of cards shares one baseline for its
            controls instead of each card placing them wherever its text ran
            out. */}
        <div className="mt-auto flex items-center justify-between gap-3 pt-5">
          <div className="flex items-center gap-1">
            {project.githubUrl && (
              <a
                href={project.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md p-2 text-muted transition-colors duration-200 hover:bg-paper-3 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--section-accent)]"
                aria-label="View source code"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z" clipRule="evenodd" />
                </svg>
              </a>
            )}
            {project.demoUrl && (
              <a
                href={project.demoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md p-2 text-muted transition-colors duration-200 hover:bg-paper-3 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--section-accent)]"
                aria-label="View live demo"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            )}
          </div>

          {project.status && (
            <span
              className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-medium whitespace-nowrap ${
                STATUS_STYLES[project.status] ?? STATUS_STYLES.planned
              }`}
            >
              {STATUS_LABELS[project.status] ??
                project.status.charAt(0).toUpperCase() + project.status.slice(1)}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

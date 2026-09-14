import { useState, useRef, useEffect, useMemo } from 'react';
import {
  PROJECT_CATEGORIES,
  PROJECT_STATUSES,
  type ProjectCategory,
  type ProjectStatus,
} from '../types/project';
import ProjectCard from './ProjectCard';
import { PROJECTS } from '../data/projects';
import useCarousel from '../hooks/useCarousel';
import { filterProjects } from '../lib/filterProjects';
import { POSITION_STYLES, REDUCED_POSITION_STYLES } from '../lib/carouselPositionStyles';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import { QUIET_BUTTON, SECTION_HUES, SECTION_RULE } from '../lib/surfaces';

const STATUS_LABELS: Record<ProjectStatus, string> = {
  completed: 'Completed',
  'in-progress': 'In Progress',
  planned: 'Planned',
};

/* The same three semantic tokens ProjectCard's badges use. These dots sit
   beside a written label in the filter list, so colour is never the only
   channel carrying the state. */
const STATUS_COLORS: Record<ProjectStatus, string> = {
  completed: 'bg-state-done',
  'in-progress': 'bg-state-live',
  planned: 'bg-state-planned',
};

export default function Projects() {
  const [isCarouselView, setIsCarouselView] = useState(true);
  const [selectedCategories, setSelectedCategories] = useState<Set<ProjectCategory>>(new Set());
  const [selectedStatuses, setSelectedStatuses] = useState<Set<ProjectStatus>>(new Set());
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterDropdownRef = useRef<HTMLDivElement>(null);
  const filterTriggerRef = useRef<HTMLButtonElement>(null);
  const reducedMotion = usePrefersReducedMotion();
  const positionStyles = reducedMotion ? REDUCED_POSITION_STYLES : POSITION_STYLES;

  const filteredProjects = useMemo(
    () => filterProjects(PROJECTS, selectedCategories, selectedStatuses),
    [selectedCategories, selectedStatuses],
  );

  const { currentIndex, setCurrentIndex, next, prev, reset, slotOf, cardHeight, centerCardRef } =
    useCarousel(filteredProjects.length);

  // Reset carousel to first card when filters change
  useEffect(() => { reset(); }, [selectedCategories, selectedStatuses, reset]);

  // Close filter dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(e.target as Node))
        setIsFilterOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close the filter dropdown on Escape and return focus to its trigger.
  // This is a SEPARATE effect with [isFilterOpen] in its deps: the outside-click
  // effect above declares [], so a handler registered there would close over
  // isFilterOpen === false forever and steal focus on every Escape keypress.
  useEffect(() => {
    if (!isFilterOpen) {
      return;
    }

    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsFilterOpen(false);
        filterTriggerRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isFilterOpen]);

  const toggleCategory = (cat: ProjectCategory) =>
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) {
        next.delete(cat);
      } else {
        next.add(cat);
      }
      return next;
    });

  const toggleStatus = (st: ProjectStatus) =>
    setSelectedStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(st)) {
        next.delete(st);
      } else {
        next.add(st);
      }
      return next;
    });

  const clearFilters = () => {
    setSelectedCategories(new Set());
    setSelectedStatuses(new Set());
  };

  const activeFilterCount = selectedCategories.size + selectedStatuses.size;

  const filterStatusText =
    filteredProjects.length === 0
      ? 'No projects match the selected filters.'
      : `${filteredProjects.length} project${filteredProjects.length === 1 ? '' : 's'} shown`;

  // `reset()` runs in an effect after a filter change, so for one render
  // currentIndex can still point past the end of the newly filtered array.
  // Indexing is therefore guarded rather than assumed in range.
  const centredProject = isCarouselView ? filteredProjects[currentIndex] : undefined;
  const carouselStatusText = centredProject
    ? `Project ${currentIndex + 1} of ${filteredProjects.length}: ${centredProject.title}`
    : '';

  return (
    <section
      id="projects"
      aria-labelledby="projects-heading"
      className={`font-system relative px-6 py-24 sm:px-8 lg:px-12 ${SECTION_HUES.amber}`}
    >

      {/* Live regions. Permanently mounted and rendered outside every conditional
          branch: a region inserted into the DOM at the same moment its text
          appears is not reliably announced. Only the text content changes. */}
      <p role="status" data-testid="filter-status" className="sr-only">
        {filterStatusText}
      </p>
      <p role="status" data-testid="carousel-status" className="sr-only">
        {carouselStatusText}
      </p>

      {/* No bordered panel wrapping the cards.
          This section used to be a bordered, blurred container holding a grid
          of bordered cards -- a container whose only job was to draw a second
          box around boxes. Nesting like that has no semantic reason and reads
          as an extra frame; the section's own padding does the containing now.

          The decorative blue and purple hairlines pinned to its corners went
          with it. They marked nothing. */}
      <div className="relative z-10 mx-auto max-w-[980px]">
        <div className="mb-10 flex flex-col gap-6 border-b border-rule/60 pb-8 md:flex-row md:items-end md:justify-between">
          <div>
            {/* The title was wrapped in decorative square brackets. They were
                aria-hidden, which is the tell that they were never content. */}
            <h2
              id="projects-heading"
              className="text-[clamp(1.75rem,3.5vw,2.5rem)] font-semibold tracking-[-0.02em] text-ink"
            >
              Featured Projects
            </h2>
            <div aria-hidden="true" className={SECTION_RULE} />
            <p className="mt-3 max-w-[52ch] text-[15px] text-muted">
              Select filters or switch views to explore technical implementations.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-3">
          <button
            onClick={() => setIsCarouselView((v) => !v)}
            className={`flex items-center gap-2 ${QUIET_BUTTON}`}
            aria-pressed={isCarouselView}
            aria-label="Carousel view"
          >
            {isCarouselView ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
          </div>
        </div>

        {/* Filter Dropdown */}
        <div className="mb-10 flex flex-wrap items-center gap-2">
          <div className="relative" ref={filterDropdownRef}>
            <button
              ref={filterTriggerRef}
              onClick={() => setIsFilterOpen((v) => !v)}
              aria-expanded={isFilterOpen}
              aria-controls="project-filter-panel"
              className={`flex items-center gap-2 ${QUIET_BUTTON}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
              </svg>
              <span className="text-sm font-medium">Filter</span>
              {activeFilterCount > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full border border-[var(--section-accent)]/50 text-[11px] font-semibold text-[var(--section-accent)]">
                  {activeFilterCount}
                </span>
              )}
              <svg className={`w-4 h-4 transition-transform duration-200 ${isFilterOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {isFilterOpen && (
              <div id="project-filter-panel" className="absolute left-0 z-50 mt-2 w-72 rounded-xl border border-rule bg-paper-2 shadow-2xl shadow-black/60">
                <div className="p-4 space-y-4">
                  {/* Category */}
                  <div>
                    <p className="mb-2 text-[11px] font-semibold tracking-[0.08em] text-muted uppercase">Category</p>
                    <div className="grid grid-cols-2 gap-0.5">
                      {PROJECT_CATEGORIES.map((cat) => (
                        <label key={cat} className="group flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 transition-colors duration-150 hover:bg-paper-3">
                          <input
                            type="checkbox"
                            checked={selectedCategories.has(cat)}
                            onChange={() => toggleCategory(cat)}
                            className="h-3.5 w-3.5 shrink-0 accent-[var(--section-accent)]"
                          />
                          <span className="flex-1 text-[13px] text-neutral group-hover:text-ink">{cat}</span>
                          <span className="text-[11px] tabular-nums text-muted">({PROJECTS.filter((p) => p.categories.includes(cat)).length})</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-rule/60" />

                  {/* Status */}
                  <div>
                    <p className="mb-2 text-[11px] font-semibold tracking-[0.08em] text-muted uppercase">Status</p>
                    <div className="space-y-0.5">
                      {PROJECT_STATUSES.map((st) => (
                        <label key={st} className="group flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 transition-colors duration-150 hover:bg-paper-3">
                          <input
                            type="checkbox"
                            checked={selectedStatuses.has(st)}
                            onChange={() => toggleStatus(st)}
                            className="h-3.5 w-3.5 shrink-0 accent-[var(--section-accent)]"
                          />
                          <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_COLORS[st]}`} />
                          <span className="flex-1 text-[13px] text-neutral group-hover:text-ink">{STATUS_LABELS[st]}</span>
                          <span className="text-[11px] tabular-nums text-muted">({PROJECTS.filter((p) => p.status === st).length})</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {activeFilterCount > 0 && (
                    <>
                      <div className="border-t border-rule/60" />
                      <button onClick={clearFilters} className="w-full py-1 text-center text-[13px] text-muted transition-colors duration-150 hover:text-ink">
                        Clear all filters
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Active filter pills */}
          {activeFilterCount > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              {[...selectedCategories].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => toggleCategory(cat)}
                  aria-label={`Remove ${cat} filter`}
                  className="flex cursor-pointer items-center gap-1 rounded-full border border-[var(--section-accent)]/40 bg-[var(--section-tint)] px-2.5 py-0.5 text-[11px] text-[var(--section-accent)] transition-colors duration-150 hover:border-rule hover:bg-paper-3 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--section-accent)]"
                >
                  {cat}
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              ))}
              {[...selectedStatuses].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => toggleStatus(st)}
                  aria-label={`Remove ${STATUS_LABELS[st]} filter`}
                  className="flex cursor-pointer items-center gap-1 rounded-full border border-[var(--section-accent)]/40 bg-[var(--section-tint)] px-2.5 py-0.5 text-[11px] text-[var(--section-accent)] transition-colors duration-150 hover:border-rule hover:bg-paper-3 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--section-accent)]"
                >
                  {STATUS_LABELS[st]}
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              ))}
            </div>
          )}
        </div>

        {isCarouselView ? (
          /* 3D Carousel */
          <div className="relative overflow-x-hidden" style={{ minHeight: '500px' }}>
            <div className="relative py-12 flex items-center justify-center" style={{ minHeight: `${cardHeight + 96}px` }}>
              <div className="relative w-full flex items-center justify-center" style={{ perspective: '2000px' }}>
                {filteredProjects.length > 0 ? (
                  filteredProjects.map((project, idx) => {
                    const pos = slotOf(idx);
                    if (pos === null) return null;
                    const isCenter = pos === 0;
                    return (
                      <div
                        key={project.id}
                        ref={isCenter ? centerCardRef : null}
                        data-testid="carousel-card"
                        inert={!isCenter}
                        /* transition-[transform,opacity], not transition-all.
                           The slot styles set three things and only two of them
                           should move: transform and opacity animate, zIndex
                           must not. z-index is a discrete property, so
                           transition-all does not interpolate it -- it swaps it
                           at the halfway point, which restacks the card
                           mid-flight. Naming the two properties leaves the
                           stacking order to apply immediately, where it
                           belongs. */
                        className={`w-[280px] transition-[transform,opacity] duration-700 ease-out sm:w-[360px] ${filteredProjects.length === 1 ? '' : 'absolute'}`}
                        style={{ ...positionStyles[pos], transformStyle: 'preserve-3d', willChange: 'transform, opacity' }}
                      >
                        {/* A 1px accent ring, not a 50px blue bloom. The
                            centred card is already distinguished by scale and
                            position; the glow was saying the same thing a third
                            time, in the loudest available voice. */}
                        <div className={`overflow-hidden rounded-xl ${isCenter ? 'ring-1 ring-[var(--section-accent)]/70' : ''}`}>
                          <ProjectCard project={project} />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="py-20 text-[15px] text-muted">No projects match the selected filters.</p>
                )}
              </div>
            </div>

            {/* Arrow Navigation */}
            {filteredProjects.length > 1 && (
              <>
                <button onClick={prev} className="absolute top-64 z-40 rounded-full border border-rule/60 bg-paper-2 px-1.5 py-8 text-neutral transition-colors duration-200 hover:border-rule hover:bg-paper-3 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--section-accent)] sm:p-4 left-0 sm:left-4" aria-label="Previous project">
                  <svg className="w-3.5 h-3.5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button onClick={next} className="absolute top-64 z-40 rounded-full border border-rule/60 bg-paper-2 px-1.5 py-8 text-neutral transition-colors duration-200 hover:border-rule hover:bg-paper-3 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--section-accent)] sm:p-4 right-0 sm:right-4" aria-label="Next project">
                  <svg className="w-3.5 h-3.5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </>
            )}

            {/* Navigation Dots */}
            {filteredProjects.length > 1 && (
              <div className="flex justify-center gap-0 mt-8">
                {filteredProjects.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentIndex(i)}
                    className="group p-1.5 rounded-full"
                    aria-label={`Go to project ${i + 1}`}
                  >
                    <span
                      className={`block h-2 rounded-full transition-[width,background-color] duration-300 ${currentIndex === i ? 'w-7 bg-[var(--section-accent)]' : 'w-2 bg-rule group-hover:bg-muted'}`}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Grid View */
          <div>
            {filteredProjects.length > 0 ? (
              /* Two columns, not three. An even three-up grid of
                 icon-over-heading-over-two-lines cards is the single most
                 emitted generated layout there is; at two the cards are wide
                 enough to show their image and their description properly,
                 and the row stops reading as a feature matrix. */
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                {filteredProjects.map((project, i) => (
                  <div key={project.id} style={{ animation: reducedMotion ? 'none' : `fadeIn 0.6s ease-out ${i * 100}ms both` }}>
                    <ProjectCard project={project} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-20 text-center text-[15px] text-muted">No projects match the selected filters.</p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}


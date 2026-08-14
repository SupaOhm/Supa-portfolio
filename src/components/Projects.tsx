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

const STATUS_LABELS: Record<ProjectStatus, string> = {
  completed: 'Completed',
  'in-progress': 'In Progress',
  planned: 'Planned',
};

const STATUS_COLORS: Record<ProjectStatus, string> = {
  completed: 'bg-green-400',
  'in-progress': 'bg-yellow-400',
  planned: 'bg-blue-400',
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
    <section id="projects" aria-labelledby="projects-heading" className="py-20 px-4 sm:px-6 lg:px-8 relative bg-gray-950">
      <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none" />

      {/* Live regions. Permanently mounted and rendered outside every conditional
          branch: a region inserted into the DOM at the same moment its text
          appears is not reliably announced. Only the text content changes. */}
      <p role="status" data-testid="filter-status" className="sr-only">
        {filterStatusText}
      </p>
      <p role="status" data-testid="carousel-status" className="sr-only">
        {carouselStatusText}
      </p>

      <div className="max-w-7xl mx-auto relative z-10 marker-cross marker-cross-tl marker-cross-tr marker-cross-bl marker-cross-br p-4 sm:p-8 border-[1px] border-gray-800/60 bg-gray-950/40 backdrop-blur-sm">
        <div className="flex flex-col md:flex-row items-center justify-between mb-8 border-b-[1px] border-gray-800/60 pb-8 relative">
          {/* Decorative lines */}
          <div className="absolute top-0 left-0 w-8 h-[1px] bg-blue-500/50" />
          <div className="absolute bottom-0 right-0 w-8 h-[1px] bg-purple-500/50" />
          
          <div className="text-center md:text-left flex-1 w-full md:w-auto">
            <p className="font-mono text-xs sm:text-sm uppercase tracking-[0.2em] text-blue-400 mb-2">
              // sys.logs.fetch("projects")
            </p>
            <h2 id="projects-heading" className="text-3xl sm:text-4xl font-bold text-white tracking-tight flex items-center justify-center md:justify-start gap-2">
              <span aria-hidden="true" className="text-gray-700 font-light text-2xl">[</span>
              Featured Projects
              <span aria-hidden="true" className="text-gray-700 font-light text-2xl">]</span>
            </h2>
          </div>

          {/* View Toggle wrapper with blueprint styling */}
          <div className="mt-6 md:mt-0 flex gap-4 w-full md:w-auto items-center justify-center">
          <button
            onClick={() => setIsCarouselView((v) => !v)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-gray-800/50 to-gray-700/50 text-gray-300 rounded-lg hover:from-blue-500/20 hover:to-purple-500/20 hover:text-white transition-all duration-300 border border-gray-700/50 hover:border-blue-400/50 hover:shadow-lg hover:shadow-blue-500/20"
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

        <p className="font-mono text-gray-400/80 text-sm text-center mb-8 max-w-2xl mx-auto pt-6">
          &gt; Select filters or switch views to explore technical implementations.
        </p>

        {/* Filter Dropdown */}
        <div className="flex flex-wrap justify-center items-center gap-2 mb-8">
          <div className="relative" ref={filterDropdownRef}>
            <button
              ref={filterTriggerRef}
              onClick={() => setIsFilterOpen((v) => !v)}
              aria-expanded={isFilterOpen}
              aria-controls="project-filter-panel"
              className="flex items-center gap-2 px-4 py-2 bg-gray-800/60 text-gray-300 rounded-lg border border-gray-700/50 hover:border-blue-400/50 hover:text-white transition-all duration-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
              </svg>
              <span className="text-sm font-medium">Filter</span>
              {activeFilterCount > 0 && (
                <span className="flex items-center justify-center w-5 h-5 text-xs font-bold bg-blue-500 text-white rounded-full">
                  {activeFilterCount}
                </span>
              )}
              <svg className={`w-4 h-4 transition-transform duration-200 ${isFilterOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {isFilterOpen && (
              <div id="project-filter-panel" className="absolute left-1/2 -translate-x-1/2 mt-2 w-72 bg-gray-900/95 border border-gray-700/60 rounded-xl shadow-2xl shadow-black/40 backdrop-blur-md z-50">
                <div className="p-4 space-y-4">
                  {/* Category */}
                  <div>
                    <p className="text-xs uppercase tracking-widest text-gray-400 font-semibold mb-2">Category</p>
                    <div className="grid grid-cols-2 gap-0.5">
                      {PROJECT_CATEGORIES.map((cat) => (
                        <label key={cat} className="flex items-center gap-2 px-2.5 py-1.5 rounded-md cursor-pointer hover:bg-gray-800/60 transition-colors duration-150 group">
                          <input
                            type="checkbox"
                            checked={selectedCategories.has(cat)}
                            onChange={() => toggleCategory(cat)}
                            className="w-3.5 h-3.5 accent-blue-500 flex-shrink-0"
                          />
                          <span className="text-sm text-gray-300 group-hover:text-white flex-1">{cat}</span>
                          <span className="text-xs text-gray-400">({PROJECTS.filter((p) => p.categories.includes(cat)).length})</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-gray-700/50" />

                  {/* Status */}
                  <div>
                    <p className="text-xs uppercase tracking-widest text-gray-400 font-semibold mb-2">Status</p>
                    <div className="space-y-0.5">
                      {PROJECT_STATUSES.map((st) => (
                        <label key={st} className="flex items-center gap-2 px-2.5 py-1.5 rounded-md cursor-pointer hover:bg-gray-800/60 transition-colors duration-150 group">
                          <input
                            type="checkbox"
                            checked={selectedStatuses.has(st)}
                            onChange={() => toggleStatus(st)}
                            className="w-3.5 h-3.5 accent-blue-500 flex-shrink-0"
                          />
                          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_COLORS[st]}`} />
                          <span className="text-sm text-gray-300 group-hover:text-white flex-1">{STATUS_LABELS[st]}</span>
                          <span className="text-xs text-gray-400">({PROJECTS.filter((p) => p.status === st).length})</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {activeFilterCount > 0 && (
                    <>
                      <div className="border-t border-gray-700/50" />
                      <button onClick={clearFilters} className="w-full text-center text-sm text-gray-400 hover:text-red-400 transition-colors duration-150 py-1">
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
                  className="flex items-center gap-1 px-2 py-0.5 text-xs bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-full cursor-pointer hover:bg-red-500/20 hover:text-red-300 hover:border-red-500/30 transition-colors duration-150"
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
                  className="flex items-center gap-1 px-2 py-0.5 text-xs bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-full cursor-pointer hover:bg-red-500/20 hover:text-red-300 hover:border-red-500/30 transition-colors duration-150"
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
                        className={`w-[280px] sm:w-[360px] transition-all duration-700 ease-out ${filteredProjects.length === 1 ? '' : 'absolute'}`}
                        style={{ ...positionStyles[pos], transformStyle: 'preserve-3d', willChange: 'transform, opacity' }}
                      >
                        <div className={`${isCenter ? 'ring-4 ring-blue-500/60 shadow-[0_0_50px_rgba(59,130,246,0.5)]' : ''} rounded-xl overflow-hidden`}>
                          <ProjectCard project={project} />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-gray-400 text-lg py-20">No projects match the selected filters.</p>
                )}
              </div>
            </div>

            {/* Arrow Navigation */}
            {filteredProjects.length > 1 && (
              <>
                <button onClick={prev} className="absolute left-0 sm:left-4 top-64 bg-gray-800/70 hover:bg-gray-700 text-white px-1.5 py-8 sm:p-4 rounded-full backdrop-blur-sm transition-all duration-200 hover:scale-110 z-40 shadow-lg sm:shadow-xl" aria-label="Previous project">
                  <svg className="w-3.5 h-3.5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button onClick={next} className="absolute right-0 sm:right-4 top-64 bg-gray-800/70 hover:bg-gray-700 text-white px-1.5 py-8 sm:p-4 rounded-full backdrop-blur-sm transition-all duration-200 hover:scale-110 z-40 shadow-lg sm:shadow-xl" aria-label="Next project">
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
                      className={`block transition-all duration-300 rounded-full ${currentIndex === i ? 'bg-blue-500 w-8 h-3' : 'bg-gray-500 group-hover:bg-gray-400 w-3 h-3'}`}
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProjects.map((project, i) => (
                  <div key={project.id} style={{ animation: reducedMotion ? 'none' : `fadeIn 0.6s ease-out ${i * 100}ms both` }}>
                    <ProjectCard project={project} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-lg text-center py-20">No projects match the selected filters.</p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}


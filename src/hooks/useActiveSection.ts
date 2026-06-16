import { useState, useEffect } from 'react';

const DEFAULT_VISIBILITY_THRESHOLD = 0.1;

interface UseActiveSectionOptions {
  threshold?: number;
  enabled?: boolean;
}

/**
 * Tracks which section is currently in view, using viewport-occupancy logic:
 * the section occupying the most of the viewport (above `threshold`) wins.
 *
 * Attaches a window `scroll` listener plus a `transitionend` listener on the
 * about section (to react to its expand/collapse), runs an initial pass on
 * mount, and returns the active section id. When `enabled` is false it does
 * nothing and returns a stable initial value.
 */
export function useActiveSection(
  sectionIds: readonly string[],
  options?: UseActiveSectionOptions,
): string {
  const { threshold = DEFAULT_VISIBILITY_THRESHOLD, enabled = true } = options ?? {};
  const initialId = sectionIds[0] ?? 'home';
  const [activeSection, setActiveSection] = useState<string>(initialId);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const updateActiveSection = () => {
      const elements = sectionIds
        .map((sectionId) => document.getElementById(sectionId))
        .filter((el): el is HTMLElement => !!el);

      if (elements.length === 0) return;

      let mostVisibleElement: HTMLElement | null = null;
      let maxOccupancy = 0;

      elements.forEach((el) => {
        const rect = el.getBoundingClientRect();
        const viewportHeight = window.innerHeight;

        const visibleHeight = Math.max(0, Math.min(viewportHeight, rect.bottom) - Math.max(0, rect.top));
        const occupancy = visibleHeight / viewportHeight;

        if (occupancy > maxOccupancy) {
          maxOccupancy = occupancy;
          mostVisibleElement = el;
        }
      });

      if (maxOccupancy > threshold && mostVisibleElement) {
        const element: HTMLElement = mostVisibleElement;
        setActiveSection(element.id);
      }
    };

    window.addEventListener('scroll', updateActiveSection);

    // Handle About section expand/collapse
    const aboutSection = document.getElementById('about');
    if (aboutSection) {
      aboutSection.addEventListener('transitionend', updateActiveSection);
    }

    updateActiveSection();

    return () => {
      window.removeEventListener('scroll', updateActiveSection);
      if (aboutSection) {
        aboutSection.removeEventListener('transitionend', updateActiveSection);
      }
    };
  }, [sectionIds, threshold, enabled]);

  return enabled ? activeSection : initialId;
}

/**
 * Scrolls to a section by id, matching the timing behavior used when
 * resolving a navigation target (slight delay to ensure layout is ready).
 */
export function scrollToSection(id: string): void {
  const el = document.getElementById(id);
  if (el) {
    // slight delay to ensure elements are laid out
    setTimeout(() => el.scrollIntoView({ behavior: 'smooth' }), 0);
  }
}

import { useEffect } from 'react';
import { hueAtProgress, scrollProgress } from '../lib/pageHue';

/**
 * Writes the scroll-derived hue onto the document root as `--page-hue`.
 *
 * A custom property rather than React state on purpose. The hue changes on
 * every scroll frame; routing that through state would re-render the whole
 * page tree sixty times a second to move one number that only CSS consumes.
 * Writing the property directly touches one node and lets the compositor do
 * the rest, and it is the same reasoning the cursor-glow hook already uses.
 *
 * rAF-coalesced: `scroll` can fire many times between paints, and there is no
 * point computing a colour that will never be shown. The flag means at most one
 * computation per frame regardless of how noisy the event stream is.
 */
export function usePageHue(): void {
  useEffect(() => {
    const root = document.documentElement;
    let frame = 0;

    const apply = () => {
      frame = 0;
      const progress = scrollProgress(
        window.scrollY,
        root.scrollHeight,
        window.innerHeight,
      );
      root.style.setProperty('--page-hue', hueAtProgress(progress).toFixed(2));
    };

    const schedule = () => {
      if (frame === 0) {
        frame = requestAnimationFrame(apply);
      }
    };

    // Set it once up front, so the first paint is already the right colour
    // rather than the fallback until the visitor happens to scroll.
    apply();

    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);

    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      if (frame !== 0) {
        cancelAnimationFrame(frame);
      }
      // Leave no orphaned property behind: a stale --page-hue on the root would
      // outlive the component that owns it and silently colour whatever
      // mounted next.
      root.style.removeProperty('--page-hue');
    };
  }, []);
}

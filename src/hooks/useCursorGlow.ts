import { useCallback, useEffect, useRef } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';

export type GlowPosition = { x: number; y: number };

/** Fraction of the remaining gap closed per frame. Two of the three hand-rolled
 *  loops (ProjectCard, Connect) used 0.15; Hero used 0.1. Hero was deliberately
 *  moved onto this shared 0.15 default so one value serves every call site —
 *  its glow now closes the gap about 1.5x faster than before. */
export const DEFAULT_SMOOTHING = 0.15;

/** Distance in px below which the glow is treated as having arrived, so the
 *  animation loop can stop instead of easing forever. */
export const CONVERGENCE_EPSILON = 0.5;

/** One easing step: move `current` a fraction of the way toward `target`. */
export function nextGlowPosition(
  current: GlowPosition,
  target: GlowPosition,
  smoothing: number = DEFAULT_SMOOTHING,
): GlowPosition {
  return {
    x: current.x + (target.x - current.x) * smoothing,
    y: current.y + (target.y - current.y) * smoothing,
  };
}

/** Whether the glow is close enough to the pointer to stop animating. Both axes
 *  must be inside epsilon — a glow that has arrived horizontally but not
 *  vertically is still moving. */
export function hasConverged(
  current: GlowPosition,
  target: GlowPosition,
  epsilon: number = CONVERGENCE_EPSILON,
): boolean {
  return (
    Math.abs(target.x - current.x) < epsilon && Math.abs(target.y - current.y) < epsilon
  );
}

function writeGlow(element: HTMLElement, position: GlowPosition): void {
  element.style.setProperty('--glow-x', `${position.x}px`);
  element.style.setProperty('--glow-y', `${position.y}px`);
}

/**
 * Drives a cursor-following glow without any React state.
 *
 * Returns a single `onMouseMove` handler. Each frame writes `--glow-x` and
 * `--glow-y` onto the element the pointer is over, so nothing re-renders and the
 * glow elements move via a `transform` instead of the `left`/`top` that used to
 * force a per-frame layout. That transform is compositor-only at six of the
 * seven glow sites; Hero's glow (`Hero.tsx:41`) is the exception — it carries
 * `mix-blend-screen` and sits behind a `backdrop-blur-md` panel, so it must
 * still be blended against its backdrop and pays a re-raster every frame. The
 * React re-renders and the forced layout are genuinely gone at all four sites.
 *
 * The loop starts on mousemove and cancels itself on convergence, so a still or
 * absent cursor costs nothing. There are deliberately no enter/leave handlers:
 * when the pointer leaves, mousemove stops firing and the loop winds down on its
 * own, and glow visibility is already handled by CSS and conditional rendering
 * at the call sites.
 *
 * Writing to `event.currentTarget` rather than a stored ref lets ONE instance
 * serve many elements — Connect shares a single hook across every contact link.
 * A per-link hook would be a hook call inside `.map()`, which the Rules of Hooks
 * forbid.
 */
export function useCursorGlow(
  smoothing: number = DEFAULT_SMOOTHING,
): (event: ReactMouseEvent<HTMLElement>) => void {
  const targetRef = useRef<GlowPosition>({ x: 0, y: 0 });
  const currentRef = useRef<GlowPosition>({ x: 0, y: 0 });
  const elementRef = useRef<HTMLElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(
    () => () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    },
    [],
  );

  // Reduced motion is checked when a frame is scheduled, so a loop already in
  // flight would keep easing after the OS setting flips. Cancel it immediately.
  useEffect(() => {
    if (reducedMotion && frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
  }, [reducedMotion]);

  const step = useCallback(function step() {
    const element = elementRef.current;
    if (element === null) {
      frameRef.current = null;
      return;
    }

    const next = nextGlowPosition(currentRef.current, targetRef.current, smoothing);

    if (hasConverged(next, targetRef.current)) {
      currentRef.current = targetRef.current;
      writeGlow(element, targetRef.current);
      frameRef.current = null;
      return;
    }

    currentRef.current = next;
    writeGlow(element, next);
    frameRef.current = requestAnimationFrame(step);
  }, [smoothing]);

  return useCallback(
    (event: ReactMouseEvent<HTMLElement>) => {
      const element = event.currentTarget;
      const rect = element.getBoundingClientRect();
      targetRef.current = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };

      // First move onto this element (or onto a different one): snap, so the
      // glow does not sweep in from the corner or across from a sibling.
      if (element !== elementRef.current) {
        elementRef.current = element;
        currentRef.current = targetRef.current;
        writeGlow(element, targetRef.current);
        return;
      }

      if (reducedMotion) {
        currentRef.current = targetRef.current;
        writeGlow(element, targetRef.current);
        return;
      }

      if (frameRef.current === null) {
        frameRef.current = requestAnimationFrame(step);
      }
    },
    [reducedMotion, step],
  );
}

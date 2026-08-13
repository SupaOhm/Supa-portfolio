import type { CSSProperties } from 'react';

/** Full-motion carousel slot styles. Moved verbatim from Projects.tsx. */
export const POSITION_STYLES: Record<number, CSSProperties> = {
  0:  { transform: 'translateX(0) scale(1) rotateY(0deg)',        opacity: 1,   zIndex: 30, filter: 'brightness(1.2)' },
  1:  { transform: 'translateX(110%) scale(0.85) rotateY(-35deg)', opacity: 0.7, zIndex: 20, filter: 'brightness(0.7)' },
  [-1]: { transform: 'translateX(-110%) scale(0.85) rotateY(35deg)',  opacity: 0.7, zIndex: 20, filter: 'brightness(0.7)' },
  2:  { transform: 'translateX(220%) scale(0.7) rotateY(-45deg)',  opacity: 0,   zIndex: 10, filter: 'brightness(0.5)' },
  [-2]: { transform: 'translateX(-220%) scale(0.7) rotateY(45deg)',   opacity: 0,   zIndex: 10, filter: 'brightness(0.5)' },
};

/**
 * Reduced-motion carousel slot styles.
 *
 * Same horizontal offsets, opacity and stacking, but no rotateY and no scale. Cards
 * still move sideways so position and ordering stay legible; the 45-degree 3D sweep
 * that triggers vestibular symptoms does not happen.
 */
export const REDUCED_POSITION_STYLES: Record<number, CSSProperties> = {
  0:  { transform: 'translateX(0)',     opacity: 1,   zIndex: 30, filter: 'brightness(1.2)' },
  1:  { transform: 'translateX(110%)',  opacity: 0.7, zIndex: 20, filter: 'brightness(0.7)' },
  [-1]: { transform: 'translateX(-110%)', opacity: 0.7, zIndex: 20, filter: 'brightness(0.7)' },
  2:  { transform: 'translateX(220%)',  opacity: 0,   zIndex: 10, filter: 'brightness(0.5)' },
  [-2]: { transform: 'translateX(-220%)', opacity: 0,   zIndex: 10, filter: 'brightness(0.5)' },
};

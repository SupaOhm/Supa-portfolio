import type { CSSProperties } from 'react';

/**
 * Full-motion carousel slot styles.
 *
 * Neighbours are dimmed with opacity alone. An earlier `filter: brightness()`
 * was removed for two reasons: it dimmed each card's background along with its
 * text, collapsing in-card contrast to 2.46:1, and a CSS filter forces a
 * separate rendering context that must be re-rasterized every frame.
 */
export const POSITION_STYLES: Record<number, CSSProperties> = {
  0:  { transform: 'translateX(0) scale(1) rotateY(0deg)',           opacity: 1,   zIndex: 30 },
  1:  { transform: 'translateX(110%) scale(0.85) rotateY(-35deg)',   opacity: 0.8, zIndex: 20 },
  [-1]: { transform: 'translateX(-110%) scale(0.85) rotateY(35deg)', opacity: 0.8, zIndex: 20 },
  2:  { transform: 'translateX(220%) scale(0.7) rotateY(-45deg)',    opacity: 0,   zIndex: 10 },
  [-2]: { transform: 'translateX(-220%) scale(0.7) rotateY(45deg)',  opacity: 0,   zIndex: 10 },
};

/**
 * Reduced-motion carousel slot styles.
 *
 * Same horizontal offsets, opacity and stacking, but no rotateY and no scale.
 * Cards still move sideways so position and ordering stay legible; the
 * 45-degree 3D sweep that triggers vestibular symptoms does not happen.
 *
 * This map must differ from POSITION_STYLES only in `transform`.
 */
export const REDUCED_POSITION_STYLES: Record<number, CSSProperties> = {
  0:  { transform: 'translateX(0)',       opacity: 1,   zIndex: 30 },
  1:  { transform: 'translateX(110%)',    opacity: 0.8, zIndex: 20 },
  [-1]: { transform: 'translateX(-110%)', opacity: 0.8, zIndex: 20 },
  2:  { transform: 'translateX(220%)',    opacity: 0,   zIndex: 10 },
  [-2]: { transform: 'translateX(-220%)', opacity: 0,   zIndex: 10 },
};

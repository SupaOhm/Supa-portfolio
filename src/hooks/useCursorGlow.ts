export type GlowPosition = { x: number; y: number };

/** Fraction of the remaining gap closed per frame. Matches the value the three
 *  hand-rolled loops used before they were unified. */
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

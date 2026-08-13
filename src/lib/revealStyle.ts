import type { CSSProperties } from 'react';

/** Default reveal animation duration, in milliseconds. */
export const REVEAL_DURATION_MS = 500;

/**
 * Style for a scroll-revealed element.
 *
 * Returns ONLY `opacity` and `animation`. It must never return a `transition*`
 * property: five of the six call sites declare `transition-transform` or
 * `transition-all` in their className, and an inline transition longhand beats the
 * Tailwind class — it would retime their hover and apply the reveal's stagger delay
 * to hover as well.
 *
 * `opacity` carries the visible state as a real declared value rather than relying on
 * an animation's `forwards` fill, so disabling animations leaves revealed content
 * visible instead of blank.
 *
 * The `both` fill mode matters because of the stagger delay: its `backwards` half
 * applies the keyframe's `from` state while the element waits, so it stays invisible
 * until its turn instead of flashing at the base opacity.
 */
export function revealStyle(
  isVisible: boolean,
  delayMs: number,
  reduced: boolean,
  durationMs: number = REVEAL_DURATION_MS,
): CSSProperties {
  return {
    opacity: isVisible ? 1 : 0,
    animation:
      isVisible && !reduced
        ? `fadeIn ${durationMs}ms ease-out ${delayMs}ms both`
        : 'none',
  };
}

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/**
 * The scroll behaviour to request for programmatic scrolling.
 *
 * A CSS `scroll-behavior` declaration cannot solve this: per CSSOM View,
 * `scrollIntoView` consults the computed property only when the requested behaviour is
 * `"auto"`, so passing `'smooth'` explicitly overrides any stylesheet rule. The decision
 * has to be made at the call site.
 *
 * This is a plain function rather than a hook because one call site
 * (`scrollToSection` in useActiveSection.ts) is not a component.
 */
export function currentScrollBehavior(): ScrollBehavior {
  if (typeof window === 'undefined') {
    return 'smooth';
  }
  return window.matchMedia(REDUCED_MOTION_QUERY).matches ? 'auto' : 'smooth';
}

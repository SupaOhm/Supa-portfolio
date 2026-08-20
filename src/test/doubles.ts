/**
 * Controllable replacements for the browser globals that src/test/setup.ts
 * stubs inert.
 *
 * setup.ts stubs matchMedia to a fixed `matches: false` whose addEventListener
 * is a vi.fn() that never fires, and stubs IntersectionObserver to a class that
 * records nothing. Those stubs exist so component tests do not throw on mount,
 * and they are correct for that job. But they mean a test for
 * usePrefersReducedMotion or useReveal written against the default environment
 * PASSES WHILE ASSERTING NOTHING.
 *
 * This module is imported explicitly, only by the files that need to drive
 * those globals. setup.ts is left untouched so the other 242 tests keep the
 * environment they were written against.
 *
 * Every install() returns a restore function that puts the PREVIOUS value back
 * rather than deleting the global — deleting it would break any later test in
 * the same file that renders a component.
 */

export interface MatchMediaDouble {
  /** Use directly when there is no `window` to install onto (node environment). */
  matchMedia(query: string): MediaQueryList;
  /** Install as `window.matchMedia`. Returns a restore function. */
  install(): () => void;
  /** Flip the result and notify every registered `change` listener. */
  setMatches(matches: boolean): void;
  /** Every query string passed to matchMedia, in call order. */
  queries(): string[];
  /** How many times removeEventListener('change', …) was called. */
  removeListenerCount(): number;
}

/**
 * Limitation: this double tracks a single `matches` value and a single
 * "last query" shared across every call to `matchMedia()` on the same
 * instance. That's fine for the single-query consumers this project has
 * today (one hook, one media query, one double per test), but if a test
 * ever drove two distinct media queries off one instance, `setMatches`
 * would notify both queries' listeners identically and `queries()` would
 * interleave both call streams. No consumer needs that today, so this is
 * documented rather than built.
 */
export function createMatchMedia(options: { reduced?: boolean } = {}): MatchMediaDouble {
  let matches = options.reduced ?? false;
  const listeners = new Set<(event: MediaQueryListEvent) => void>();
  const queries: string[] = [];
  let removeCount = 0;

  const matchMedia = (query: string): MediaQueryList => {
    queries.push(query);
    return {
      get matches() {
        return matches;
      },
      media: query,
      onchange: null,
      addEventListener: (type: string, listener: EventListenerOrEventListenerObject) => {
        if (type === 'change') {
          listeners.add(listener as (event: MediaQueryListEvent) => void);
        }
      },
      removeEventListener: (type: string, listener: EventListenerOrEventListenerObject) => {
        if (type === 'change') {
          removeCount += 1;
          listeners.delete(listener as (event: MediaQueryListEvent) => void);
        }
      },
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    } as unknown as MediaQueryList;
  };

  return {
    matchMedia,
    install() {
      // Plain assignment, not Object.defineProperty: setup.ts installs this
      // property with `configurable` left unspecified, which defaults to
      // false on a brand-new property. Restoring via defineProperty would
      // need to promote configurable back to true, which V8 forbids once a
      // property has been defined non-configurable — it throws
      // "Cannot redefine property" before the restore closure is even
      // returned. Assignment sidesteps the whole descriptor dance: it only
      // needs `writable`, which setup.ts does set to true, and it doesn't
      // care about `configurable` in either direction. Capture the previous
      // *value* (and whether the property existed at all) and restore by
      // assignment too, for symmetry.
      const hadOwn = Object.prototype.hasOwnProperty.call(window, 'matchMedia');
      const previous = window.matchMedia;
      window.matchMedia = matchMedia;
      return () => {
        if (hadOwn) {
          window.matchMedia = previous;
        } else {
          // @ts-expect-error - removing a property that was never defined by us
          delete window.matchMedia;
        }
      };
    },
    setMatches(next: boolean) {
      matches = next;
      // MediaQueryListEvent does not exist in this jsdom (probed: `typeof` is
      // 'undefined'), so there is no event to construct and dispatch. Call the
      // listeners directly with the two fields the handler reads.
      const event = { matches: next, media: queries[queries.length - 1] ?? '' } as MediaQueryListEvent;
      for (const listener of [...listeners]) {
        listener(event);
      }
    },
    queries: () => [...queries],
    removeListenerCount: () => removeCount,
  };
}

export interface IntersectionObserverDouble {
  /** Install as both `window.IntersectionObserver` and the global. Returns a restore function. */
  install(): () => void;
  /** Options passed to the most recently constructed observer. */
  lastOptions(): IntersectionObserverInit | undefined;
  /** Elements passed to observe(), in call order. */
  observed(): Element[];
  /** How many times disconnect() was called, across all instances. */
  disconnectCount(): number;
  /** Invoke the most recently constructed observer's callback. */
  trigger(entries: Array<{ isIntersecting: boolean; target?: Element }>): void;
}

export function createIntersectionObserver(): IntersectionObserverDouble {
  type Callback = (entries: IntersectionObserverEntry[], observer: IntersectionObserver) => void;

  let lastCallback: Callback | undefined;
  let lastOptions: IntersectionObserverInit | undefined;
  let lastInstance: IntersectionObserver | undefined;
  const observed: Element[] = [];
  let disconnects = 0;

  class Stub {
    constructor(callback: Callback, init?: IntersectionObserverInit) {
      lastCallback = callback;
      lastOptions = init;
      lastInstance = this as unknown as IntersectionObserver;
    }
    observe(element: Element): void {
      observed.push(element);
    }
    unobserve(): void {}
    disconnect(): void {
      disconnects += 1;
    }
    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
  }

  return {
    install() {
      // Plain assignment, not Object.defineProperty: setup.ts defines
      // window.IntersectionObserver with `configurable` left unspecified,
      // which defaults to false since jsdom has no native
      // IntersectionObserver for this to be redefining. defineProperty here
      // would need to promote configurable false -> true, which is
      // forbidden and throws "Cannot redefine property: IntersectionObserver"
      // — this is exactly the bug this double exists to fix. matchMedia's
      // twin install() escapes this only because jsdom's Window.prototype
      // already exposes matchMedia, so setup.ts's equally partial descriptor
      // there inherits configurable: true from the prototype's own
      // property. Assignment needs no configurable promotion in either
      // case, so use it for both and keep the two installers symmetric.
      // Capture the previous *value* (and whether the property existed at
      // all) and restore by assignment too.
      const hadOwnWindow = Object.prototype.hasOwnProperty.call(window, 'IntersectionObserver');
      const hadOwnGlobal = Object.prototype.hasOwnProperty.call(globalThis, 'IntersectionObserver');
      const previousWindow = window.IntersectionObserver;
      const previousGlobal = globalThis.IntersectionObserver;
      window.IntersectionObserver = Stub as unknown as typeof IntersectionObserver;
      globalThis.IntersectionObserver = Stub as unknown as typeof IntersectionObserver;
      return () => {
        if (hadOwnWindow) {
          window.IntersectionObserver = previousWindow;
        } else {
          // @ts-expect-error - removing a property that was never defined by us
          delete window.IntersectionObserver;
        }
        if (hadOwnGlobal) {
          globalThis.IntersectionObserver = previousGlobal;
        } else {
          // @ts-expect-error - removing a property that was never defined by us
          delete globalThis.IntersectionObserver;
        }
      };
    },
    lastOptions: () => lastOptions,
    observed: () => [...observed],
    disconnectCount: () => disconnects,
    trigger(entries) {
      if (!lastCallback || !lastInstance) {
        throw new Error('trigger() called before any IntersectionObserver was constructed');
      }
      // IntersectionObserverEntry does not exist in this jsdom either, so the
      // entries are literals carrying only the field the hook reads.
      const cast = entries.map((entry) => entry as unknown as IntersectionObserverEntry);
      lastCallback(cast, lastInstance);
    },
  };
}

/**
 * Give an element a fake layout box.
 *
 * jsdom performs no layout: every getBoundingClientRect() returns all zeros.
 * useActiveSection derives its answer entirely from rect geometry, so without
 * this every section computes an occupancy of 0, the `> 0.1` threshold never
 * passes, and the hook looks inert while its tests pass.
 */
export function stubRect(element: Element, rect: { top: number; bottom: number }): void {
  const { top, bottom } = rect;
  element.getBoundingClientRect = () =>
    ({
      top,
      bottom,
      height: bottom - top,
      width: 0,
      left: 0,
      right: 0,
      x: 0,
      y: top,
      toJSON: () => ({}),
    }) as DOMRect;
}

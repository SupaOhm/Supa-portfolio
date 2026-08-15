import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// jsdom does not implement window.matchMedia (verified by probe, Task 1 Step 3).
// usePrefersReducedMotion calls it during render, so without this every component
// test that renders Projects, Connect or Hero would throw.
//
// setupFiles run in every test file's own context, including plain 'node'
// environment files (this project's default), where `window` does not exist
// at all. Guard the stub so it only applies to files that opted into jsdom
// via the `// @vitest-environment jsdom` docblock.
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  });

  // jsdom does not implement IntersectionObserver (verified by probe). useReveal
  // constructs one in an effect, so without this every test that renders Skills,
  // About or Connect throws on mount. The stub records nothing: no test in this
  // project asserts reveal behaviour, only that the components render.
  class IntersectionObserverStub {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
    takeRecords(): [] {
      return [];
    }
  }

  Object.defineProperty(window, 'IntersectionObserver', {
    writable: true,
    value: IntersectionObserverStub,
  });
  Object.defineProperty(globalThis, 'IntersectionObserver', {
    writable: true,
    value: IntersectionObserverStub,
  });

  // jsdom does not implement scrollIntoView (probed: `typeof` is 'undefined').
  // Home's mount effect reaches it through scrollToSection
  // (useActiveSection.ts:90) whenever a targetId is present, inside a
  // setTimeout(…, 0) — so without this stub the failure surfaces as a
  // TypeError in a macrotask AFTER the test body, which is easy to
  // misattribute to something else entirely.
  //
  // A vi.fn() rather than a no-op: the mock records each call's `this` in
  // `mock.contexts`, which is what lets a test assert WHICH element was
  // scrolled to.
  Object.defineProperty(Element.prototype, 'scrollIntoView', {
    writable: true,
    configurable: true,
    value: vi.fn(),
  });
}

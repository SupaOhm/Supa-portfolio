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
}

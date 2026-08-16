// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import App from '../App';
import { resetGitHubCache } from '../lib/githubCache';

// Test-only probe: renders the router's current location.search into the DOM
// so a test can observe where the redirect actually landed. Not part of
// production code — it is rendered alongside <App />, not inside it.
function LocationSearchProbe() {
  const location = useLocation();
  return <div data-testid="location-search">{location.search}</div>;
}

afterEach(cleanup);

beforeEach(() => {
  // githubCache holds a module-level in-flight map that would otherwise leak
  // between test files in the same worker.
  resetGitHubCache();
  // About and Connect fetch on mount. A never-settling promise holds them on
  // their static fallback copy with no state update after the test body, which
  // would otherwise warn about updates outside act(). Same approach as
  // landmarks.test.tsx:18 and integration.a11y.test.tsx:27.
  vi.stubGlobal(
    'fetch',
    vi.fn(() => new Promise(() => {})),
  );
  vi.mocked(Element.prototype.scrollIntoView).mockClear();
});

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
      <LocationSearchProbe />
    </MemoryRouter>,
  );

describe.each([
  ['/about', 'about'],
  ['/projects', 'projects'],
  ['/connect', 'connect'],
])('%s', (path, sectionId) => {
  it('renders the full home page, not a bare section', () => {
    renderAt(path);

    // Home owns the only <main> and Hero the only <h1> in the codebase. Finding
    // both is what proves the redirect landed on the assembled page rather than
    // rendering the section standalone.
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  it(`scrolls to the #${sectionId} section`, async () => {
    renderAt(path);

    // scrollToSection defers through setTimeout(…, 0), so the call has not
    // happened yet when render() returns.
    await waitFor(() => {
      const spy = vi.mocked(Element.prototype.scrollIntoView);
      expect(spy).toHaveBeenCalled();
      // `contexts` records each call's `this` — here, the scrolled element.
      // Asserting the id is the difference between "something scrolled" and
      // "the right section scrolled".
      expect((spy.mock.contexts[0] as Element).id).toBe(sectionId);
    });
  });
});

describe('query string preservation', () => {
  it('carries a campaign query string through the redirect to /', () => {
    renderAt('/projects?utm_source=linkedin');

    expect(screen.getByTestId('location-search')).toHaveTextContent('?utm_source=linkedin');
  });
});

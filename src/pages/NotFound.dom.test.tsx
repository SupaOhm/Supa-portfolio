// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';
import { resetGitHubCache } from '../lib/githubCache';

afterEach(cleanup);

beforeEach(() => {
  resetGitHubCache();
  vi.stubGlobal(
    'fetch',
    vi.fn(() => new Promise(() => {})),
  );
});

describe('unmatched URLs', () => {
  const renderAt = (path: string) =>
    render(
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>,
    );

  it('explains that the page was not found', () => {
    renderAt('/nonexistent-xyz');

    expect(screen.getByRole('heading', { name: /page not found/i })).toBeInTheDocument();
  });

  it('offers a route back to the portfolio', () => {
    renderAt('/nonexistent-xyz');

    // Asserting the href, not just that a link exists: a "back home" link that
    // points anywhere else is the whole failure mode this guards.
    expect(screen.getByRole('link', { name: /back to portfolio/i })).toHaveAttribute('href', '/');
  });
});

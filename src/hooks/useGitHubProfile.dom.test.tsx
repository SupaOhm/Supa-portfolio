// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { useGitHubProfile } from './useGitHubProfile';
import { resetGitHubCache } from '../lib/githubCache';

const userBody = {
  login: 'testuser',
  avatar_url: 'https://example.com/avatar.png',
  html_url: 'https://github.com/testuser',
  name: 'Test User',
  bio: 'Builds things',
  location: 'Bangkok',
  hireable: true,
  public_repos: 7,
  followers: 42,
  repos_url: 'https://api.github.com/users/testuser/repos',
  created_at: '2020-03-15T00:00:00Z',
  updated_at: '2026-01-02T00:00:00Z',
};

/** Stands in for About or Connect. One template literal so the assertion text
 *  is a single text node rather than three React children. */
function Consumer({ label }: { label: string }) {
  const { profile, isLoading } = useGitHubProfile('testuser');
  return <p>{`${label}: ${isLoading ? 'loading' : (profile?.login ?? 'none')}`}</p>;
}

function Pair({ showAbout }: { showAbout: boolean }) {
  return (
    <>
      {showAbout ? <Consumer label="about" /> : null}
      <Consumer label="connect" />
    </>
  );
}

let fetchCount = 0;

beforeEach(() => {
  resetGitHubCache();
  // jsdom DOES implement sessionStorage, so a previous test's entry would
  // otherwise satisfy the next one and hide a real regression.
  sessionStorage.clear();
  fetchCount = 0;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string | URL) => {
      fetchCount += 1;
      const body = String(url).includes('/repos') ? [] : userBody;
      return new Response(JSON.stringify(body), { status: 200 });
    }),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('useGitHubProfile wiring', () => {
  it('makes one round trip when two components mount together', async () => {
    render(<Pair showAbout />);

    await waitFor(() => {
      expect(screen.getByText('about: testuser')).toBeInTheDocument();
      expect(screen.getByText('connect: testuser')).toBeInTheDocument();
    });

    // The user endpoint plus the repos endpoint, once. Four means each mount
    // fetched independently and the hook is not using the cache.
    expect(fetchCount).toBe(2);
  });

  it('still resolves for the remaining consumer when the other unmounts mid-flight', async () => {
    const { rerender } = render(<Pair showAbout />);

    // Unmount "about" before the shared request settles. If the hook passed a
    // per-consumer AbortSignal into the shared promise, this abort would take
    // "connect" down with it and the assertion below would time out. This is
    // the exact production regression the no-AbortSignal design prevents.
    rerender(<Pair showAbout={false} />);

    await waitFor(() => {
      expect(screen.getByText('connect: testuser')).toBeInTheDocument();
    });
  });
});

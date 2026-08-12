import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchGitHubProfile } from './useGitHubProfile';

/**
 * CHARACTERIZATION tests. The stars-tie case records that the first repo wins
 * (useGitHubProfile.ts:79 uses strict `>`), which is currently undocumented.
 *
 * Uses the real global Response so no type assertion is needed to fake it.
 */

const userBody = (overrides: Record<string, unknown> = {}) => ({
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
  ...overrides,
});

const repo = (name: string, stars: number, language: string | null) => ({
  name,
  html_url: `https://github.com/testuser/${name}`,
  stargazers_count: stars,
  language,
});

const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });
const notOk = (status: number) => new Response('', { status });

/** Routes the user endpoint vs the repos endpoint by URL. */
const stubFetch = (userResponse: Response, reposResponse: Response) => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string | URL) =>
      String(url).includes('/repos') ? reposResponse : userResponse,
    ),
  );
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('fetchGitHubProfile', () => {
  it('rejects with a specific message when the user endpoint is not ok', async () => {
    stubFetch(notOk(403), ok([]));
    await expect(fetchGitHubProfile('testuser')).rejects.toThrow(
      'Failed to fetch GitHub stats',
    );
  });

  it('rejects with a different message when the repos endpoint is not ok', async () => {
    stubFetch(ok(userBody()), notOk(403));
    await expect(fetchGitHubProfile('testuser')).rejects.toThrow(
      'Failed to fetch GitHub repositories',
    );
  });

  it('returns zero/null/N-A for an account with no repositories', async () => {
    stubFetch(ok(userBody()), ok([]));
    const profile = await fetchGitHubProfile('testuser');
    expect(profile.totalStars).toBe(0);
    expect(profile.mostStarredRepo).toBeNull();
    expect(profile.topLanguage).toBe('N/A');
  });

  it('keeps the FIRST repo when star counts tie (strict > comparison)', async () => {
    stubFetch(
      ok(userBody()),
      ok([repo('alpha', 5, 'TypeScript'), repo('beta', 5, 'TypeScript')]),
    );
    const profile = await fetchGitHubProfile('testuser');
    expect(profile.mostStarredRepo?.name).toBe('alpha');
    expect(profile.totalStars).toBe(10);
  });

  it('picks the most frequent language and sums stars', async () => {
    stubFetch(
      ok(userBody()),
      ok([
        repo('a', 1, 'TypeScript'),
        repo('b', 4, 'Python'),
        repo('c', 2, 'TypeScript'),
        repo('d', 0, null),
      ]),
    );
    const profile = await fetchGitHubProfile('testuser');
    expect(profile.topLanguage).toBe('TypeScript');
    expect(profile.totalStars).toBe(7);
    expect(profile.mostStarredRepo?.name).toBe('b');
  });

  it('applies fallbacks for null name, bio and location', async () => {
    stubFetch(ok(userBody({ name: null, bio: null, location: null })), ok([]));
    const profile = await fetchGitHubProfile('testuser');
    expect(profile.displayName).toBe('testuser');
    expect(profile.bio).toBe('No bio provided yet.');
    expect(profile.location).toBe('Not specified');
  });

  it('derives sinceYear from created_at', async () => {
    stubFetch(ok(userBody({ created_at: '2019-11-01T00:00:00Z' })), ok([]));
    const profile = await fetchGitHubProfile('testuser');
    expect(profile.sinceYear).toBe(2019);
  });
});

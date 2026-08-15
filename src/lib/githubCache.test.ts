import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getCachedGitHubProfile, resetGitHubCache, CACHE_TTL_MS } from './githubCache';
import type { CacheStorage } from './githubCache';

const profileBody = {
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

/** Counts calls so a test can prove requests were deduplicated. */
const countingFetch = () => {
  const calls = { count: 0 };
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string | URL) => {
      calls.count += 1;
      const body = String(url).includes('/repos') ? [] : profileBody;
      return new Response(JSON.stringify(body), { status: 200 });
    }),
  );
  return calls;
};

/** In-memory stand-in for sessionStorage, which does not exist in vitest's node env. */
const fakeStorage = (): CacheStorage & { data: Map<string, string> } => {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  };
};

beforeEach(() => {
  resetGitHubCache();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('getCachedGitHubProfile', () => {
  it('makes one network round trip when two callers race', async () => {
    // The real scenario: About and Connect both mount in the same tick.
    // Two requests per round trip (user + repos), so 2 total, not 4.
    const calls = countingFetch();
    const storage = fakeStorage();

    const [first, second] = await Promise.all([
      getCachedGitHubProfile('testuser', storage),
      getCachedGitHubProfile('testuser', storage),
    ]);

    expect(calls.count).toBe(2);
    expect(first.login).toBe('testuser');
    expect(second).toEqual(first);
  });

  it('serves a fresh cached entry without any network call', async () => {
    const storage = fakeStorage();
    let calls = countingFetch();
    await getCachedGitHubProfile('testuser', storage);
    expect(calls.count).toBe(2);

    // Drop the in-flight map so only sessionStorage can satisfy the next call.
    resetGitHubCache();
    calls = countingFetch();

    const profile = await getCachedGitHubProfile('testuser', storage);
    expect(calls.count).toBe(0);
    expect(profile.login).toBe('testuser');
  });

  it('refetches once the entry is older than the TTL', async () => {
    const storage = fakeStorage();
    let clock = 1_000_000;
    const now = () => clock;

    let calls = countingFetch();
    await getCachedGitHubProfile('testuser', storage, now);
    expect(calls.count).toBe(2);

    resetGitHubCache();
    clock += CACHE_TTL_MS + 1;
    calls = countingFetch();

    await getCachedGitHubProfile('testuser', storage, now);
    expect(calls.count).toBe(2);
  });

  it('ignores a malformed cache entry and fetches live', async () => {
    const storage = fakeStorage();
    storage.data.set('github-profile:testuser', 'not json{');
    const calls = countingFetch();

    const profile = await getCachedGitHubProfile('testuser', storage);

    expect(calls.count).toBe(2);
    expect(profile.login).toBe('testuser');
  });

  it('still resolves when storage throws on write', async () => {
    // Safari private mode throws on setItem. A portfolio must not white-screen.
    const throwingStorage: CacheStorage = {
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
      removeItem: () => {},
    };
    countingFetch();

    const profile = await getCachedGitHubProfile('testuser', throwingStorage);

    expect(profile.login).toBe('testuser');
  });

  it('lets the next caller retry after a failed fetch', async () => {
    // A rejected promise must not stay in the in-flight map, or every later
    // mount inherits the same rejection and the section never recovers.
    const storage = fakeStorage();
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 403 })));

    await expect(getCachedGitHubProfile('testuser', storage)).rejects.toThrow(
      'Failed to fetch GitHub stats',
    );

    const calls = countingFetch();
    const profile = await getCachedGitHubProfile('testuser', storage);

    expect(calls.count).toBe(2);
    expect(profile.login).toBe('testuser');
  });
});

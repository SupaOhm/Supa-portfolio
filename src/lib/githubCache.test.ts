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

  it('does not evict a newer in-flight entry when a stale request settles after a reset', async () => {
    // Reproduces the review finding: resetGitHubCache() can run while a
    // request is still in flight (Task 5's hook tests do this in
    // beforeEach). A later caller for the same username then installs a
    // NEW entry, and the FIRST request's own `.finally()` must not delete
    // that newer entry out from under it when it eventually settles.
    const calls = countingFetch();
    const firstStorage = fakeStorage();
    const secondStorage = fakeStorage();
    const thirdStorage = fakeStorage();

    // Starts fetching immediately and installs an in-flight entry for
    // 'testuser'. Not awaited yet, so it is still pending.
    const firstRequest = getCachedGitHubProfile('testuser', firstStorage);

    // Let the first request progress to its second (repos) fetch call before
    // introducing the second caller. Two same-shaped chains started in the
    // same tick would otherwise settle within the same microtask batch (both
    // `.finally()` callbacks fire before this test can observe the state in
    // between), which would hide the bug. Starting the second caller only
    // once the first is already on its LAST leg guarantees the first
    // finishes well before the second — which still has a full two-fetch
    // round trip ahead of it — can possibly settle.
    while (calls.count < 2) {
      await Promise.resolve();
    }

    // Simulate resetGitHubCache() running mid-flight.
    resetGitHubCache();

    // A second caller for the SAME username installs a brand new in-flight
    // entry, since the map was just cleared.
    const secondRequest = getCachedGitHubProfile('testuser', secondStorage);

    // Let the first request settle. Its `.finally()` runs now.
    await firstRequest;

    // The second caller has only just started (still on its own first fetch
    // call) and cannot have settled yet. A third caller, made immediately
    // after the first request's cleanup, must join the second request's
    // promise rather than starting a brand new fetch. Without the identity
    // guard, the first request's `.finally()` would have deleted the second
    // request's entry, so this call would see an empty map and kick off a
    // duplicate fetch instead.
    const thirdRequest = getCachedGitHubProfile('testuser', thirdStorage);
    expect(thirdRequest).toBe(secondRequest);

    await secondRequest;

    // 2 calls for the first request (user + repos) and 2 for the second.
    // The third caller must not have triggered any of its own.
    expect(calls.count).toBe(4);
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

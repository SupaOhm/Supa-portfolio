import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  CONTRIB_CACHE_TTL_MS,
  MAX_REPOS,
  MAX_STATS_ATTEMPTS,
  __resetContributionsInFlight,
  fetchRepoCommitActivity,
  getCachedContributions,
  type CacheStorage,
  type ContributionDeps,
} from './githubContributions';
import { RECENT_WEEKS } from './contributions';

afterEach(() => {
  __resetContributionsInFlight();
  vi.restoreAllMocks();
});

/** In-memory stand-in for sessionStorage, which does not exist under environment: 'node'. */
function memoryStorage(): CacheStorage & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  };
}

const WEEK_FIXTURE = [{ week: 1_767_484_800, days: [1, 0, 0, 0, 0, 0, 0], total: 1 }];

const ok = (body: unknown) =>
  ({ ok: true, status: 200, json: async () => body }) as unknown as Response;
const status = (code: number) =>
  ({ ok: code < 400, status: code, json: async () => ({}) }) as unknown as Response;

function deps(fetchImpl: typeof fetch, overrides: Partial<ContributionDeps> = {}): ContributionDeps {
  return {
    fetch: fetchImpl,
    storage: memoryStorage(),
    now: () => 1_000_000,
    // Instant, so the 202 path does not make the suite wait for real backoff.
    wait: async () => {},
    ...overrides,
  };
}

describe('fetchRepoCommitActivity', () => {
  it('returns the weeks on a 200', async () => {
    const f = vi.fn(async () => ok(WEEK_FIXTURE)) as unknown as typeof fetch;

    await expect(fetchRepoCommitActivity('SupaOhm', 'repo', deps(f))).resolves.toEqual(
      WEEK_FIXTURE,
    );
  });

  it('retries a 202 and succeeds when GitHub finishes computing', async () => {
    // This is the behaviour the whole retry exists for: GitHub answers 202 with
    // an empty body the first time a repository's stats are requested, then
    // serves real data once it has computed them.
    const f = vi
      .fn()
      .mockResolvedValueOnce(status(202))
      .mockResolvedValueOnce(ok(WEEK_FIXTURE)) as unknown as typeof fetch;

    await expect(fetchRepoCommitActivity('SupaOhm', 'repo', deps(f))).resolves.toEqual(
      WEEK_FIXTURE,
    );
    expect(f).toHaveBeenCalledTimes(2);
  });

  it('gives up after the attempt limit rather than looping forever', async () => {
    const f = vi.fn(async () => status(202)) as unknown as typeof fetch;

    await expect(fetchRepoCommitActivity('SupaOhm', 'repo', deps(f))).resolves.toEqual([]);
    expect(f).toHaveBeenCalledTimes(MAX_STATS_ATTEMPTS);
  });

  it('returns empty rather than throwing on a rate-limit 403', async () => {
    // 60 requests an hour per IP is shared with everything else the page does,
    // so a 403 here is realistic and must not empty the whole graph.
    const f = vi.fn(async () => status(403)) as unknown as typeof fetch;

    await expect(fetchRepoCommitActivity('SupaOhm', 'repo', deps(f))).resolves.toEqual([]);
  });

  it('returns empty when the network throws', async () => {
    const f = vi.fn(async () => {
      throw new Error('offline');
    }) as unknown as typeof fetch;

    await expect(fetchRepoCommitActivity('SupaOhm', 'repo', deps(f))).resolves.toEqual([]);
  });

  it('returns empty when a 200 body is not an array', async () => {
    // A repository with no commits in the window answers 200 with {}.
    const f = vi.fn(async () => ok({})) as unknown as typeof fetch;

    await expect(fetchRepoCommitActivity('SupaOhm', 'repo', deps(f))).resolves.toEqual([]);
  });
});

describe('getCachedContributions', () => {
  it('asks for at most MAX_REPOS repositories', async () => {
    // The cap is a rate-limit budget, not a preference: one request per repo
    // against 60 per hour per IP.
    const f = vi.fn(async () => ok(WEEK_FIXTURE)) as unknown as typeof fetch;
    const names = Array.from({ length: 20 }, (_, i) => `repo-${i}`);

    await getCachedContributions('SupaOhm', names, deps(f));

    expect(f).toHaveBeenCalledTimes(MAX_REPOS);
  });

  it('serves a second call from cache without touching the network', async () => {
    const f = vi.fn(async () => ok(WEEK_FIXTURE)) as unknown as typeof fetch;
    const shared = deps(f);

    await getCachedContributions('SupaOhm', ['a'], shared);
    const callsAfterFirst = (f as unknown as ReturnType<typeof vi.fn>).mock.calls.length;
    await getCachedContributions('SupaOhm', ['a'], shared);

    expect((f as unknown as ReturnType<typeof vi.fn>).mock.calls.length).toBe(callsAfterFirst);
  });

  it('refetches once the cache has expired', async () => {
    const f = vi.fn(async () => ok(WEEK_FIXTURE)) as unknown as typeof fetch;
    const storage = memoryStorage();
    let clock = 1_000_000;

    await getCachedContributions('SupaOhm', ['a'], deps(f, { storage, now: () => clock }));
    clock += CONTRIB_CACHE_TTL_MS + 1;
    __resetContributionsInFlight();
    await getCachedContributions('SupaOhm', ['a'], deps(f, { storage, now: () => clock }));

    expect((f as unknown as ReturnType<typeof vi.fn>).mock.calls.length).toBe(2);
  });

  it('dedupes concurrent callers into one set of requests', async () => {
    // Two components mounting in the same tick would otherwise spend twice the
    // request budget for identical data.
    const f = vi.fn(async () => ok(WEEK_FIXTURE)) as unknown as typeof fetch;
    const shared = deps(f);

    const [a, b] = await Promise.all([
      getCachedContributions('SupaOhm', ['x'], shared),
      getCachedContributions('SupaOhm', ['x'], shared),
    ]);

    expect((f as unknown as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1);
    expect(a).toEqual(b);
  });

  it('does not cache an empty calendar, so a failed load retries', async () => {
    // Caching [] would pin a rate-limited or offline first visit for the whole
    // TTL, long after the network recovered.
    const f = vi.fn(async () => status(403)) as unknown as typeof fetch;
    const storage = memoryStorage();

    const days = await getCachedContributions('SupaOhm', ['a'], deps(f, { storage }));

    expect(days).toEqual([]);
    expect(storage.map.size).toBe(0);
  });

  it('still builds a calendar when only some repositories answer', async () => {
    const f = vi
      .fn()
      .mockResolvedValueOnce(status(403))
      .mockResolvedValueOnce(ok(WEEK_FIXTURE)) as unknown as typeof fetch;

    const days = await getCachedContributions('SupaOhm', ['dead', 'alive'], deps(f));

    expect(days.length).toBeGreaterThan(0);
    expect(days.some((d) => d.count > 0)).toBe(true);
  });

  it('returns only the recent window, not the full year GitHub sends', async () => {
    // GitHub answers with 52 weeks per repository whatever we do; the window is
    // applied here rather than at the render so the cache, the graph and the
    // summary line above it cannot disagree about which range they describe.
    const year = Array.from({ length: 52 }, (_, i) => ({
      week: 1_767_484_800 + i * 604_800,
      days: [1, 0, 0, 0, 0, 0, 0],
      total: 1,
    }));
    const f = vi.fn(async () => ok(year)) as unknown as typeof fetch;

    const days = await getCachedContributions('SupaOhm', ['a'], deps(f));

    expect(days).toHaveLength(RECENT_WEEKS * 7);
  });
});

import { buildCalendar, type CommitActivityWeek, type ContributionDay } from './contributions';

/**
 * Fetching, retrying and caching for the contribution graph. The shaping lives
 * in contributions.ts; this module is only the part that touches the network.
 *
 * Two GitHub behaviours drive the whole design:
 *
 * 1. `/stats/commit_activity` answers **202 with an empty body** the first time
 *    it is asked for a repository. GitHub computes the statistics in the
 *    background and serves them on a later request. A naive fetch therefore
 *    gets nothing on a cold repository and everything a few seconds later,
 *    which reads as "the graph is broken" exactly once per repository per
 *    visitor. This retries, and gives up gracefully rather than hanging.
 *
 * 2. Unauthenticated requests are limited to **60 per hour per IP**, shared
 *    with every other call the site makes. Each repository costs one request,
 *    so the number of repositories included is a hard budget decision, not a
 *    preference.
 */

/**
 * Six repositories, most recently pushed first.
 *
 * The profile fetch already spends 2 of the hourly 60. Six more takes a full
 * page load to 8, leaving comfortable headroom for a visitor who reloads, or
 * for several people behind one NAT. Raising this is the first thing to
 * reconsider if the graph ever looks sparse -- and the first thing to lower if
 * anyone reports a rate-limit failure.
 */
export const MAX_REPOS = 6;

/**
 * Twelve hours, in localStorage — deliberately NOT the profile cache's ten
 * minutes in sessionStorage.
 *
 * The two caches hold different kinds of thing. Follower and star counts move
 * during a browsing session, so a short session-scoped TTL is right for them. A
 * year-long commit calendar moves at most once a day, and costs six of the
 * hourly sixty requests to rebuild.
 *
 * Matching the profile's TTL made every visitor re-spend those six requests
 * every ten minutes, which is how a handful of reloads — or several people
 * behind one NAT — exhausts the budget and leaves the graph missing for
 * everyone with no way to tell that from a bug. Persisting across sessions
 * means one successful load keeps the graph up for the rest of the day.
 */
export const CONTRIB_CACHE_TTL_MS = 43_200_000;

/** Attempts per repository before giving up on a 202. */
export const MAX_STATS_ATTEMPTS = 3;
/** Gap between attempts. GitHub usually finishes computing well inside one. */
export const STATS_RETRY_MS = 900;

export type CacheStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export type ContributionDeps = {
  fetch: typeof fetch;
  storage: CacheStorage;
  now: () => number;
  wait: (ms: number) => Promise<void>;
};

const noopStorage: CacheStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

function defaultStorage(): CacheStorage {
  try {
    // localStorage, not sessionStorage: the whole point is surviving a tab
    // close, so a returning visitor never waits on six requests again today.
    return globalThis.localStorage ?? noopStorage;
  } catch {
    // Accessing localStorage itself throws when cookies are fully blocked.
    return noopStorage;
  }
}

function defaultDeps(): ContributionDeps {
  return {
    fetch: globalThis.fetch.bind(globalThis),
    storage: defaultStorage(),
    now: () => Date.now(),
    wait: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  };
}

/**
 * One repository's 52 weeks.
 *
 * Returns `[]` rather than throwing for every failure mode -- a 202 that never
 * resolves, a 404 on a repository that disappeared, a rate-limit 403. One
 * repository failing must not empty the whole graph, and `mergeCommitActivity`
 * already treats an empty array as "this repository contributed nothing".
 */
export async function fetchRepoCommitActivity(
  owner: string,
  repo: string,
  deps: ContributionDeps,
  signal?: AbortSignal,
): Promise<CommitActivityWeek[]> {
  const url = `https://api.github.com/repos/${owner}/${repo}/stats/commit_activity`;

  for (let attempt = 0; attempt < MAX_STATS_ATTEMPTS; attempt += 1) {
    if (attempt > 0) {
      await deps.wait(STATS_RETRY_MS);
    }

    let response: Response;
    try {
      response = await deps.fetch(url, {
        signal,
        headers: { Accept: 'application/vnd.github+json' },
      });
    } catch {
      return [];
    }

    // Still computing. Wait and ask again.
    if (response.status === 202) {
      continue;
    }
    if (!response.ok) {
      return [];
    }

    try {
      const data: unknown = await response.json();
      // A repository with no commits in the window answers 200 with {} or [].
      return Array.isArray(data) ? (data as CommitActivityWeek[]) : [];
    } catch {
      return [];
    }
  }

  return [];
}

type CacheEntry = { savedAt: number; days: ContributionDay[] };

const storageKey = (owner: string) => `github-contributions:${owner}`;

function readCache(owner: string, deps: ContributionDeps): ContributionDay[] | null {
  let raw: string | null;
  try {
    raw = deps.storage.getItem(storageKey(owner));
  } catch {
    return null;
  }
  if (!raw) {
    return null;
  }

  try {
    const entry: CacheEntry = JSON.parse(raw);
    if (deps.now() - entry.savedAt > CONTRIB_CACHE_TTL_MS) {
      deps.storage.removeItem(storageKey(owner));
      return null;
    }
    return entry.days;
  } catch {
    // A malformed entry is worse than none: drop it so the next load recovers.
    try {
      deps.storage.removeItem(storageKey(owner));
    } catch {
      /* storage is unavailable; nothing to clean up */
    }
    return null;
  }
}

function writeCache(owner: string, days: ContributionDay[], deps: ContributionDeps): void {
  try {
    const entry: CacheEntry = { savedAt: deps.now(), days };
    deps.storage.setItem(storageKey(owner), JSON.stringify(entry));
  } catch {
    // Quota exceeded or storage blocked. The graph still works this session.
  }
}

/**
 * Shared across consumers so two mounts in the same tick await one set of
 * requests rather than two. Same reasoning as githubCache's map -- with six
 * requests behind each call, duplicating them is a quarter of the hourly budget.
 */
const inFlight = new Map<string, Promise<ContributionDay[]>>();

export async function getCachedContributions(
  owner: string,
  repoNames: string[],
  deps: ContributionDeps = defaultDeps(),
  signal?: AbortSignal,
): Promise<ContributionDay[]> {
  const cached = readCache(owner, deps);
  if (cached) {
    return cached;
  }

  const pending = inFlight.get(owner);
  if (pending) {
    return pending;
  }

  const run = (async () => {
    const repos = repoNames.slice(0, MAX_REPOS);
    const activity = await Promise.all(
      repos.map((repo) => fetchRepoCommitActivity(owner, repo, deps, signal)),
    );
    const days = buildCalendar(activity);
    if (days.length > 0) {
      writeCache(owner, days, deps);
    }
    return days;
  })().finally(() => {
    inFlight.delete(owner);
  });

  inFlight.set(owner, run);
  return run;
}

/** Test seam: the in-flight map is module state and outlives a single test. */
export function __resetContributionsInFlight(): void {
  inFlight.clear();
}

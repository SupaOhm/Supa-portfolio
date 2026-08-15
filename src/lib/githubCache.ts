import { fetchGitHubProfile } from '../hooks/useGitHubProfile';
import type { GitHubProfile } from '../hooks/useGitHubProfile';

/**
 * Only the three methods this module uses. Injecting the storage rather than
 * reaching for sessionStorage directly keeps the module testable under
 * vitest's `environment: 'node'`, where sessionStorage does not exist.
 */
export type CacheStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/**
 * Ten minutes. Long enough that ordinary browsing costs zero requests, short
 * enough that a visitor holding a tab open still sees same-session updates.
 */
export const CACHE_TTL_MS = 600_000;

type CacheEntry = {
  savedAt: number;
  profile: GitHubProfile;
};

/**
 * Shared between every consumer of the hook. Two components mounting in the
 * same tick await the SAME promise, so the pair of network requests happens
 * once rather than twice.
 */
const inFlight = new Map<string, Promise<GitHubProfile>>();

/** Storage that silently does nothing, for environments without sessionStorage. */
const noopStorage: CacheStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

function defaultStorage(): CacheStorage {
  try {
    return globalThis.sessionStorage ?? noopStorage;
  } catch {
    // Accessing sessionStorage itself throws when cookies are fully blocked.
    return noopStorage;
  }
}

const storageKey = (username: string) => `github-profile:${username}`;

function readCache(
  username: string,
  storage: CacheStorage,
  now: () => number,
): GitHubProfile | null {
  let raw: string | null;
  try {
    raw = storage.getItem(storageKey(username));
  } catch {
    return null;
  }
  if (!raw) {
    return null;
  }

  try {
    const entry: CacheEntry = JSON.parse(raw);
    if (now() - entry.savedAt > CACHE_TTL_MS) {
      storage.removeItem(storageKey(username));
      return null;
    }
    return entry.profile;
  } catch {
    // Malformed entry from an older shape or a truncated write.
    try {
      storage.removeItem(storageKey(username));
    } catch {
      // Nothing to do; the live fetch below still succeeds.
    }
    return null;
  }
}

function writeCache(
  username: string,
  profile: GitHubProfile,
  storage: CacheStorage,
  now: () => number,
): void {
  const entry: CacheEntry = { savedAt: now(), profile };
  try {
    storage.setItem(storageKey(username), JSON.stringify(entry));
  } catch {
    // Safari private mode throws on setItem. Caching is an optimisation, so
    // failing to cache must never fail the request.
  }
}

/**
 * GitHub profile with request deduplication and a session-scoped TTL cache.
 *
 * Takes NO AbortSignal, deliberately. The returned promise is shared between
 * every concurrent caller, so letting one consumer cancel it would cancel it
 * for the others: under StrictMode the first effect's cleanup would abort the
 * fetch the second run awaits, and in production About unmounting would blank
 * out Connect. Consumers decide whether to APPLY a result, never whether the
 * request continues.
 */
export function getCachedGitHubProfile(
  username: string,
  storage: CacheStorage = defaultStorage(),
  now: () => number = Date.now,
): Promise<GitHubProfile> {
  const cached = readCache(username, storage, now);
  if (cached) {
    return Promise.resolve(cached);
  }

  const pending = inFlight.get(username);
  if (pending) {
    return pending;
  }

  const request = fetchGitHubProfile(username)
    .then((profile) => {
      writeCache(username, profile, storage, now);
      return profile;
    })
    .finally(() => {
      // Drop the entry either way. Keeping a rejected promise here would make
      // every later mount inherit the same failure with no way to retry.
      //
      // Identity-guarded: if resetGitHubCache() ran while this request was in
      // flight, a later caller may have installed a NEW promise under the same
      // key. An unconditional delete would evict that newer entry and cause a
      // surprise duplicate fetch.
      if (inFlight.get(username) === request) {
        inFlight.delete(username);
      }
    });

  inFlight.set(username, request);
  return request;
}

/** Clears in-flight state. Tests only — production never needs this. */
export function resetGitHubCache(): void {
  inFlight.clear();
}

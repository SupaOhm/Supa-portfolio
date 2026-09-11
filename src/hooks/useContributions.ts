import { useEffect, useState } from 'react';
import { getCachedContributions } from '../lib/githubContributions';
import type { ContributionDay } from '../lib/contributions';

export type ContributionsState = {
  days: ContributionDay[];
  loading: boolean;
};

/**
 * Loads the contribution calendar for `username`, built from the commit
 * activity of `repoNames`.
 *
 * `repoNames` comes from `useGitHubProfile`, which already fetches the
 * repository list — so this costs no extra request to discover which
 * repositories exist, only one per repository it actually reads.
 */
export function useContributions(
  username: string,
  repoNames: string[] | undefined,
): ContributionsState {
  /**
   * One piece of state, starting as loading, and only ever written from an
   * async callback.
   *
   * The obvious shape -- separate `days`/`loading` with `setLoading(true)` at
   * the top of the effect -- trips react-hooks/set-state-in-effect: a
   * synchronous setState in an effect body schedules an immediate extra render.
   * Starting as loading is also more honest here, because the hook really is
   * waiting from first mount: it has nothing to do until the profile fetch
   * supplies the repository list.
   */
  const [state, setState] = useState<ContributionsState>({ days: [], loading: true });

  /**
   * A fresh array literal every render would re-run the effect forever, and
   * each run costs up to six network requests against a 60-per-hour budget.
   * Keying on the contents rather than the identity is what stops that.
   */
  const repoKey = (repoNames ?? []).join(',');

  useEffect(() => {
    // Deliberately NOT guarded on repoKey being non-empty.
    //
    // getCachedContributions reads its cache before it looks at the repository
    // list, so running with an empty list costs zero requests (Promise.all of
    // nothing) and still serves a previously cached calendar. Guarding here
    // instead coupled the graph to the PROFILE fetch: when that was
    // rate-limited, repoNames never arrived, the effect never ran, and a
    // perfectly good cached graph went unread. The graph disappeared for a
    // reason that had nothing to do with the graph.
    const controller = new AbortController();
    let active = true;

    getCachedContributions(username, repoKey.split(','), undefined, controller.signal)
      .then((days) => {
        if (active) {
          setState({ days, loading: false });
        }
      })
      .catch(() => {
        // getCachedContributions already degrades to [] per repository, so this
        // is only an abort or an unexpected throw. A hero that renders without
        // its graph is fine; a hero that crashes is not.
        if (active) {
          setState({ days: [], loading: false });
        }
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [username, repoKey]);

  return state;
}

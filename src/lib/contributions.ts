/**
 * Turns GitHub's per-repo commit statistics into one contribution calendar.
 *
 * Why this exists at all: the contribution calendar shown on a GitHub profile
 * is NOT available from the REST API. It is a GraphQL field, and GraphQL
 * requires an authenticated token. This site has no backend and ships no token,
 * so that route is closed.
 *
 * `GET /repos/{owner}/{repo}/stats/commit_activity` is the way through. It is
 * REST, it works unauthenticated, and it returns 52 weeks of DAILY commit
 * counts per repository. Summing it across a handful of repositories gives a
 * real year-long calendar built from real data, rather than an embedded image
 * from a third-party widget service.
 *
 * Everything here is pure. The fetching, retrying and caching live in
 * githubContributions.ts, so this module can be tested without a network or a
 * DOM.
 */

/** One week as GitHub returns it: `week` is the Unix timestamp of its Sunday. */
export type CommitActivityWeek = {
  week: number;
  /** Seven entries, Sunday through Saturday. */
  days: number[];
  total: number;
};

/** 0 is an empty day; 4 is the busiest band. */
export type ContributionLevel = 0 | 1 | 2 | 3 | 4;

export type ContributionDay = {
  /** YYYY-MM-DD, UTC. */
  date: string;
  count: number;
  level: ContributionLevel;
};

const DAY_SECONDS = 86_400;

/** UTC date key. Deliberately not locale-formatted: this is an identity, not display text. */
function isoDate(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toISOString().slice(0, 10);
}

/**
 * Sums each calendar day across every repository.
 *
 * Days with no commits are omitted rather than stored as zero. A year is mostly
 * empty, and `buildCalendar` fills the gaps anyway — storing them here would
 * make the map 364 entries wide for someone with three commits.
 */
export function mergeCommitActivity(repos: CommitActivityWeek[][]): Map<string, number> {
  const byDate = new Map<string, number>();

  for (const weeks of repos) {
    for (const week of weeks) {
      week.days.forEach((count, dayIndex) => {
        if (count <= 0) {
          return;
        }
        const key = isoDate(week.week + dayIndex * DAY_SECONDS);
        byDate.set(key, (byDate.get(key) ?? 0) + count);
      });
    }
  }

  return byDate;
}

/**
 * Quartile boundaries of the ACTIVE days.
 *
 * Zeros are filtered out first, and that is the whole point: a year is mostly
 * empty days, so including them puts p25, p50 and p75 all at 0 and every day
 * with any activity lands on the brightest level — a graph that is either off
 * or maximally on.
 */
export function computeThresholds(counts: number[]): [number, number, number] {
  const active = counts.filter((c) => c > 0).sort((a, b) => a - b);
  if (active.length === 0) {
    return [0, 0, 0];
  }

  const at = (q: number) => active[Math.floor(q * (active.length - 1))];
  return [at(0.25), at(0.5), at(0.75)];
}

/**
 * Any day with at least one commit is at least level 1. That distinction — did
 * anything happen — matters more on the graph than any of the bands above it,
 * so a single commit must never render as an empty cell.
 */
export function levelFor(count: number, thresholds: [number, number, number]): ContributionLevel {
  if (count <= 0) {
    return 0;
  }
  if (count <= thresholds[0]) {
    return 1;
  }
  if (count <= thresholds[1]) {
    return 2;
  }
  if (count <= thresholds[2]) {
    return 3;
  }
  return 4;
}

/**
 * The full ordered calendar, one entry per day from the earliest week returned
 * to the last day of the latest, with no gaps — the renderer walks it directly
 * and must never have to reason about a missing date.
 */
export function buildCalendar(repos: CommitActivityWeek[][]): ContributionDay[] {
  const weekStarts = repos.flat().map((w) => w.week);
  if (weekStarts.length === 0) {
    return [];
  }

  const counts = mergeCommitActivity(repos);
  const thresholds = computeThresholds([...counts.values()]);

  const first = Math.min(...weekStarts);
  // Through the Saturday of the last week, so the final week is never truncated.
  const last = Math.max(...weekStarts) + 6 * DAY_SECONDS;

  const days: ContributionDay[] = [];
  for (let t = first; t <= last; t += DAY_SECONDS) {
    const date = isoDate(t);
    const count = counts.get(date) ?? 0;
    days.push({ date, count, level: levelFor(count, thresholds) });
  }

  return days;
}

/** Totals for the summary line above the graph. */
export function summarise(days: ContributionDay[]): {
  total: number;
  activeDays: number;
  busiestDay: ContributionDay | null;
  currentStreak: number;
} {
  let total = 0;
  let activeDays = 0;
  let busiestDay: ContributionDay | null = null;

  for (const day of days) {
    total += day.count;
    if (day.count > 0) {
      activeDays += 1;
      if (!busiestDay || day.count > busiestDay.count) {
        busiestDay = day;
      }
    }
  }

  // Counted backwards from the most recent day, which is what "current" means.
  let currentStreak = 0;
  for (let i = days.length - 1; i >= 0; i -= 1) {
    if (days[i].count === 0) {
      break;
    }
    currentStreak += 1;
  }

  return { total, activeDays, busiestDay, currentStreak };
}

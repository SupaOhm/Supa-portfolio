import { describe, expect, it } from 'vitest';
import {
  buildCalendar,
  computeThresholds,
  levelFor,
  mergeCommitActivity,
  RECENT_WEEKS,
  takeRecentWeeks,
  type CommitActivityWeek,
} from './contributions';

/**
 * GitHub's /stats/commit_activity returns 52 entries, each a week whose `week`
 * field is the Unix timestamp of its Sunday and whose `days` array runs Sunday
 * to Saturday. Every fixture here mirrors that shape exactly, because the whole
 * module exists to turn that specific shape into a calendar.
 */
const WEEK = 604_800;
const DAY = 86_400;
/** 2026-01-04T00:00:00Z, a Sunday. */
const SUNDAY = 1_767_484_800;

const week = (start: number, days: number[]): CommitActivityWeek => ({
  week: start,
  days,
  total: days.reduce((a, b) => a + b, 0),
});

describe('mergeCommitActivity', () => {
  it('sums the same day across repos', () => {
    // The point of the module: one day's contribution count is the sum of that
    // day's commits in every repo, not the count from whichever repo answered.
    const a = [week(SUNDAY, [1, 0, 2, 0, 0, 0, 0])];
    const b = [week(SUNDAY, [3, 0, 0, 4, 0, 0, 0])];

    const merged = mergeCommitActivity([a, b]);

    expect(merged.get('2026-01-04')).toBe(4);
    expect(merged.get('2026-01-06')).toBe(2);
    expect(merged.get('2026-01-07')).toBe(4);
  });

  it('keeps days that only one repo has', () => {
    const a = [week(SUNDAY, [5, 0, 0, 0, 0, 0, 0])];
    const b = [week(SUNDAY + WEEK, [0, 7, 0, 0, 0, 0, 0])];

    const merged = mergeCommitActivity([a, b]);

    expect(merged.get('2026-01-04')).toBe(5);
    expect(merged.get('2026-01-12')).toBe(7);
  });

  it('omits days with no commits rather than storing zeros', () => {
    // buildCalendar fills the gaps. Storing every empty day here would make the
    // map 364 entries wide for a user with three commits.
    const merged = mergeCommitActivity([[week(SUNDAY, [0, 0, 1, 0, 0, 0, 0])]]);

    expect(merged.size).toBe(1);
    expect(merged.has('2026-01-04')).toBe(false);
  });

  it('survives a repo that returned no weeks', () => {
    // A repo with no commits in the last year returns []. A repo still being
    // computed by GitHub is dropped upstream, but an empty array reaches here.
    const merged = mergeCommitActivity([[], [week(SUNDAY, [2, 0, 0, 0, 0, 0, 0])]]);

    expect(merged.get('2026-01-04')).toBe(2);
  });
});

describe('computeThresholds', () => {
  it('splits the non-zero counts into quartiles', () => {
    const thresholds = computeThresholds([1, 2, 3, 4, 5, 6, 7, 8]);

    expect(thresholds).toHaveLength(3);
    expect(thresholds[0]).toBeLessThanOrEqual(thresholds[1]);
    expect(thresholds[1]).toBeLessThanOrEqual(thresholds[2]);
  });

  it('ignores zeros, which would otherwise drag every threshold to 1', () => {
    // A year is mostly empty days. Including them puts p25/p50/p75 all at 0 and
    // every active day lands on the brightest level.
    const withZeros = computeThresholds([0, 0, 0, 0, 1, 4, 9, 16]);
    const withoutZeros = computeThresholds([1, 4, 9, 16]);

    expect(withZeros).toEqual(withoutZeros);
  });

  it('still returns three thresholds when every active day is identical', () => {
    // Quantiles of [3,3,3] are all 3. The levels collapse, which is correct --
    // there is genuinely no variation to show -- but the shape must hold.
    expect(computeThresholds([3, 3, 3])).toEqual([3, 3, 3]);
  });

  it('returns zeros when there is no activity at all', () => {
    expect(computeThresholds([])).toEqual([0, 0, 0]);
  });
});

describe('levelFor', () => {
  const thresholds: [number, number, number] = [1, 3, 6];

  it('gives an empty day level 0', () => {
    expect(levelFor(0, thresholds)).toBe(0);
  });

  it('gives any day with a commit at least level 1', () => {
    // The distinction that matters most on the graph is "did anything happen",
    // so a single commit must never render as an empty cell.
    expect(levelFor(1, thresholds)).toBe(1);
  });

  it('climbs through the thresholds', () => {
    expect(levelFor(2, thresholds)).toBe(2);
    expect(levelFor(3, thresholds)).toBe(2);
    expect(levelFor(5, thresholds)).toBe(3);
    expect(levelFor(20, thresholds)).toBe(4);
  });

  it('never exceeds level 4', () => {
    expect(levelFor(9_999, thresholds)).toBe(4);
  });
});

describe('buildCalendar', () => {
  const threeWeeks = [
    week(SUNDAY, [1, 0, 0, 0, 0, 0, 0]),
    week(SUNDAY + WEEK, [0, 0, 5, 0, 0, 0, 0]),
    week(SUNDAY + 2 * WEEK, [0, 0, 0, 0, 0, 0, 9]),
  ];

  it('returns one entry per day with no gaps', () => {
    const days = buildCalendar([threeWeeks]);

    expect(days).toHaveLength(21);
    for (let i = 1; i < days.length; i += 1) {
      const prev = Date.parse(`${days[i - 1].date}T00:00:00Z`);
      const curr = Date.parse(`${days[i].date}T00:00:00Z`);
      expect(curr - prev).toBe(DAY * 1000);
    }
  });

  it('carries the counts through to the right dates', () => {
    const days = buildCalendar([threeWeeks]);
    const byDate = new Map(days.map((d) => [d.date, d.count]));

    expect(byDate.get('2026-01-04')).toBe(1);
    expect(byDate.get('2026-01-13')).toBe(5);
    expect(byDate.get('2026-01-24')).toBe(9);
  });

  it('fills untouched days with a zero count at level 0', () => {
    const days = buildCalendar([threeWeeks]);
    const quiet = days.find((d) => d.date === '2026-01-05');

    expect(quiet).toEqual({ date: '2026-01-05', count: 0, level: 0 });
  });

  it('assigns the busiest day the top level', () => {
    const days = buildCalendar([threeWeeks]);
    const busiest = days.find((d) => d.date === '2026-01-24');

    expect(busiest?.level).toBe(4);
  });

  it('returns an empty calendar rather than throwing when every repo is empty', () => {
    expect(buildCalendar([[], []])).toEqual([]);
  });
});

describe('daylight-saving drift in GitHub week timestamps', () => {
  // Not hypothetical: the live response for this account carries two distinct
  // within-day offsets, 00:00 UTC and 23:00 UTC the previous Saturday, because
  // `week` is midnight Sunday in the repository's timezone and that zone's UTC
  // offset changes mid-year. Taken literally it splits the calendar's weekday
  // rows across a season boundary.
  const SATURDAY_2300 = SUNDAY - 3600;

  it('puts day 0 on a Sunday whichever side of the boundary a week falls on', () => {
    const days = buildCalendar([
      [week(SATURDAY_2300, [3, 0, 0, 0, 0, 0, 0]), week(SUNDAY + WEEK, [7, 0, 0, 0, 0, 0, 0])],
    ]);
    const weekdayOf = (date: string) => new Date(`${date}T00:00:00Z`).getUTCDay();
    const active = days.filter((d) => d.count > 0);

    expect(active).toHaveLength(2);
    expect(active.map((d) => weekdayOf(d.date))).toEqual([0, 0]);
  });

  it('keeps the calendar a whole number of weeks despite the offset', () => {
    // The renderer columns the array with slice(i, i + 7) from index 0. An
    // offset start makes the run 365 days rather than 364, and every column
    // after the first then holds the wrong seven days.
    const days = buildCalendar([
      [week(SATURDAY_2300, [1, 0, 0, 0, 0, 0, 0]), week(SUNDAY + 3 * WEEK, [1, 0, 0, 0, 0, 0, 0])],
    ]);

    expect(days).toHaveLength(28);
    expect(new Date(`${days[0].date}T00:00:00Z`).getUTCDay()).toBe(0);
  });

  it('still sums a day that two repos report from opposite sides of the boundary', () => {
    // Without normalisation these are two different date keys and the day's
    // count is split in half across two cells.
    const counts = mergeCommitActivity([
      [week(SATURDAY_2300, [2, 0, 0, 0, 0, 0, 0])],
      [week(SUNDAY, [5, 0, 0, 0, 0, 0, 0])],
    ]);

    expect(counts.get('2026-01-04')).toBe(7);
    expect(counts.size).toBe(1);
  });
});

describe('takeRecentWeeks', () => {
  /** A full year of Sundays, one commit on the Sunday of every week. */
  const year = buildCalendar([
    Array.from({ length: 52 }, (_, i) => week(SUNDAY + i * WEEK, [i + 1, 0, 0, 0, 0, 0, 0])),
  ]);

  it('keeps only the requested number of weeks', () => {
    expect(year).toHaveLength(364);
    expect(takeRecentWeeks(year)).toHaveLength(RECENT_WEEKS * 7);
  });

  it('keeps the END of the calendar, not the start', () => {
    // "Recent" is the whole requirement. Slicing from the front would pass a
    // length assertion while showing a visitor the oldest quarter on record.
    const recent = takeRecentWeeks(year);

    expect(recent[recent.length - 1]).toEqual(year[year.length - 1]);
    expect(recent[0].date).toBe(year[year.length - RECENT_WEEKS * 7].date);
  });

  it('starts the window on the same weekday the full calendar starts on', () => {
    // The renderer columns the array with slice(i, i + 7) from index 0, so a
    // window that is not a whole number of weeks puts every day in the wrong
    // row. Nothing throws if that happens -- the grid just lies.
    const recent = takeRecentWeeks(year);
    const weekdayOf = (date: string) => new Date(`${date}T00:00:00Z`).getUTCDay();

    expect(recent.length % 7).toBe(0);
    expect(weekdayOf(recent[0].date)).toBe(weekdayOf(year[0].date));
  });

  it('re-bands the window against itself rather than against the whole year', () => {
    // The reason this function re-levels at all. Across the full year the last
    // thirteen Sundays (counts 40-52) are all top-quartile, so every one of
    // them arrives at level 4 and the window renders as a flat maximum. Banded
    // against the window, they spread back across the ramp.
    const before = year.filter((d) => d.count > 0).slice(-RECENT_WEEKS);
    expect(new Set(before.map((d) => d.level))).toEqual(new Set([4]));

    const after = takeRecentWeeks(year).filter((d) => d.count > 0);
    expect(new Set(after.map((d) => d.level)).size).toBeGreaterThan(1);
  });

  it('leaves counts and dates untouched', () => {
    const recent = takeRecentWeeks(year);
    const source = new Map(year.map((d) => [d.date, d.count]));

    for (const day of recent) {
      expect(day.count).toBe(source.get(day.date));
    }
  });

  it('returns the whole calendar when it is shorter than the window', () => {
    // A new account, or a repo GitHub has only just started counting.
    const short = buildCalendar([[week(SUNDAY, [1, 0, 0, 0, 0, 0, 0])]]);

    expect(takeRecentWeeks(short)).toHaveLength(7);
  });

  it('returns an empty window for an empty calendar', () => {
    expect(takeRecentWeeks([])).toEqual([]);
  });
});

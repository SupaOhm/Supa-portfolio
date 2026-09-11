import { useMemo } from 'react';
import { summarise, type ContributionDay, type ContributionLevel } from '../lib/contributions';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';

/**
 * An isometric contribution graph, built from real commit data.
 *
 * The 3D is CSS, not WebGL: the whole plate is rotated once with
 * `rotateX/rotateZ` under `transform-style: preserve-3d`, and each active day
 * is lifted along Z in proportion to its level. That keeps it to one composited
 * layer with no runtime dependency, no canvas and no shader — and it still
 * degrades to a readable flat grid wherever 3D transforms are unavailable.
 */

/** Column height in px per level. Level 0 stays flat so empty days read as ground. */
const LIFT: Record<ContributionLevel, number> = { 0: 0, 1: 5, 2: 11, 3: 19, 4: 30 };

/**
 * GitHub's own dark-theme contribution ramp, used verbatim.
 *
 * An earlier version used blue, on the reasoning that the hero already has one
 * accent and a second hue would make the page look assembled out of widgets.
 * That reasoning loses to recognition: this shape IS the GitHub contribution
 * graph, and green is the thing that says so at a glance, before anyone reads
 * the number underneath it. Borrowing the exact values rather than
 * approximating them is what keeps it from looking like a near-miss.
 */
const FACE: Record<ContributionLevel, string> = {
  0: 'rgba(255,255,255,0.085)',
  1: '#0e4429',
  2: '#006d32',
  3: '#26a641',
  4: '#39d353',
};

/**
 * The lit top of a column reads as a separate face from its side. Each side is
 * roughly a third of the way from its face colour to black -- enough contrast
 * to read as a solid volume, not so much that the columns look outlined.
 */
const SIDE: Record<ContributionLevel, string> = {
  0: 'transparent',
  1: '#072a19',
  2: '#00461f',
  3: '#166b29',
  4: '#228a37',
};

const CELL = 9;
const GAP = 2.5;

/**
 * Isometric-ish rather than true isometric: a shallower X angle stops the later
 * weeks hiding behind the earlier ones.
 */
const PLATE_TRANSFORM = 'rotateX(58deg) rotateZ(-42deg) translateZ(-40px)';

/**
 * The backdrop lies flatter and turns less than the inline figure. At the
 * inline angle the plate cuts a steep diagonal across the composition and
 * fights the centred headline; this spreads it along the width instead.
 */
const BACKDROP_TRANSFORM = 'rotateX(64deg) rotateZ(-28deg) translateZ(-40px)';

export type ContributionGraphProps = {
  days: ContributionDay[];
  loading?: boolean;
  className?: string;
  /**
   * `inline` is a self-contained figure: summary line, plate, legend.
   *
   * `background` is the same plate used as wallpaper — much larger, faded and
   * inert, with the chrome stripped. The summary belongs in the foreground in
   * that mode, because a statistic nobody can read is not a statistic.
   */
  variant?: 'inline' | 'background';
};

export default function ContributionGraph({
  days,
  loading = false,
  className = '',
  variant = 'inline',
}: ContributionGraphProps) {
  const reducedMotion = usePrefersReducedMotion();
  const isBackground = variant === 'background';

  const { weeks, stats } = useMemo(() => {
    // Seven rows per column, Sunday first — the same shape GitHub's own
    // calendar uses, so the graph reads the way a visitor expects.
    const grouped: ContributionDay[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      grouped.push(days.slice(i, i + 7));
    }
    return { weeks: grouped, stats: summarise(days) };
  }, [days]);

  const plate = weeks.map((week, w) => (
    <div key={week[0]?.date ?? w} style={{ transformStyle: 'preserve-3d' }}>
      {week.map((day, d) => {
        const lift = LIFT[day.level];
        return (
          <div
            key={day.date}
            // No tooltip in background mode: the plate is decoration there, and
            // a hover target behind the headline would be a trap, not a feature.
            title={
              isBackground
                ? undefined
                : `${day.date}: ${day.count} commit${day.count === 1 ? '' : 's'}`
            }
            style={{
              position: 'absolute',
              left: w * (CELL + GAP),
              top: d * (CELL + GAP),
              width: CELL,
              height: CELL,
              background: FACE[day.level],
              borderRadius: 1.5,
              transformStyle: 'preserve-3d',
              transform: `translateZ(${lift}px)`,
              // The side face. One shadow along two edges reads as a solid
              // column at this scale and costs nothing next to six real faces
              // per day, of which there would be 2,184.
              boxShadow:
                lift > 0
                  ? `0 ${lift * 0.5}px 0 ${SIDE[day.level]}, ${lift * 0.4}px 0 0 ${SIDE[day.level]}`
                  : 'none',
              transition: reducedMotion
                ? undefined
                : `transform 600ms cubic-bezier(0.4,0,0.2,1) ${Math.min(w * 8, 420)}ms`,
            }}
          />
        );
      })}
    </div>
  ));

  if (isBackground) {
    if (days.length === 0) {
      return null;
    }
    return (
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      >
        <div
          className="absolute top-1/2 left-1/2"
          style={{
            width: weeks.length * (CELL + GAP),
            height: 260,
            perspective: 1400,
            // Deliberately overflows the viewport: a backdrop that ends inside
            // the frame reads as a picture of a graph rather than as depth.
            // translate(-50%,-50%) centres the LAYOUT box, and a rotated
            // element's visual mass is not centred on its layout box -- at
            // rotateZ(-42deg) the plate's weight fell into the left half of the
            // screen. The offsets here are the correction, set by eye against
            // the centred headline rather than derived -- there is no formula
            // for where a rotated plate's visual weight lands.
            //
            // The Y offset is well short of centred on purpose. At -46% the
            // plate's upper edge rose behind the fixed navbar on a short
            // viewport, which read as the background leaking out of its
            // section. Sitting it lower keeps the terrain under the headline
            // and the panels, where it belongs.
            transform: 'translate(-44%, -24%) scale(2.6)',
            transformOrigin: 'center',
            // Faded on both axes, because the plate runs diagonally. Without
            // this its hard edges cut across the headline sitting on top.
            maskImage:
              'radial-gradient(ellipse 96% 90% at 50% 50%, rgba(0,0,0,1), transparent 99%)',
            WebkitMaskImage:
              'radial-gradient(ellipse 96% 90% at 50% 50%, rgba(0,0,0,1), transparent 99%)',
            opacity: 1,
          }}
        >
          <div style={{ transformStyle: 'preserve-3d', transform: BACKDROP_TRANSFORM }}>
            {plate}
          </div>
        </div>
      </div>
    );
  }

  if (!loading && days.length === 0) {
    // Rate-limited, offline, or a brand-new account. Say so plainly rather than
    // rendering an empty plate that looks like a year of no work.
    return (
      <p className={`text-[13px] text-[#6e6e73] ${className}`}>
        Contribution data unavailable right now.
      </p>
    );
  }

  return (
    <div className={className}>
      <div className="mb-4 flex flex-wrap items-baseline justify-center gap-x-6 gap-y-1 text-[13px] text-[#86868b]">
        <span>
          <span className="font-semibold text-[#f5f5f7]">{stats.total.toLocaleString()}</span>{' '}
          commits in the last year
        </span>
        <span>
          <span className="font-semibold text-[#f5f5f7]">{stats.activeDays}</span> active days
        </span>
        {stats.busiestDay && (
          <span>
            busiest <span className="font-semibold text-[#f5f5f7]">{stats.busiestDay.count}</span>{' '}
            in a day
          </span>
        )}
      </div>

      {/* Wider than most phones, so it scrolls inside its own box rather than
          pushing the page sideways. */}
      <div className="overflow-x-auto overflow-y-hidden pb-2">
        <div
          className="mx-auto"
          style={{
            width: weeks.length * (CELL + GAP),
            // 240/137 are measured, not guessed. At 250/78 the rotated plate
            // rendered 59px ABOVE its container and left 69px of dead space
            // below it, which is what made it look like it was floating in a
            // gap. A rotated element's painted bounds are not its layout box,
            // so the offset has to come from measuring real client rects.
            height: 240,
            perspective: 1100,
          }}
        >
          <div
            role="img"
            aria-label={`Contribution graph: ${stats.total} commits across ${stats.activeDays} active days in the last year`}
            style={{
              transformStyle: 'preserve-3d',
              transform: PLATE_TRANSFORM,
              transformOrigin: '50% 45%',
              marginTop: 137,
            }}
          >
            {plate}
          </div>
        </div>
      </div>

      <div className="mt-1 flex items-center justify-center gap-2 text-[11px] text-[#6e6e73]">
        <span>Less</span>
        {([0, 1, 2, 3, 4] as ContributionLevel[]).map((level) => (
          <span
            key={level}
            aria-hidden="true"
            className="inline-block h-2.5 w-2.5 rounded-[2px]"
            style={{ background: FACE[level] }}
          />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}

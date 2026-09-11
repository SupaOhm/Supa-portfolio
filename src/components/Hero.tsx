import { useLocation, useNavigate } from 'react-router-dom';
import { useCursorGlow } from '../hooks/useCursorGlow';
import { useGitHubProfile } from '../hooks/useGitHubProfile';
import { useContributions } from '../hooks/useContributions';
import ContributionGraph from './ContributionGraph';
import { summarise } from '../lib/contributions';
import { currentScrollBehavior } from '../lib/scrollBehavior';
import {
  ACADEMIC_YEAR,
  AWARD,
  EXPECTED_GRADUATION,
  FULL_NAME,
  INSTITUTION,
  LOCATION,
  PAPER_TITLE,
  GITHUB_USERNAME,
  PROGRAM,
  VENUE,
} from '../data/profile';
import { PROJECTS } from '../data/projects';

/**
 * Apple's dark palette rather than Tailwind's grays: #000 ground, #f5f5f7 for
 * primary text, #86868b for secondary, #1d1d1f for raised panels, #2997ff for
 * links. Tailwind's gray-900/950 are blue-tinted and read as "generic dark
 * theme"; these are the actual values the look depends on, so they are written
 * literally rather than approximated with the nearest utility.
 */
/* Panels are a vertical gradient rather than a flat fill, with a hairline ring
   that brightens on hover and a gradient highlight along the top edge -- the
   detail Apple uses to make a dark card read as lit from above rather than as
   a grey rectangle. */
const PANEL =
  'group/panel relative overflow-hidden rounded-[18px] p-7 text-left ' +
  'bg-linear-to-b from-[#1d1d1f] to-[#161618] ' +
  'ring-1 ring-white/[0.06] transition-[box-shadow,--tw-ring-color] duration-300 ' +
  'hover:ring-white/[0.14]';
const PANEL_LABEL = 'text-[13px] font-semibold tracking-[-0.01em] text-[#86868b]';

/**
 * Apple's inline call to action: a blue text link with a chevron that nudges on
 * hover. Not a filled button -- those are reserved for the one primary action
 * on an Apple page, and this hero has two equal ones.
 *
 * py-3 -my-3 plus min-h-11 gives a 44px target without moving the baseline.
 */
const LINK =
  'group inline-flex items-center gap-1 py-3 -my-3 min-h-11 text-[17px] ' +
  'text-[#2997ff] hover:underline underline-offset-4 ' +
  'focus:outline-hidden focus:ring-2 focus:ring-[#2997ff] focus:ring-offset-2 focus:ring-offset-black';

const FEATURED = PROJECTS.slice(0, 3);

export default function Hero() {
  const location = useLocation();
  const navigate = useNavigate();

  // Matches Navbar: navigate to '/' then scroll, or just scroll if already on '/'.
  const handleSectionClick = (id: string) => {
    if (location.pathname !== '/') {
      navigate('/', { state: { targetId: id } });
    } else {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: currentScrollBehavior() });
      }
    }
  };

  const handleMouseMove = useCursorGlow();

  /**
   * The profile fetch is shared with About and Connect through githubCache, so
   * mounting it here costs no additional request -- and it is what supplies the
   * repository list the contribution graph reads.
   */
  const { profile } = useGitHubProfile(GITHUB_USERNAME);
  const { days } = useContributions(GITHUB_USERNAME, profile?.recentRepoNames);
  const contributionStats = days.length > 0 ? summarise(days) : null;

  return (
    <section
      id="home"
      aria-labelledby="hero-heading"
      onMouseMove={handleMouseMove}
      // Centred rather than left-aligned: Apple anchors a hero on the vertical
      // axis and lets the margins do the work. min-h-dvh, not min-h-screen --
      // mobile reports 100vh without the collapsing URL bar.
      //
      // isolate so the -z-10 gradient layers below stay behind this section's
      // own content without escaping behind the page background.
      className="font-system relative isolate flex min-h-dvh flex-col justify-center overflow-hidden bg-black px-6 pt-24 pb-16"
    >
      {/* The contribution plate, as the deepest layer on the page. Real commit
          data rendered as terrain rather than as an embedded widget image, then
          pushed behind the gradient wash so it reads as depth instead of as a
          chart someone put in the background. */}
      <ContributionGraph variant="background" days={days} className="-z-20" />

      {/* Legibility scrim, sitting between the plate and the text.
          Measured with the text layer hidden, so the samples are the backdrop
          rather than the glyphs: without this, the subhead sits at 4.71:1
          against the brightest cells behind it; with it, 6.92:1. WCAG AA asks
          4.5:1 for body text, so the plate alone was PASSING -- by 0.21.

          That margin is the point. Which cells land under which words changes
          every time the commit data does, so a snapshot that clears AA by a
          rounding error is not a result you can rely on next month.

          Deliberately tight and centred on the copy rather than a full-section
          overlay, so the terrain stays at full strength everywhere it is not
          sitting under text. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-[15] bg-[radial-gradient(ellipse_44%_30%_at_50%_38%,rgba(0,0,0,0.88),rgba(0,0,0,0.55)_55%,transparent_78%)]"
      />

      {/* Ambient wash: two large, low-opacity radial blobs. Desaturated and
          under 0.2 alpha on purpose -- a saturated blue-to-purple wash is the
          single most recognisable generated-portfolio background, and the
          difference between atmosphere and that is entirely opacity. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-[15%] left-1/2 h-[620px] w-[1000px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(41,151,255,0.17),transparent)] blur-3xl" />
        <div className="absolute -bottom-[20%] right-[2%] h-[560px] w-[780px] rounded-full bg-[radial-gradient(closest-side,rgba(148,109,255,0.14),transparent)] blur-3xl" />
        <div className="absolute -bottom-[10%] left-[4%] h-[420px] w-[620px] rounded-full bg-[radial-gradient(closest-side,rgba(0,209,255,0.08),transparent)] blur-3xl" />
      </div>

      {/* Cursor spotlight. useCursorGlow eases toward the pointer rather than
          tracking it exactly, and returns a no-op under prefers-reduced-motion,
          so this costs nothing for a user who has asked for stillness.
          mix-blend-screen lets it brighten the wash beneath instead of
          stacking another opaque layer on top of it. */}
      <div
        aria-hidden="true"
        className="cursor-glow pointer-events-none -z-10 h-[680px] w-[680px] rounded-full bg-[radial-gradient(closest-side,rgba(41,151,255,0.20),rgba(148,109,255,0.10),transparent)] blur-2xl mix-blend-screen"
      />

      <div className="relative z-10 mx-auto w-full max-w-[980px] text-center">
        {/* Apple's eyebrow: small, semibold, coloured, sitting tight above the
            headline rather than floating as a separate band. */}
        <p className="animate-rise text-[17px] font-semibold tracking-[-0.01em] text-[#2997ff]">
          {PROGRAM}
        </p>

        {/* The headline is the name, set at Apple's display proportions:
            semibold rather than black, tight negative tracking, line-height
            barely above 1. The weight is what keeps it from shouting -- an
            800-weight name at this size reads as a poster, not a product. */}
        <h1
          id="hero-heading"
          className="animate-rise mt-2 text-[clamp(2.75rem,7vw,5rem)] font-semibold leading-[1.05] tracking-[-0.03em] text-[#f5f5f7]"
          style={{ animationDelay: '60ms' }}
        >
          {FULL_NAME}
        </h1>

        <p
          // text-balance so the subhead splits into even lines instead of
          // leaving a one-word orphan on the last one, which is the detail that
          // separates an Apple subhead from a paragraph that happens to be
          // centred.
          className="animate-rise mx-auto mt-5 max-w-[40rem] text-[19px] leading-[1.42] text-balance text-[#a1a1a6] sm:text-[21px]"
          style={{ animationDelay: '120ms' }}
        >
          Security and retrieval systems &mdash; intrusion detection, RAG
          pipelines &mdash; and the measurements that show whether they work.
        </p>

        <div
          className="animate-rise mt-7 flex flex-wrap items-center justify-center gap-x-8 gap-y-2"
          style={{ animationDelay: '180ms' }}
        >
          <button type="button" onClick={() => handleSectionClick('projects')} className={LINK}>
            See the work
            <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">
              &rsaquo;
            </span>
          </button>
          <button type="button" onClick={() => handleSectionClick('connect')} className={LINK}>
            Get in touch
            <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">
              &rsaquo;
            </span>
          </button>
        </div>

        {/* Three raised panels, Apple's feature-tile grid. Labels are <p>, not
            headings: three h2s inside the hero would sit ahead of every section
            heading on the assembled page. Hero.test.tsx asserts that. */}
        <div
          className="animate-rise mt-14 grid grid-cols-1 gap-3 sm:grid-cols-3"
          style={{ animationDelay: '240ms' }}
        >
          <div className={PANEL}>
            <span
              aria-hidden="true"
              className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/25 to-transparent"
            />
            <p className={PANEL_LABEL}>Recognition</p>
            <p className="mt-2 text-[21px] leading-tight font-semibold tracking-[-0.02em] text-[#f5f5f7]">
              {AWARD}
            </p>
            <p className="mt-1 text-[15px] text-[#86868b]">{VENUE}</p>
            <button
              type="button"
              onClick={() => handleSectionClick('projects')}
              className={`${LINK} mt-2 text-[15px]`}
            >
              {PAPER_TITLE}
              <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">
                &rsaquo;
              </span>
            </button>
          </div>

          <div className={PANEL}>
            <span
              aria-hidden="true"
              className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/25 to-transparent"
            />
            <p className={PANEL_LABEL}>Selected work</p>
            <p className="mt-2 text-[21px] leading-tight font-semibold tracking-[-0.02em] text-[#f5f5f7]">
              {PROJECTS.length} projects
            </p>
            <ul className="mt-2 space-y-1">
              {FEATURED.map((project) => (
                <li
                  key={project.id}
                  className="truncate text-[15px] text-[#86868b]"
                  title={project.title}
                >
                  {project.title.split(' - ')[0]}
                </li>
              ))}
            </ul>
          </div>

          <div className={PANEL}>
            <span
              aria-hidden="true"
              className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/25 to-transparent"
            />
            <p className={PANEL_LABEL}>Availability</p>
            <p className="mt-2 text-[21px] leading-tight font-semibold tracking-[-0.02em] text-[#f5f5f7]">
              Open to SWE internships
            </p>
            {/* Each fact in its own element: they come from profile.ts and
                Hero.test.tsx looks each one up by exact text. */}
            <div className="mt-2 text-[15px] text-[#86868b]">
              <p>{ACADEMIC_YEAR}</p>
              <p>{INSTITUTION}</p>
              <p>Graduating {EXPECTED_GRADUATION}</p>
            </div>
          </div>
        </div>

        {/* The plate itself is wallpaper, so the numbers it encodes live here,
            in the foreground, where they can actually be read. */}
        {contributionStats && (
          <p
            className="animate-rise mt-12 text-[13px] text-[#86868b]"
            style={{ animationDelay: '300ms' }}
          >
            <span className="font-semibold text-[#f5f5f7]">
              {contributionStats.total.toLocaleString()}
            </span>{' '}
            commits across{' '}
            <span className="font-semibold text-[#f5f5f7]">{contributionStats.activeDays}</span>{' '}
            active days in the last year
          </p>
        )}

        <p className="animate-rise mt-10 text-[13px] text-[#6e6e73]" style={{ animationDelay: '360ms' }}>
          {LOCATION}
        </p>
      </div>
    </section>
  );
}

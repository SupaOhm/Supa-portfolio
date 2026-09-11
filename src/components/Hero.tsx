import { useLocation, useNavigate } from 'react-router-dom';
import { currentScrollBehavior } from '../lib/scrollBehavior';
import {
  ACADEMIC_YEAR,
  AWARD,
  EXPECTED_GRADUATION,
  FULL_NAME,
  INSTITUTION,
  LOCATION,
  PAPER_TITLE,
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
const PANEL = 'rounded-[18px] bg-[#1d1d1f] p-7 text-left';
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

  return (
    <section
      id="home"
      aria-labelledby="hero-heading"
      // Centred rather than left-aligned: Apple anchors a hero on the vertical
      // axis and lets the margins do the work. min-h-dvh, not min-h-screen --
      // mobile reports 100vh without the collapsing URL bar.
      className="font-system relative flex min-h-dvh flex-col justify-center overflow-x-clip bg-black px-6 pt-24 pb-16"
    >
      <div className="mx-auto w-full max-w-[980px] text-center">
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
          className="animate-rise mx-auto mt-5 max-w-[40rem] text-[19px] leading-[1.42] text-balance text-[#86868b] sm:text-[21px]"
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

        <p className="animate-rise mt-10 text-[13px] text-[#6e6e73]" style={{ animationDelay: '300ms' }}>
          {LOCATION}
        </p>
      </div>
    </section>
  );
}

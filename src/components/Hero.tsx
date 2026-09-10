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

/**
 * The nameplate sets each word as its own block below `md` and inline from `md`
 * up, so the same markup gives a two-line and a one-line masthead without a
 * <br>. Split from FULL_NAME rather than typed out, so the name has one source.
 */
const [FIRST_NAME, LAST_NAME] = FULL_NAME.split(' ');

/**
 * Inline links replace the old padded CTA buttons. `py-3 -my-3` keeps the
 * band's rhythm unchanged (it adds padding without moving the text baseline),
 * but padding alone does not guarantee 44px everywhere these links appear: in
 * the footer the surrounding `band-label` class sets an 11px font with no
 * line-height override, so the inherited 1.5 gives a ~16.5px line box and
 * padding alone lands around ~40px, not 44. `min-h-11` (2.75rem = 44px) is
 * what actually guarantees 44px at both call sites -- the padding-only band
 * usage and the footer's smaller-type usage alike. No test enforces this;
 * jsdom performs no layout, so nothing here is measurable from the suite.
 */
const LINK_CLASS =
  'inline-flex items-baseline gap-2 py-3 -my-3 min-h-11 text-blue-400 ' +
  'hover:underline underline-offset-4 ' +
  'focus:outline-hidden focus:ring-2 focus:ring-blue-400';

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
      // min-h-dvh, not min-h-screen: mobile browsers report 100vh without the
      // collapsing URL bar, which pushes the footer row off-screen on first
      // paint. min-h- rather than h- so a short landscape viewport scrolls
      // instead of clipping.
      //
      // pt-16 / sm:pt-24 clear the fixed Navbar (top-0 + h-14 = 57px, then
      // sm:top-6 + sm:h-16 = 90px). Those are the same numbers scroll-padding-top
      // in index.css is built from, but this is an independent third copy —
      // scroll-offset.test.ts does not cover it.
      // overflow-x-clip, not overflow-hidden: it stops the nameplate widening
      // the page without creating a scroll container.
      //
      // This is not defensive padding, it is a measured failure. The nameplate
      // is sized from the real advance width of the name at font-stretch: 82%,
      // but font-stretch does nothing to the system-ui fallback, which shapes
      // materially wider. With the webfont blocked, 375px scrolled
      // horizontally. The old hero carried overflow-hidden and never hit this,
      // because it had no webfont to fail.
      className="relative flex min-h-dvh flex-col overflow-x-clip bg-[#030712] px-4 pt-16 pb-8 sm:px-6 sm:pt-24 lg:px-8"
    >
      {/* @container is what makes the nameplate's cqi units resolve against this
          box rather than the viewport. The box caps at 80rem. */}
      <div className="@container mx-auto flex w-full max-w-7xl flex-1 flex-col">
        <h1
          id="hero-heading"
          className="font-nameplate nameplate-two-line md:nameplate-one-line animate-rise text-gray-100"
        >
          <span className="block md:inline">{FIRST_NAME}</span>{' '}
          <span className="block md:inline">{LAST_NAME}</span>
        </h1>

        <hr className="mt-6 h-px border-0 bg-gray-800" />

        {/* Labels are <p>, not headings: three h2s here would put headings
            inside the hero ahead of every section heading on the assembled
            page. The guard is the level-2 assertion in Hero.test.tsx — the
            landmark tests only check that regions resolve by accessible name. */}
        <div
          className="font-band animate-rise mt-8 grid grid-cols-1 gap-8 text-[15px] leading-relaxed md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr]"
          style={{ animationDelay: '80ms' }}
        >
          {/* At md the paragraph column spans the full first row: three columns
              at 768px leave it ~14 characters a line. */}
          <div className="md:col-span-2 lg:col-span-1">
            <p className="band-label text-gray-500">What I do</p>
            <p className="mt-3 max-w-[34ch] text-gray-400">
              Security and retrieval systems &mdash; intrusion detection, RAG
              pipelines &mdash; and the measurements that show whether they work.
            </p>
          </div>

          <div>
            <p className="band-label text-gray-500">Recognition</p>
            <p className="mt-3 text-gray-400">
              <button
                type="button"
                onClick={() => handleSectionClick('projects')}
                className={LINK_CLASS}
              >
                <span aria-hidden="true">&rarr;</span>
                {PAPER_TITLE}
              </button>
              <span className="block">
                {AWARD}, {VENUE}
              </span>
            </p>
          </div>

          <div>
            <p className="band-label text-gray-500">Availability</p>
            <p className="mt-3 text-gray-400">Open to SWE internships.</p>
            <button
              type="button"
              onClick={() => handleSectionClick('connect')}
              className={`${LINK_CLASS} mt-3`}
            >
              <span aria-hidden="true">&rarr;</span>
              Get in touch
            </button>
            {/* Stacked rather than run into a sentence: INSTITUTION is itself
                'SIIT, Thammasat', and inlining it produces a comma pileup. */}
            <p className="mt-4 text-gray-400">
              <span className="block">{PROGRAM}</span>
              <span className="block">{ACADEMIC_YEAR}</span>
              <span className="block">{INSTITUTION}</span>
              <span className="block">Graduating {EXPECTED_GRADUATION}</span>
            </p>
          </div>
        </div>

        {/* mt-auto pins the footer to the bottom when there is slack and behaves
            as a plain margin when the content is taller than the viewport. */}
        <hr className="mt-auto h-px border-0 bg-gray-800" />
        <div className="band-label flex flex-wrap justify-between gap-x-6 gap-y-2 pt-4 text-gray-500">
          <button
            type="button"
            onClick={() => handleSectionClick('projects')}
            className={LINK_CLASS}
          >
            See the work
            <span aria-hidden="true">&darr;</span>
          </button>
          {/* inline-flex, not a bare span with py-3: vertical padding on a
              non-replaced inline element does not affect line box height, so
              py-3 alone would read as a touch-target fix that is not one. This
              has no hit area to grow — it is not interactive — it just needs to
              share the button's line box. */}
          <span className="inline-flex items-center">{LOCATION}</span>
        </div>
      </div>
    </section>
  );
}

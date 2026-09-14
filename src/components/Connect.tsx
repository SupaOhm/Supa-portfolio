import { useState, type ReactElement } from 'react';
import { useGitHubProfile } from '../hooks/useGitHubProfile';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import {
  ACCENT_BUTTON,
  LINK,
  PANEL,
  QUIET_BUTTON,
  SECTION_HUES,
  SECTION_RULE,
  STAT_LABEL,
  STAT_VALUE,
} from '../lib/surfaces';
import {
  EMAIL,
  EMAIL_HREF,
  GITHUB_AVATAR_URL,
  GITHUB_PROFILE_URL,
  GITHUB_USERNAME,
  LINKEDIN_HANDLE,
  LINKEDIN_URL,
  PHONE_DISPLAY,
  PHONE_HREF,
} from '../data/profile';

type ContactLink = {
  name: string;
  href: string;
  detail: string;
  icon: ReactElement;
};

const formatShortDate = (isoDate: string) =>
  new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(isoDate));

const CONTACT_LINKS: ContactLink[] = [
  {
    name: 'Phone',
    href: PHONE_HREF,
    detail: PHONE_DISPLAY,
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
      </svg>
    ),
  },
  {
    name: 'Email',
    href: EMAIL_HREF,
    detail: EMAIL,
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    name: 'GitHub',
    href: GITHUB_PROFILE_URL,
    detail: `@${GITHUB_USERNAME}`,
    icon: (
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
        <path fillRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    name: 'LinkedIn',
    href: LINKEDIN_URL,
    detail: LINKEDIN_HANDLE,
    icon: (
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
      </svg>
    ),
  },
];

export default function Connect() {
  const [hoveredLink, setHoveredLink] = useState<string | null>(null);
  const [showAllDetails, setShowAllDetails] = useState(false);
  const { profile: githubStats, isLoading: isGithubLoading } = useGitHubProfile(GITHUB_USERNAME);
  const reducedMotion = usePrefersReducedMotion();

  const handleLinkHover = (name: string | null) => {
    setHoveredLink(name);
  };

  return (
    <section
      id="connect"
      aria-labelledby="connect-heading"
      className={`font-system relative px-6 py-24 sm:px-8 lg:px-12 ${SECTION_HUES.violet}`}
    >
      {/* The blue-to-purple wash that sat behind this section is gone. It was
          the same three-stop gradient on About, Skills and Connect -- a
          backdrop identical across three sections is not atmosphere, it is a
          default nobody chose. */}
      <div className="relative z-10 mx-auto max-w-[980px]">
        <h2
          id="connect-heading"
          className="text-[clamp(1.75rem,3.5vw,2.5rem)] font-semibold tracking-[-0.02em] text-ink"
        >
          Get In Touch
        </h2>
        <div aria-hidden="true" className={SECTION_RULE} />
        <p className="mt-4 max-w-[58ch] text-[15px] leading-relaxed text-muted">
          I'm currently looking for internship opportunities. Whether you have a question or just want to say hi, feel
          free to reach out!
        </p>

        <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {CONTACT_LINKS.map((link, index) => (
            <div
              key={link.name}
              className="relative"
              onMouseEnter={() => handleLinkHover(link.name)}
              onMouseLeave={() => handleLinkHover(null)}
            >
              <a
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                /* The card grows with `transform: scale`, not width/height.
                   Animating width and height re-runs layout on every frame and
                   reflows the neighbouring cards with it, which is why the old
                   version read as a jump rather than a grow -- the browser was
                   snapping through intermediate layouts instead of easing.
                   Transform is composited, so this eases smoothly and leaves
                   the siblings where they are.

                   The transition names `scale`, not `transform`: Tailwind v4
                   emits scale-110 as the standalone `scale` property, so
                   transition-transform does not cover it and the card snaps to
                   full size on the first frame -- measured, not assumed.

                   The curve is cubic-bezier(0.4,0,0.2,1), not an easeOutQuint.
                   Measured frame by frame, the quint put half the growth in
                   the first 68ms of 500 -- technically a transition, but it
                   still reads as a snap that then settles. This one spends its
                   time in the middle, which is what makes the card look like
                   it is growing rather than arriving.

                   The size is therefore fixed and the detail line is always in
                   the DOM, revealed by opacity and height. It used to be a
                   conditional render, so the label was REPLACED on hover: the
                   box eased while its contents popped.

                   The grow itself is kept deliberately. A hover-scale is
                   normally a tell -- every card lifting for no reason -- but
                   this one was asked for, it reveals content that is otherwise
                   hidden, and the reveal is the point. What went is the
                   decoration that surrounded it: a blue-to-purple gradient
                   fill, a `shadow-blue-500/40` halo, a backdrop blur with
                   nothing behind it, and two cursor-tracking gradient blobs. */
                className={`group relative flex w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border px-4 py-3.5 ${
                  reducedMotion
                    ? ''
                    : 'transition-[scale,background-color,border-color] duration-[420ms] ease-[cubic-bezier(0.4,0,0.2,1)] will-change-[scale]'
                } focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--section-accent)] ${
                  hoveredLink === link.name
                    ? 'z-10 scale-110 border-[var(--section-accent)]/60 bg-[var(--section-tint)] text-ink'
                    : 'scale-100 border-rule/60 bg-paper-2 text-neutral'
                }`}
                style={{
                  animation: reducedMotion ? 'none' : `fadeIn 0.5s ease-out ${index * 80}ms both`,
                }}
              >
                <span
                  className={`relative z-10 ${
                    hoveredLink === link.name ? 'text-[var(--section-accent)]' : 'text-muted'
                  } ${reducedMotion ? '' : 'transition-colors duration-300'}`}
                >
                  {link.icon}
                </span>

                <span className="relative z-10 text-[13px] font-medium">{link.name}</span>

                {/* grid-template-rows 0fr -> 1fr is the one way to transition to
                    an element's natural height without hardcoding it. */}
                <span
                  className={`relative z-10 grid w-full ${
                    reducedMotion ? '' : 'transition-[grid-template-rows,opacity] duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]'
                  } ${
                    hoveredLink === link.name
                      ? 'grid-rows-[1fr] opacity-100'
                      : 'grid-rows-[0fr] opacity-0'
                  }`}
                >
                  {/* break-words, not truncate: the email is 24 characters and
                      the phone number carries non-breaking spaces so it cannot
                      split mid-digit-group. Clipping it was the bug -- a
                      contact card whose contact detail is cut off has failed
                      at its one job.

                      The card is no longer a fixed 188px. It is a grid cell
                      now, so it is at least as wide as the old fixed width on
                      any viewport above 420px and wider on most -- the reason
                      for the 188px (the 24-character email breaking mid-word at
                      168px) is satisfied by the column, not by a magic number
                      that stopped matching the layout around it. */}
                  <span className="overflow-hidden px-1 pt-1 text-center text-[11px] leading-snug font-medium break-words text-muted">
                    {link.detail}
                  </span>
                </span>
              </a>
            </div>
          ))}
        </div>

        <div className="mt-6">
          <button
            onClick={() => setShowAllDetails((prev) => !prev)}
            aria-expanded={showAllDetails}
            aria-controls="contact-details-panel"
            className={QUIET_BUTTON}
          >
            {showAllDetails ? 'Hide All Contact Details' : 'Show All Contact Details'}
          </button>
        </div>

        <div
          id="contact-details-panel"
          inert={!showAllDetails}
          className={`overflow-hidden transition-[max-height,opacity] duration-500 ease-in-out ${
            showAllDetails ? 'mt-8 max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          {/* A span, not a <p>, and deliberately so. The same name arrives
              from the GitHub profile fetch below, so two elements can carry
              identical text; Connect.test.tsx tells them apart with
              selector: 'p', which makes the fetched one the paragraph and
              leaves this hardcoded label as a span. */}
          <span className="block text-[15px] font-semibold text-ink">Supakorn Prayongyam</span>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {CONTACT_LINKS.map((link) => (
              /* Three blurred gradient blobs used to live inside each of these
                 -- two tracking the cursor, one full-bleed on hover, in blue,
                 purple and pink. Four rows of contact details do not need an
                 aurora behind them; they need to be readable and to say where
                 they go. */
              <a
                key={`full-${link.name}`}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-3.5 rounded-xl border border-rule/60 bg-paper-2 p-4 transition-colors duration-200 hover:border-[var(--section-accent)]/50 hover:bg-[var(--section-tint)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--section-accent)]"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-paper-3 text-muted transition-colors duration-200 group-hover:text-[var(--section-accent)]">
                  {link.icon}
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="text-[14px] font-semibold text-ink">{link.name}</span>
                  <span className="truncate text-[13px] text-muted">{link.detail}</span>
                </span>
              </a>
            ))}
          </div>
        </div>

        {/* GitHub, in detail */}
        <div className={`mt-12 ${PANEL}`}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <img
                src={githubStats?.avatarUrl ?? GITHUB_AVATAR_URL}
                alt={`${GITHUB_USERNAME} GitHub avatar`}
                className="h-16 w-16 rounded-full border border-rule object-cover"
                loading="lazy"
              />
              <div className="min-w-0">
                <p className="text-[17px] leading-tight font-semibold text-ink">
                  {githubStats?.displayName ?? 'GitHub Profile'}
                </p>
                <p className="text-[13px] text-muted">@{githubStats?.login ?? GITHUB_USERNAME}</p>
                <p className="mt-1 text-[13px] text-muted">{githubStats?.bio ?? 'Loading profile...'}</p>
              </div>
            </div>
            <a
              href={githubStats?.profileUrl ?? GITHUB_PROFILE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={`shrink-0 ${ACCENT_BUTTON}`}
            >
              Open GitHub <span aria-hidden="true">&rarr;</span>
            </a>
          </div>

          {/* Five numbers, one colour.
              They used to be blue, purple, green, cyan and pink -- five hues
              for five instances of the same kind of thing, which tells the
              reader the categories differ when only the labels do. A difference
              in colour has to mean a difference in kind, or it means nothing.

              The placeholder is an em dash rather than "--", and the loading
              state is the same em dash rather than "...", so the row keeps its
              shape and never shows two different kinds of absence. */}
          <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-rule/60 pt-6 sm:grid-cols-5">
            {[
              { label: 'Repositories', value: githubStats?.repositories },
              { label: 'Total Stars', value: githubStats?.totalStars },
              { label: 'GitHub Since', value: githubStats?.sinceYear },
              { label: 'Followers', value: githubStats?.followers },
              { label: 'Top Language', value: githubStats?.topLanguage },
            ].map((stat) => (
              <div key={stat.label}>
                <dd className={STAT_VALUE}>{isGithubLoading ? '\u2014' : (stat.value ?? '\u2014')}</dd>
                <dt className={STAT_LABEL}>{stat.label}</dt>
              </div>
            ))}
          </dl>

          <dl className="mt-6 grid grid-cols-1 gap-x-8 gap-y-3 border-t border-rule/60 pt-6 text-[14px] sm:grid-cols-2">
            <div className="flex gap-2">
              <dt className="text-muted">Location:</dt>
              <dd className="font-medium text-neutral">
                {isGithubLoading ? '\u2014' : (githubStats?.location ?? '\u2014')}
              </dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-muted">Hireable:</dt>
              <dd className="font-medium text-neutral">
                {isGithubLoading
                  ? '\u2014'
                  : githubStats?.hireable == null
                    ? 'Not specified'
                    : githubStats.hireable
                      ? 'Yes'
                      : 'No'}
              </dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-muted">Last Updated:</dt>
              <dd className="font-medium text-neutral">
                {isGithubLoading || !githubStats?.updatedAt ? '\u2014' : formatShortDate(githubStats.updatedAt)}
              </dd>
            </div>
            <div className="flex gap-2 sm:col-span-2">
              <dt className="text-muted">Most Starred Repo:</dt>
              <dd className="font-medium text-neutral">
                {isGithubLoading ? (
                  '\u2014'
                ) : githubStats?.mostStarredRepo ? (
                  <a
                    href={githubStats.mostStarredRepo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={LINK}
                  >
                    {githubStats.mostStarredRepo.name} ({githubStats.mostStarredRepo.stars}&#9733;)
                  </a>
                ) : (
                  'N/A'
                )}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </section>
  );
}

import { type ReactNode } from 'react';
import { useGitHubProfile } from '../hooks/useGitHubProfile';
import { useReveal } from '../hooks/useReveal';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import { revealStyle } from '../lib/revealStyle';
import {
  ACCENT_BUTTON,
  CHIP,
  LINK,
  PANEL,
  SECTION_HUES,
  SECTION_RULE,
  STAT_LABEL,
  STAT_VALUE,
} from '../lib/surfaces';
import {
  ACADEMIC_YEAR,
  AWARD,
  EMAIL,
  EXPECTED_GRADUATION,
  FULL_NAME,
  GITHUB_AVATAR_URL,
  GITHUB_PROFILE_URL,
  GITHUB_USERNAME,
  GPA,
  VENUE,
} from '../data/profile';

const RELEVANT_COURSES = [
  'Data Structures and Algorithms',
  'Object-Oriented Programming',
  'Algorithms Design',
  'Software Engineering',
  'Database Systems',
  'Database Programming',
  'Computer Architecture',
  'Operating Systems',
  'Computer Networks',
  'Computer and Communication Security',
  'System Analysis and Design',
  'Cloud Computing',
  'Discrete Mathematics',
  'Artificial Intelligence',
  'Human-Computer Interface',
  'Microcontrollers',
];

const PERSONAL_INFO = [
  { label: 'Full Name', value: FULL_NAME },
  { label: 'Email', value: EMAIL },
  { label: 'Location', value: 'Pathum Thani | Bangkok, Thailand' },
  { label: 'Education', value: 'Computer Engineering | SIIT, Thammasat U.' },
  { label: 'Year', value: `${ACADEMIC_YEAR} | GPA ${GPA} | Expected ${EXPECTED_GRADUATION}` },
  { label: 'Focus', value: 'Cybersecurity | AI & RAG Systems' },
  { label: 'Recognition', value: `${VENUE} ${AWARD}` },
  { label: 'Availability', value: 'Looking for Internships', highlight: true },
];

const LANGUAGES = [
  { name: 'Thai', level: 'Native', percentage: 100 },
  { name: 'English', level: 'TU-GET CBT 90 (2024)', percentage: 85 },
];

const FUN_FACTS = [
  'I build tools to fix my own annoyances (see: NoSleep)',
  'Comfortable from Arduino C++ up to Spark Structured Streaming',
  'Always learning new technologies',
  'I learn fast through practical experience',
];

type InfoCardProps = {
  title: string;
  icon: ReactNode;
  children: ReactNode;
};

/**
 * A titled block.
 *
 * The icon sits INLINE with the heading rather than above it in a tinted
 * square. The square-icon-above-heading arrangement is the universal generated
 * feature card, and the fix for it is exactly this: let the mark run with the
 * text it labels.
 *
 * There is no `accentClass` prop any more. Each of these four used to take its
 * own hue -- two blue, two purple, alternating -- which made four instances of
 * one component look like four different kinds of thing. The page has one
 * accent now, and these blocks do not spend it.
 */
function InfoCard({ title, icon, children }: InfoCardProps) {
  return (
    <div className={PANEL}>
      <h4 className="flex items-center gap-2.5 text-[15px] font-semibold text-ink">
        <span className="text-muted" aria-hidden="true">
          {icon}
        </span>
        {title}
      </h4>
      <div className="mt-5">{children}</div>
    </div>
  );
}

export default function About() {
  const { ref: sectionRef, isVisible } = useReveal<HTMLElement>();
  const reducedMotion = usePrefersReducedMotion();
  const { profile: githubStats, isLoading: isGithubLoading } = useGitHubProfile(GITHUB_USERNAME);

  const stats = [
    { label: 'Repos', value: githubStats?.repositories },
    { label: 'Stars', value: githubStats?.totalStars },
    { label: 'Top Lang', value: githubStats?.topLanguage },
    { label: 'Since', value: githubStats?.sinceYear },
  ];

  return (
    <section
      ref={sectionRef}
      id="about"
      aria-labelledby="about-heading"
      className={`font-system relative px-6 py-24 sm:px-8 lg:px-12 ${SECTION_HUES.azure}`}
    >
      <div className="relative z-10 mx-auto max-w-[980px]">
        <h2
          id="about-heading"
          className="text-[clamp(1.75rem,3.5vw,2.5rem)] font-semibold tracking-[-0.02em] text-ink"
        >
          About Me
        </h2>
        <div aria-hidden="true" className={SECTION_RULE} />

        {/* The prose is the section's real content, so it gets the section's
            widest measure and its brightest body colour. Emphasis is carried by
            weight on the ink token -- never by a second hue, and never by
            italic, which in a heading or a lede is one of the more reliable
            generated-text tells. */}
        <div className="mt-8 max-w-[68ch] space-y-6 text-[17px] leading-[1.65] text-neutral">
          <p>
            I'm a <span className="font-semibold text-ink">Computer Engineering student</span> at SIIT, Thammasat
            University, specializing in
            <span className="font-semibold text-ink"> cybersecurity and AI/RAG systems</span>. I co-authored ESNIDSaaS,
            a cloud-native multi-tenant network intrusion detection service built on Kafka and Spark Structured
            Streaming, which won the
            <span className="font-semibold text-ink"> Best Paper Award at IEEE IMC 2026</span> (CISOSE 2026) in Fukuoka,
            Japan.
          </p>
          <p>
            As an <span className="font-semibold text-ink">AI Developer Intern at Mizuhada Group</span> I built OpsBot, a
            multi-agent retrieval-augmented assistant over internal SOPs and live warehouse data, using FastAPI,
            ChromaDB and the Gemini API. I'm currently a
            <span className="font-semibold text-ink"> UX/UI Research &amp; Design Intern at BAKA Co., Ltd.</span>, where
            I delivered a redesign report for Baka Index, their Google Earth Engine farming analytics platform, and am
            now implementing the agreed changes.
          </p>
          <p>
            Alongside that I work across{' '}
            <span className="font-semibold text-ink">TypeScript, React, Python, Docker and CI/CD</span>, with a
            foundation in distributed systems, network security and backend engineering — and a preference for systems
            whose behaviour you can measure rather than assume.
          </p>
        </div>

        {/* GitHub snapshot */}
        <div className="mt-16">
          {/* The {' '} is load-bearing and About.test.tsx pins it. A flex gap
              is drawn space, not textual space, so without the explicit
              character the heading's accessible name concatenates the handle
              straight onto "Activity" and a screen reader says it as one word.

              The handle is deliberately not spelled out in this comment:
              scripts/profile-drift.test.ts forbids the literal username
              anywhere in this file, comments included, which is what stops a
              hardcoded identity drifting away from src/data/profile.ts. */}
          <h3 className="flex flex-wrap items-baseline gap-x-3 text-[15px] font-semibold text-ink">
            GitHub Activity{' '}
            <a href={GITHUB_PROFILE_URL} target="_blank" rel="noopener noreferrer" className={`text-[13px] ${LINK}`}>
              @{GITHUB_USERNAME} <span aria-hidden="true">↗</span>
            </a>
          </h3>

          <div className={`mt-5 ${PANEL}`}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3.5">
                <img
                  src={githubStats?.avatarUrl ?? GITHUB_AVATAR_URL}
                  alt={`${GITHUB_USERNAME} GitHub avatar`}
                  className="h-12 w-12 rounded-full border border-rule object-cover"
                  loading="lazy"
                />
                <div className="min-w-0">
                  <p className="text-[15px] leading-tight font-semibold text-ink">
                    {githubStats?.displayName ?? 'GitHub Profile'}
                  </p>
                  <p className="text-[13px] text-muted">@{githubStats?.login ?? GITHUB_USERNAME}</p>
                  <p className="mt-0.5 line-clamp-2 text-[13px] text-muted">
                    {githubStats?.bio ?? 'Loading profile...'}
                  </p>
                </div>
              </div>

              {/* A bordered control, not a filled block -- see ACCENT_BUTTON. */}
              <a
                href={githubStats?.profileUrl ?? GITHUB_PROFILE_URL}
                target="_blank"
                rel="noopener noreferrer"
                  className={`shrink-0 ${ACCENT_BUTTON}`}
              >
                Open GitHub <span aria-hidden="true">→</span>
              </a>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4 border-t border-rule/60 pt-6 sm:grid-cols-4">
              {stats.map((stat) => (
                <div key={stat.label}>
                  <div className={STAT_VALUE}>{isGithubLoading ? '—' : (stat.value ?? '—')}</div>
                  <div className={STAT_LABEL}>{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="mt-16">
          <h3 className="text-[15px] font-semibold text-ink">Details</h3>
          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            <InfoCard
              title="Personal Information"
              icon={
                <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              }
            >
              {/* A definition list, because that is what it is: eight terms and
                  their values. The old markup was a stack of divs each sliding
                  1px right on hover -- motion on a static fact, and nothing a
                  screen reader could use to pair a label with its value. */}
              <dl className="space-y-3.5" style={revealStyle(isVisible, 0, reducedMotion)}>
                {PERSONAL_INFO.map((info) => (
                  <div key={info.label}>
                    <dt className="text-[13px] text-muted">{info.label}</dt>
                    <dd
                      className={
                        info.highlight
                          ? 'font-semibold text-[var(--section-accent)]'
                          : 'font-medium text-neutral'
                      }
                    >
                      {info.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </InfoCard>

            <InfoCard
              title="Relevant Courses"
              icon={
                <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 14l9-5-9-5-9 5 9 5z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 14l6.16-3.422a12.083 12.083 0 01-.658 6.425A12.08 12.08 0 0112 21a12.08 12.08 0 01-5.502-3.997 12.083 12.083 0 01-.658-6.425L12 14z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 14v7" />
                </svg>
              }
            >
              {/* The same chip as Skills renders, imported rather than
                  re-described. These were purple pills there and grey pills
                  here for no reason either file could have told you. */}
              <ul className="flex flex-wrap gap-2" style={revealStyle(isVisible, 90, reducedMotion)}>
                {RELEVANT_COURSES.map((course) => (
                  <li key={course} className={CHIP}>
                    {course}
                  </li>
                ))}
              </ul>
            </InfoCard>

            <InfoCard
              title="Languages"
              icon={
                <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                </svg>
              }
            >
              <div className="space-y-4" style={revealStyle(isVisible, 180, reducedMotion)}>
                {LANGUAGES.map((lang, index) => (
                  <div key={lang.name}>
                    <div className="mb-2 flex items-baseline justify-between gap-3">
                      <span className="text-[15px] text-neutral">{lang.name}</span>
                      <span className="text-[13px] text-muted">{lang.level}</span>
                    </div>
                    {/* One solid accent bar, not a blue-to-purple gradient with
                        a matching glow. A proficiency bar is a measurement; a
                        gradient implies the value changes across its own width,
                        which it does not. */}
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-paper-3">
                      <div
                        className="h-full rounded-full bg-[var(--section-accent)]"
                        style={{
                          width: `${lang.percentage}%`,
                          animation:
                            isVisible && !reducedMotion
                              ? `slideIn 1s ease-out ${index * 160}ms forwards`
                              : 'none',
                        }}
                      />
                    </div>
                  </div>
                ))}
                <p className="pt-1 text-[13px] text-muted">
                  <span className="font-semibold text-neutral">TU-GET CBT 90</span> (Equivalent to{' '}
                  <span className="font-semibold text-neutral">IELTS 7.5</span>)
                  <a
                    href="https://litu.tu.ac.th/wp-content/uploads/2023/10/TU-GET-CBT-aligned-with-IELTS-and-TOEFL-iBT.pdf"
                    className={`ml-1.5 ${LINK}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    [Source]
                  </a>
                </p>
              </div>
            </InfoCard>

            <InfoCard
              title="Fun Facts"
              icon={
                <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              }
            >
              {/* Marks were alternating blue and purple bullets that grew 25% on
                  hover. Four facts do not come in two kinds, and a bullet is not
                  a control -- there is nothing for hover to promise. */}
              <ul className="space-y-3" style={revealStyle(isVisible, 270, reducedMotion)}>
                {FUN_FACTS.map((fact) => (
                  <li key={fact} className="flex gap-3 text-[15px] leading-relaxed text-neutral">
                    <span aria-hidden="true" className="mt-2.5 h-px w-3 shrink-0 bg-rule" />
                    <span>{fact}</span>
                  </li>
                ))}
              </ul>
            </InfoCard>
          </div>
        </div>
      </div>
    </section>
  );
}

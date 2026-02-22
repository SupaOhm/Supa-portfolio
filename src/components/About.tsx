import { type ReactNode, useEffect, useRef, useState } from 'react';

const GITHUB_USERNAME = 'SupaOhm';
const GITHUB_PROFILE_URL = `https://github.com/${GITHUB_USERNAME}`;
const GITHUB_USER_API = `https://api.github.com/users/${GITHUB_USERNAME}`;

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
  { label: 'Full Name', value: 'Supakorn Prayongyam' },
  { label: 'Email', value: 'ohm.supakornth@gmail.com' },
  { label: 'Location', value: 'Pathum Thani | Bangkok, Thailand' },
  { label: 'Education', value: 'Computer Engineering | SIIT, Thammasat U.' },
  { label: 'Availability', value: 'Looking for Internships', highlight: true },
];

const LANGUAGES = [
  { name: 'Thai', level: 'Native', percentage: 100 },
  { name: 'English', level: 'Fluent', percentage: 85 },
];

const FUN_FACTS = [
  'I love trying new things',
  'Always learning new technologies',
  'Passionate about software development',
  'I learn fast through practical experience',
];

type InfoCardProps = {
  title: string;
  icon: ReactNode;
  accentClass: string;
  children: ReactNode;
};

type GitHubUserResponse = {
  login: string;
  avatar_url: string;
  html_url: string;
  name: string | null;
  bio: string | null;
  public_repos: number;
  followers: number;
  repos_url: string;
  created_at: string;
};

type GitHubRepoResponse = {
  name: string;
  html_url: string;
  stargazers_count: number;
  language: string | null;
};

type GitHubStats = {
  login: string;
  avatarUrl: string;
  profileUrl: string;
  displayName: string;
  bio: string;
  repositories: number;
  followers: number;
  totalStars: number;
  sinceYear: number;
  topLanguage: string;
};

function InfoCard({ title, icon, accentClass, children }: InfoCardProps) {
  return (
    <div className={`p-6 bg-gradient-to-br from-gray-800/50 to-gray-700/50 border border-gray-700/50 rounded-xl backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-xl ${accentClass}`}>
      <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
        {icon}
        {title}
      </h3>
      {children}
    </div>
  );
}

export default function About() {
  const [isVisible, setIsVisible] = useState(false);
  const [githubStats, setGithubStats] = useState<GitHubStats | null>(null);
  const [isGithubLoading, setIsGithubLoading] = useState(true);
  const sectionRef = useRef<HTMLElement>(null);

  // Intersection Observer to detect when section is visible
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
          }
        });
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => {
      if (sectionRef.current) {
        observer.unobserve(sectionRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    const fetchGitHubStats = async () => {
      try {
        setIsGithubLoading(true);

        const response = await fetch(GITHUB_USER_API, {
          signal: controller.signal,
          headers: {
            Accept: 'application/vnd.github+json',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch GitHub stats');
        }

        const data: GitHubUserResponse = await response.json();

        const reposResponse = await fetch(`${data.repos_url}?per_page=100&type=owner`, {
          signal: controller.signal,
          headers: {
            Accept: 'application/vnd.github+json',
          },
        });

        if (!reposResponse.ok) {
          throw new Error('Failed to fetch GitHub repositories');
        }

        const repos: GitHubRepoResponse[] = await reposResponse.json();
        const totalStars = repos.reduce((total, repo) => total + repo.stargazers_count, 0);
        const createdYear = new Date(data.created_at).getFullYear();
        const languageCountMap = repos.reduce<Record<string, number>>((map, repo) => {
          if (!repo.language) {
            return map;
          }

          map[repo.language] = (map[repo.language] ?? 0) + 1;
          return map;
        }, {});
        const topLanguage =
          Object.entries(languageCountMap).sort((first, second) => second[1] - first[1])[0]?.[0] ?? 'N/A';

        setGithubStats({
          login: data.login,
          avatarUrl: data.avatar_url,
          profileUrl: data.html_url,
          displayName: data.name ?? data.login,
          bio: data.bio ?? 'No bio provided yet.',
          repositories: data.public_repos,
          followers: data.followers,
          totalStars,
          sinceYear: createdYear,
          topLanguage,
        });
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          setGithubStats(null);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsGithubLoading(false);
        }
      }
    };

    fetchGitHubStats();

    return () => {
      controller.abort();
    };
  }, []);

  return (
    <section ref={sectionRef} id="about" className="py-20 px-4 sm:px-6 lg:px-8 relative">
      {/* Subtle background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/5 via-purple-900/5 to-transparent pointer-events-none" />
      
      <div className="max-w-4xl mx-auto relative z-10">
        <p className="text-xs sm:text-sm uppercase tracking-[0.2em] text-blue-300/80 text-center mb-3">
          Professional Summary
        </p>
        <h2 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-blue-400 bg-clip-text text-transparent mb-8 text-center">
          About Me
        </h2>
        
        <div className="space-y-6 text-gray-300">
          <p className="text-base sm:text-lg leading-relaxed">
            I'm a <span className="font-semibold">Computer Engineering student</span> at SIIT, Thammasat University with experience in software development,
            backend systems, and database design. I have a strong foundation in object-oriented programming,
            data structures and algorithms, and software engineering principles.
          </p>
          <p className="text-base sm:text-lg leading-relaxed">
            Through academic and industry-collaborative projects, I've gained hands-on experience building
            <span className="font-semibold"> full-stack web applications</span>, designing RESTful APIs, and working with both relational (MySQL) and
            NoSQL (MongoDB) databases. Currently, I'm assigned to collaborate with BAKA Co., Ltd. on redesigning their agricultural platform's UX/UI.
          </p>
          <p className="text-base sm:text-lg leading-relaxed">
            I'm seeking a <span className="font-semibold">Software Engineer internship</span> where I can contribute to building reliable, well-structured systems
            while continuing to grow and learn from experienced engineers.
          </p>
        </div>
        
        {/* GitHub Stats */}
        <div className="mt-10 mb-8">
          <h3 className="text-xl font-semibold text-white mb-6 text-center">
            GitHub Activity
            <a 
              href={GITHUB_PROFILE_URL}
              target="_blank" 
              rel="noopener noreferrer"
              className="ml-3 text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
              @{GITHUB_USERNAME} ↗
            </a>
          </h3>
          
          {/* GitHub Profile Card */}
          <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700 rounded-xl p-4 sm:p-5 max-w-2xl mx-auto text-left">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <img
                  src={githubStats?.avatarUrl ?? `https://github.com/${GITHUB_USERNAME}.png`}
                  alt={`${GITHUB_USERNAME} GitHub avatar`}
                  className="w-12 h-12 rounded-full border border-gray-600 object-cover"
                  loading="lazy"
                />
                <div>
                  <h3 className="text-white text-base font-semibold leading-tight">{githubStats?.displayName ?? 'GitHub Profile'}</h3>
                  <p className="text-blue-300 text-xs">@{githubStats?.login ?? GITHUB_USERNAME}</p>
                  <p className="text-gray-400 text-xs mt-0.5 line-clamp-2">{githubStats?.bio ?? 'Loading profile...'}</p>
                </div>
              </div>
              <a
                href={githubStats?.profileUrl ?? GITHUB_PROFILE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors font-semibold text-xs text-center"
              >
                Open GitHub →
              </a>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-gray-700">
              <div className="text-center">
                <div className="text-xl font-bold text-blue-400">{isGithubLoading ? '...' : (githubStats?.repositories ?? '--')}</div>
                <div className="text-[11px] text-gray-400 mt-0.5">Repos</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-purple-400">{isGithubLoading ? '...' : (githubStats?.totalStars ?? '--')}</div>
                <div className="text-[11px] text-gray-400 mt-0.5">Stars</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-pink-400">{isGithubLoading ? '...' : (githubStats?.topLanguage ?? '--')}</div>
                <div className="text-[11px] text-gray-400 mt-0.5">Top Lang</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-green-400">{isGithubLoading ? '...' : (githubStats?.sinceYear ?? '--')}</div>
                <div className="text-[11px] text-gray-400 mt-0.5">Since</div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Details Panel */}
        <div className="mt-8">
        <h3 className="text-xl font-semibold text-white mb-6">Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Personal Information */}
            <InfoCard
              title="Personal Information"
              accentClass="hover:border-blue-400/50 hover:shadow-blue-500/10 text-blue-400"
              icon={
                <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              }
            >
              <div className="space-y-3 text-gray-300">
                {PERSONAL_INFO.map((info, index) => (
                  <div 
                    key={info.label}
                    className="hover:translate-x-1 transition-transform duration-200"
                    style={{
                      animation: isVisible ? `fadeIn 0.5s ease-out ${index * 100}ms forwards` : 'none',
                      opacity: isVisible ? 0 : 1,
                    }}
                  >
                    <span className="text-gray-400 text-sm">{info.label}:</span>
                    <p className={info.highlight ? 'font-semibold text-green-400' : 'font-medium'}>
                      {info.value}
                    </p>
                  </div>
                ))}
              </div>
            </InfoCard>

            {/* Relevant Courses */}
            <InfoCard
              title="Relevant Courses"
              accentClass="hover:border-purple-400/50 hover:shadow-purple-500/10 text-purple-400"
              icon={
                <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01-.658 6.425A12.08 12.08 0 0112 21a12.08 12.08 0 01-5.502-3.997 12.083 12.083 0 01-.658-6.425L12 14z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14v7" />
                </svg>
              }
            >
              <div className="flex flex-wrap gap-2">
                {RELEVANT_COURSES.map((course, index) => (
                  <span
                    key={course}
                    className="px-3 py-1 bg-purple-500/20 border border-purple-400/30 rounded-full text-sm text-purple-300 hover:bg-purple-500/40 hover:border-purple-400/60 hover:scale-110 hover:shadow-lg hover:shadow-purple-500/30 transition-all duration-300 cursor-default"
                    style={{
                      animation: isVisible ? `fadeIn 0.5s ease-out ${index * 50}ms forwards` : 'none',
                      opacity: isVisible ? 0 : 1,
                    }}
                  >
                    {course}
                  </span>
                ))}
              </div>
            </InfoCard>

            {/* Languages */}
            <InfoCard
              title="Languages"
              accentClass="hover:border-blue-400/50 hover:shadow-blue-500/10 text-blue-400"
              icon={
                <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                </svg>
              }
            >
              <div className="space-y-3">
                {LANGUAGES.map((lang, index) => (
                  <div 
                    key={lang.name}
                    className="group/lang"
                    style={{
                      animation: isVisible ? `fadeIn 0.5s ease-out ${index * 150}ms forwards` : 'none',
                      opacity: isVisible ? 0 : 1,
                    }}
                  >
                    <div className="flex justify-between mb-1">
                      <span className="text-gray-300 group-hover/lang:text-white transition-colors">{lang.name}</span>
                      <span className="text-gray-400 text-sm group-hover/lang:text-gray-300 transition-colors">{lang.level}</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-1000 ease-out group-hover/lang:shadow-lg group-hover/lang:shadow-blue-500/50"
                        style={{ 
                          width: `${lang.percentage}%`,
                          animation: isVisible ? `slideIn 1s ease-out ${index * 200}ms forwards` : 'none',
                        }}
                      />
                    </div>
                  </div>
                ))}
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-gray-400 text-xs hover:text-gray-300 transition-colors">
                    <span className="font-bold">TU-GET CBT 90</span> (Equivalent to <span className="font-bold">IELTS 7.5</span>)
                    <a 
                      href="https://litu.tu.ac.th/wp-content/uploads/2023/10/TU-GET-CBT-aligned-with-IELTS-and-TOEFL-iBT.pdf" 
                      className="text-blue-400 text-xs underline ml-1 hover:text-blue-300 transition-colors" 
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      [Source]
                    </a>
                  </span>
                </div>
              </div>
            </InfoCard>

            {/* Fun Facts */}
            <InfoCard
              title="Fun Facts"
              accentClass="hover:border-purple-400/50 hover:shadow-purple-500/10 text-purple-400"
              icon={
                <svg className="w-5 h-5 group-hover:scale-110 group-hover:rotate-12 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              }
            >
              <ul className="space-y-2 text-gray-300">
                {FUN_FACTS.map((fact, index) => (
                  <li 
                    key={fact} 
                    className="flex items-start gap-2 hover:translate-x-2 transition-transform duration-300 group/fact cursor-default"
                    style={{
                      animation: isVisible ? `fadeIn 0.5s ease-out ${index * 100}ms forwards` : 'none',
                      opacity: isVisible ? 0 : 1,
                    }}
                  >
                    <span className={`${index % 2 === 0 ? 'text-blue-400 group-hover/fact:text-blue-300' : 'text-purple-400 group-hover/fact:text-purple-300'} mt-1 transition-colors group-hover/fact:scale-125`}>
                      •
                    </span>
                    <span className="group-hover/fact:text-white transition-colors">{fact}</span>
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

import { useReveal } from '../hooks/useReveal';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import { revealStyle } from '../lib/revealStyle';
import { CHIP, SECTION_GROUND, SECTION_HUES, SECTION_RULE } from '../lib/surfaces';

const SKILL_CATEGORIES = {
  Languages: ['Python', 'Java', 'C', 'C++', 'C#', 'JavaScript', 'TypeScript', 'SQL', 'PHP', 'HTML', 'CSS'],
  'Frameworks, Libraries, and Tools': ['React', 'Next.js', 'Node.js', 'Express.js', 'FastAPI', '.NET', 'Tailwind CSS', 'Bootstrap', 'Docker', 'GitHub Actions', 'Apache Kafka', 'Apache Spark', 'ChromaDB', 'Mongoose', 'Axios', 'Postman', 'MySQL', 'PostgreSQL', 'MongoDB', 'Pandas', 'MATLAB', 'Git', 'Figma', 'CLI'],
  'Core Concepts': ['Data Structures and Algorithms', 'Object-Oriented Programming', 'Operating Systems', 'Database Design', 'API Fundamentals', 'REST APIs', 'Software Engineering', 'UX/UI Design', 'Microcontrollers', 'Version Control', 'Cloud Computing', 'Computer Networks', 'Network Security', 'Cryptography Fundamentals', 'RAG', 'Agentic AI', 'Machine Learning', 'Stream Processing', 'Multi-Tenant Architecture', 'CI/CD'],
  'Soft Skills': ['Quick Learning', 'Communication', 'Problem-Solving', 'Adaptability', 'Time Management', 'Work Ethic', 'Collaboration', 'Growth Mindset'],
} as const;

export default function Skills() {
  const { ref: sectionRef, isVisible } = useReveal<HTMLElement>();
  const reducedMotion = usePrefersReducedMotion();

  return (
    <section
      ref={sectionRef}
      id="skills"
      aria-labelledby="skills-heading"
      className={`font-system relative px-6 py-24 sm:px-8 lg:px-12 ${SECTION_GROUND} ${SECTION_HUES.teal}`}
    >
      <div className="relative z-10 mx-auto max-w-[980px]">
        {/* Left-aligned, not centred. Four sections of centred column was the
            page's strongest structural tic; breaking it once per section is
            enough to stop the rhythm reading as a template. */}
        <h2
          id="skills-heading"
          className="text-[clamp(1.75rem,3.5vw,2.5rem)] font-semibold tracking-[-0.02em] text-ink"
        >
          Skills &amp; Technologies
        </h2>
        <div aria-hidden="true" className={SECTION_RULE} />
        <p className="mt-4 max-w-[58ch] text-[15px] leading-relaxed text-muted">
          A practical snapshot of the tools and concepts I have worked with across academic, personal, and
          collaborative projects.
        </p>

        <div className="mt-12 grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-rule/60 bg-rule/60 md:grid-cols-2">
          {Object.entries(SKILL_CATEGORIES).map(([category, skills], categoryIndex) => (
            /* gap-px over a rule-coloured parent draws the dividers between
               cells as the grid's own gaps. One hairline between neighbours
               instead of two abutting borders, and no doubled line where cells
               meet -- which is what a bordered-card grid always produces. */
            <div
              key={category}
              className="bg-paper p-6"
              /* One reveal per category, not per chip. The old version staggered
                 every chip individually at 45ms apart: 63 chips meant the list
                 was still arriving nearly three seconds after it came into view,
                 and "everything fades up on scroll" is the motion tell itself. */
              style={revealStyle(isVisible, categoryIndex * 90, reducedMotion)}
            >
              <h3 className="flex items-center gap-2.5 text-[13px] font-semibold tracking-[0.02em] text-ink">
                <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[var(--section-accent)]" />
                {category}
              </h3>
              <ul className="mt-4 flex flex-wrap gap-2">
                {skills.map((skill) => (
                  <li key={skill} className={CHIP}>
                    {skill}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className="mt-10 max-w-[68ch] text-[15px] leading-relaxed text-muted">
          The skills listed above reflect technologies and concepts I have learned and applied through coursework and
          hands-on projects. While I am still developing depth in several areas, I bring a strong learning mindset,
          practical experience, and the discipline to grow quickly in a professional environment.
        </p>
      </div>
    </section>
  );
}

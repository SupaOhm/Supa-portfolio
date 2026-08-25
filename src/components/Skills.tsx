import { useReveal } from '../hooks/useReveal';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import { revealStyle } from '../lib/revealStyle';

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
    <section ref={sectionRef} id="skills" aria-labelledby="skills-heading" className="py-20 px-4 sm:px-6 lg:px-8 relative">
      <div className="absolute inset-0 bg-linear-to-br from-blue-900/5 via-purple-900/5 to-transparent pointer-events-none" />

      <div className="max-w-5xl mx-auto relative z-10">
        <p className="text-xs sm:text-sm uppercase tracking-[0.2em] text-blue-300/80 text-center mb-3">
          Technical Snapshot
        </p>
        <h2 id="skills-heading" className="text-3xl sm:text-4xl font-bold bg-linear-to-r from-blue-400 via-purple-400 to-blue-400 bg-clip-text text-transparent mb-3 text-center">
          Skills & Technologies
        </h2>
        <p className="text-gray-400 text-sm sm:text-base text-center mb-10 max-w-3xl mx-auto">
          A practical snapshot of the tools and concepts I have worked with across academic, personal, and collaborative projects.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {Object.entries(SKILL_CATEGORIES).map(([category, skills], categoryIndex) => (
            <div
              key={category}
              className="p-5 rounded-xl border border-gray-700/70 bg-linear-to-br from-gray-900/70 to-gray-800/40 backdrop-blur-xs hover:border-blue-400/40 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300"
              style={revealStyle(isVisible, categoryIndex * 120, reducedMotion)}
            >
              <h3 className="text-sm font-semibold text-blue-300 mb-4 tracking-wide">{category}</h3>
              <ul className="flex flex-wrap gap-2.5">
                {skills.map((skill, index) => (
                  <li
                    key={skill}
                    className="px-3.5 py-1.5 bg-gray-800/80 text-gray-300 rounded-full text-sm border border-gray-700/80 hover:bg-blue-500/15 hover:text-blue-200 hover:border-blue-400/50 transition-all duration-300 hover:scale-105 cursor-default"
                    style={revealStyle(isVisible, (categoryIndex * 120) + (index * 45), reducedMotion, 450)}
                  >
                    {skill}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className="mt-10 text-sm sm:text-base text-gray-400 leading-relaxed text-center max-w-4xl mx-auto">
          The skills listed above reflect technologies and concepts I have learned and applied through coursework and hands-on projects. While I am still developing depth in several areas, I bring a strong learning mindset, practical experience, and the discipline to grow quickly in a professional environment.
        </p>
      </div>
    </section>
  );
}

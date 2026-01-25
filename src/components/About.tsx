export default function About() {
  const skillCategories = {
    'Languages': ['Python', 'Java', 'C', 'C++', 'C#', 'JavaScript', 'TypeScript', 'SQL', 'PHP', 'HTML', 'CSS'],
    'Frameworks, Libraries, and Tools': ['React', 'Node.js', 'Express.js', '.NET', 'Tailwind CSS', 'Bootstrap', 'Mongoose', 'Axios', 'MySQL', 'MongoDB', 'Git', 'Figma', 'CLI'],
    'Core Concepts': ['Data Structures and Algorithms', 'Object-Oriented Programming', 'Operating Systems', 'Database Design', 'API Fundamentals', 'REST APIs', 'Software Engineering', 'UX/UI Design', 'Microcontrollers', 'Version Control'],
    'Soft Skills': ['Quick Learning', 'Communication', 'Problem-Solving', 'Adaptability', 'Time Management', 'Work Ethic'],
  };

  return (
    <section id="about" className="py-20 px-4 sm:px-6 lg:px-8 relative">
      {/* Subtle background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/5 via-purple-900/5 to-transparent pointer-events-none" />
      
      <div className="max-w-4xl mx-auto relative z-10">
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
            NoSQL (MongoDB) databases. Currently, I'm collaborating with BAKA Co., Ltd. on redesigning their agricultural platform's UX/UI.
          </p>
          <p className="text-base sm:text-lg leading-relaxed">
            I'm seeking a <span className="font-semibold">Software Engineer internship</span> where I can contribute to building reliable, well-structured systems
            while continuing to grow and learn from experienced engineers.
          </p>
          
          <div className="pt-6">
            <h3 className="text-xl font-semibold text-white mb-6">Skills & Technologies</h3>
            <div className="space-y-6">
              {Object.entries(skillCategories).map(([category, skills]) => (
                <div key={category}>
                  <h4 className="text-sm font-medium text-blue-400 mb-3">{category}</h4>
                  <div className="flex flex-wrap gap-3">
                    {skills.map((skill, index) => (
                      <span
                        key={skill}
                        className="px-4 py-2 bg-gradient-to-r from-gray-800 to-gray-700 text-gray-300 rounded-full text-sm hover:from-blue-500/20 hover:to-purple-500/20 hover:text-blue-300 hover:border-blue-400/50 border border-gray-700/50 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-blue-500/20 cursor-default"
                        style={{
                          animation: `fadeIn 0.5s ease-out ${index * 80}ms forwards`,
                          opacity: 0,
                        }}
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-10 text-sm sm:text-base text-gray-400 leading-relaxed">
              I never stop learning. I'm hungry to keep expanding these skills and bring that growth mindset to your team as an intern.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

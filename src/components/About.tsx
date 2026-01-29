import { useEffect, useRef, useState } from 'react';

export default function About() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [smoothMousePosition, setSmoothMousePosition] = useState({ x: 0, y: 0 });
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const mouseRef = useRef(mousePosition);

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  // Keep latest mouse position in a ref
  useEffect(() => {
    mouseRef.current = mousePosition;
  }, [mousePosition]);

  // Smooth cursor tracking with easing
  useEffect(() => {
    let animationFrameId: number;
    
    const smoothMove = () => {
      setSmoothMousePosition((prev) => ({
        x: prev.x + (mouseRef.current.x - prev.x) * 0.15,
        y: prev.y + (mouseRef.current.y - prev.y) * 0.15,
      }));
      animationFrameId = requestAnimationFrame(smoothMove);
    };
    
    animationFrameId = requestAnimationFrame(smoothMove);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

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

  const relevantCourses = [
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

  const personalInfo = [
    { label: 'Full Name', value: 'Supakorn Prayongyam' },
    { label: 'Email', value: 'ohm.supakornth@gmail.com' },
    { label: 'Location', value: 'Pathum Thani | Bangkok, Thailand' },
    { label: 'Education', value: 'Computer Engineering | SIIT, Thammasat U.' },
    { label: 'Availability', value: 'Looking for Internships', highlight: true },
  ];

  const languages = [
    { name: 'Thai', level: 'Native', percentage: 100 },
    { name: 'English', level: 'Fluent', percentage: 85 },
  ];

  const funFacts = [
    'I love trying new things',
    'Always learning new technologies',
    'Passionate about software development',
    'I learn fast through practical experience',
  ];

  const skillCategories = {
    'Languages': ['Python', 'Java', 'C', 'C++', 'C#', 'JavaScript', 'TypeScript', 'SQL', 'PHP', 'HTML', 'CSS'],
    'Frameworks, Libraries, and Tools': ['React', 'Node.js', 'Express.js', '.NET', 'Tailwind CSS', 'Bootstrap', 'Mongoose', 'Axios', 'MySQL', 'MongoDB', 'Git', 'Figma', 'CLI'],
    'Core Concepts': ['Data Structures and Algorithms', 'Object-Oriented Programming', 'Operating Systems', 'Database Design', 'API Fundamentals', 'REST APIs', 'Software Engineering', 'UX/UI Design', 'Microcontrollers', 'Version Control'],
    'Soft Skills': ['Quick Learning', 'Communication', 'Problem-Solving', 'Adaptability', 'Time Management', 'Work Ethic'],
  };

  return (
    <section ref={sectionRef} id="about" className="py-20 px-4 sm:px-6 lg:px-8 relative">
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
        </div>
        
        {/* Details Panel */}
        <div className="mt-8">
        <h3 className="text-xl font-semibold text-white mb-6">Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Personal Information */}
            <div 
              className="relative p-6 bg-gradient-to-br from-gray-800/50 to-gray-700/50 border border-gray-700/50 rounded-xl backdrop-blur-sm hover:from-gray-800/70 hover:to-gray-700/70 hover:border-blue-400/50 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-blue-500/10 group overflow-hidden"
              onMouseMove={handleMouseMove}
            >
              {/* Cursor-following gradient effects */}
              <div
                className="absolute w-[250px] h-[250px] bg-gradient-to-r from-blue-500/20 via-purple-500/15 to-transparent rounded-full blur-[60px] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{
                  left: `${smoothMousePosition.x - 125}px`,
                  top: `${smoothMousePosition.y - 125}px`,
                  transition: 'none',
                }}
              />
              <div
                className="absolute w-[150px] h-[150px] bg-gradient-to-r from-blue-400/15 to-transparent rounded-full blur-[40px] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{
                  left: `${smoothMousePosition.x - 75}px`,
                  top: `${smoothMousePosition.y - 75}px`,
                  transition: 'none',
                }}
              />
              
              <h3 className="text-xl font-bold text-blue-400 mb-4 flex items-center gap-2 group-hover:text-blue-300 transition-colors relative z-10">
                <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Personal Information
              </h3>
              <div className="space-y-3 text-gray-300 relative z-10">
                {personalInfo.map((info, index) => (
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
            </div>

            {/* Relevant Courses */}
            <div 
              className="relative p-6 bg-gradient-to-br from-gray-800/50 to-gray-700/50 border border-gray-700/50 rounded-xl backdrop-blur-sm hover:from-gray-800/70 hover:to-gray-700/70 hover:border-purple-400/50 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-purple-500/10 group overflow-hidden"
              onMouseMove={handleMouseMove}
            >
              {/* Cursor-following gradient effects */}
              <div
                className="absolute w-[250px] h-[250px] bg-gradient-to-r from-purple-500/20 via-blue-500/15 to-transparent rounded-full blur-[60px] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{
                  left: `${smoothMousePosition.x - 125}px`,
                  top: `${smoothMousePosition.y - 125}px`,
                  transition: 'none',
                }}
              />
              <div
                className="absolute w-[150px] h-[150px] bg-gradient-to-r from-purple-400/15 to-transparent rounded-full blur-[40px] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{
                  left: `${smoothMousePosition.x - 75}px`,
                  top: `${smoothMousePosition.y - 75}px`,
                  transition: 'none',
                }}
              />
              
              <h3 className="text-xl font-bold text-purple-400 mb-4 flex items-center gap-2 group-hover:text-purple-300 transition-colors relative z-10">
                <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01-.658 6.425A12.08 12.08 0 0112 21a12.08 12.08 0 01-5.502-3.997 12.083 12.083 0 01-.658-6.425L12 14z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14v7" />
                </svg>
                Relevant Courses
              </h3>
              <div className="flex flex-wrap gap-2 relative z-10">
                {relevantCourses.map((course, index) => (
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
            </div>

            {/* Languages */}
            <div 
              className="relative p-6 bg-gradient-to-br from-gray-800/50 to-gray-700/50 border border-gray-700/50 rounded-xl backdrop-blur-sm hover:from-gray-800/70 hover:to-gray-700/70 hover:border-blue-400/50 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-blue-500/10 group overflow-hidden"
              onMouseMove={handleMouseMove}
            >
              {/* Cursor-following gradient effects */}
              <div
                className="absolute w-[250px] h-[250px] bg-gradient-to-r from-blue-500/20 via-purple-500/15 to-transparent rounded-full blur-[60px] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{
                  left: `${smoothMousePosition.x - 125}px`,
                  top: `${smoothMousePosition.y - 125}px`,
                  transition: 'none',
                }}
              />
              <div
                className="absolute w-[150px] h-[150px] bg-gradient-to-r from-blue-400/15 to-transparent rounded-full blur-[40px] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{
                  left: `${smoothMousePosition.x - 75}px`,
                  top: `${smoothMousePosition.y - 75}px`,
                  transition: 'none',
                }}
              />
              
              <h3 className="text-xl font-bold text-blue-400 mb-4 flex items-center gap-2 group-hover:text-blue-300 transition-colors relative z-10">
                <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                </svg>
                Languages
              </h3>
              <div className="space-y-3 relative z-10">
                {languages.map((lang, index) => (
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
            </div>

            {/* Fun Facts */}
            <div 
              className="relative p-6 bg-gradient-to-br from-gray-800/50 to-gray-700/50 border border-gray-700/50 rounded-xl backdrop-blur-sm hover:from-gray-800/70 hover:to-gray-700/70 hover:border-purple-400/50 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-purple-500/10 group overflow-hidden"
              onMouseMove={handleMouseMove}
            >
              {/* Cursor-following gradient effects */}
              <div
                className="absolute w-[250px] h-[250px] bg-gradient-to-r from-purple-500/20 via-blue-500/15 to-transparent rounded-full blur-[60px] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{
                  left: `${smoothMousePosition.x - 125}px`,
                  top: `${smoothMousePosition.y - 125}px`,
                  transition: 'none',
                }}
              />
              <div
                className="absolute w-[150px] h-[150px] bg-gradient-to-r from-purple-400/15 to-transparent rounded-full blur-[40px] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{
                  left: `${smoothMousePosition.x - 75}px`,
                  top: `${smoothMousePosition.y - 75}px`,
                  transition: 'none',
                }}
              />
              
              <h3 className="text-xl font-bold text-purple-400 mb-4 flex items-center gap-2 group-hover:text-purple-300 transition-colors relative z-10">
                <svg className="w-5 h-5 group-hover:scale-110 group-hover:rotate-12 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                Fun Facts
              </h3>
              <ul className="space-y-2 text-gray-300 relative z-10">
                {funFacts.map((fact, index) => (
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
            </div>
          </div>
        </div>
        
        {/* Skills & Technologies */}
        <div className="mt-12">
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
                        animation: isVisible ? `fadeIn 0.5s ease-out ${index * 80}ms forwards` : 'none',
                        opacity: isVisible ? 0 : 1,
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
    </section>
  );
}

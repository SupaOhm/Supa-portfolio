import { useState } from 'react';

export default function About() {
  const [showDetails, setShowDetails] = useState(false);
  
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
          
          {/* Show All Details Section */}
          <div className="mt-10">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="group px-6 py-3 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-blue-500/20 hover:from-blue-500/30 hover:via-purple-500/30 hover:to-blue-500/30 border border-blue-400/30 hover:border-blue-400/50 rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/20"
            >
              <div className="flex items-center gap-2">
                <span className="text-base font-semibold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  {showDetails ? 'Hide' : 'Show'} More About Me
                </span>
                <svg
                  className={`w-4 h-4 text-blue-400 transition-transform duration-300 ${showDetails ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>

            {/* Details Panel */}
            <div
              className={`mt-6 overflow-hidden transition-all duration-500 ease-in-out ${
                showDetails ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
              }`}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Personal Information */}
                <div className="p-6 bg-gradient-to-br from-gray-800/50 to-gray-700/50 border border-gray-700/50 rounded-xl backdrop-blur-sm">
                  <h3 className="text-xl font-bold text-blue-400 mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Personal Information
                  </h3>
                  <div className="space-y-3 text-gray-300">
                    <div>
                      <span className="text-gray-400 text-sm">Full Name:</span>
                      <p className="font-medium">Supakorn Prayongyam</p>
                    </div>
                    <div>
                      <span className="text-gray-400 text-sm">Email:</span>
                      <p className="font-medium">ohm.supakornth@gmail.com</p>
                    </div>
                    <div>
                      <span className="text-gray-400 text-sm">Location:</span>
                      <p className="font-medium">Pathum Thani | Bangkok, Thailand</p>
                    </div>
                    
                    <div>
                      <span className="text-gray-400 text-sm">Education:</span>
                      <p className="font-medium">Computer Engineering | SIIT, Thammasat U.</p>
                    </div>
                    <div>
                      <span className="text-gray-400 text-sm">Availability:</span>
                      <p className="font-semibold text-green-400">Looking for Internships</p>
                    </div>
                  </div>
                </div>

                {/* Relevant Courses */}
                <div className="p-6 bg-gradient-to-br from-gray-800/50 to-gray-700/50 border border-gray-700/50 rounded-xl backdrop-blur-sm">
                  <h3 className="text-xl font-bold text-purple-400 mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01-.658 6.425A12.08 12.08 0 0112 21a12.08 12.08 0 01-5.502-3.997 12.083 12.083 0 01-.658-6.425L12 14z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14v7" />
                    </svg>
                    Relevant Courses
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {['Data Structures and Algorithms',
                      'Object-Oriented Programming',
                      'Algorithms Design',
                      'Software Engineering',
                      'Database Systems',
                      'Cloud Computing',
                      'Operating Systems',
                      'Computer Networks',
                      'Computer Architecture',
                      'Cybersecurity',
                      'Artificial Intelligence',
                      'Human-Computer Interface',
                    ].map((interest) => (
                      <span
                        key={interest}
                        className="px-3 py-1 bg-purple-500/20 border border-purple-400/30 rounded-full text-sm text-purple-300"
                      >
                        {interest}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Interests & Hobbies 
                <div className="p-6 bg-gradient-to-br from-gray-800/50 to-gray-700/50 border border-gray-700/50 rounded-xl backdrop-blur-sm">
                  <h3 className="text-xl font-bold text-purple-400 mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Interests & Hobbies
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {['Software Development', 'UI/UX Design', 'AI & Machine Learning', 'Database Design', 'Cybersecurity', 'Problem Solving', 'Gaming', 'Photography', 'Car Enthusiast'].map((interest) => (
                      <span
                        key={interest}
                        className="px-3 py-1 bg-purple-500/20 border border-purple-400/30 rounded-full text-sm text-purple-300"
                      >
                        {interest}
                      </span>
                    ))}
                  </div>
                </div> */}

                {/* Languages */}
                <div className="p-6 bg-gradient-to-br from-gray-800/50 to-gray-700/50 border border-gray-700/50 rounded-xl backdrop-blur-sm">
                  <h3 className="text-xl font-bold text-blue-400 mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                    </svg>
                    Languages
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-gray-300">Thai</span>
                        <span className="text-gray-400 text-sm">Native</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full" style={{ width: '100%' }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-gray-300">English</span>
                        <span className="text-gray-400 text-sm">Fluent</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full" style={{ width: '80%' }}></div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 text-xs">
                        <span className="font-bold">TU-GET CBT 90</span> (Equivalent to <span className="font-bold">IELTS 7.5</span>)
                      </span>
                      <a href="https://litu.tu.ac.th/wp-content/uploads/2023/10/TU-GET-CBT-aligned-with-IELTS-and-TOEFL-iBT.pdf" className="text-blue-400 text-xs underline" target="_blank" rel="noopener noreferrer">
                        [Source]
                      </a>
                    </div>
                  </div>
                </div>

                {/* Fun Facts */}
                <div className="p-6 bg-gradient-to-br from-gray-800/50 to-gray-700/50 border border-gray-700/50 rounded-xl backdrop-blur-sm">
                  <h3 className="text-xl font-bold text-purple-400 mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    Fun Facts
                  </h3>
                  <ul className="space-y-2 text-gray-300">
                    <li className="flex items-start gap-2">
                      <span className="text-blue-400 mt-1">•</span>
                      <span>I love trying new things</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-purple-400 mt-1">•</span>
                      <span>Always learning new technologies</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-400 mt-1">•</span>
                      <span>Passionate about software development</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-purple-400 mt-1">•</span>
                      <span>I learn fast through practical experience</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
          
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

import { useState, useRef, useEffect } from 'react';
import type { Project } from '../types/project';
import ProjectCard from './ProjectCard';

export default function Projects() {
  const [isCarouselView, setIsCarouselView] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [cardHeight, setCardHeight] = useState(600);
  const centerCardRef = useRef<HTMLDivElement>(null);

  const projects: Project[] = [
    {
      id: '1',
      title: 'Full-stack MERN Expense Tracker',
      description: 'Complete expense management application with RESTful API using Express and Mongoose. Features real-time expense calculation, CRUD operations, and React frontend with Axios integration for seamless data flow.',
      tags: ['MongoDB', 'Express.js', 'React', 'Node.js', 'RESTful APIs', 'Axios'],
      imageUrl: '/images/projects/expense.png',
      githubUrl: 'https://github.com/SupaOhm/Expense-Tracker',
      status: 'completed',
    },
    {
      id: '2',
      title: 'DressMe - AI-Powered Virtual Styling Assistant',
      description: 'Software engineering project developing a virtual styling assistant that generates personalized outfit recommendations from user-uploaded photos. Integrates body-type analysis, style preference modeling, and wardrobe-aware filtering within a modular recommendation pipeline. Designed with formal SRS documentation, UML use case modeling, BPMN workflows, and RESTful API architecture.',
      tags: ['Software Engineering', 'System Design', 'SRS Documentation', 'BPMN', 'UML', 'RESTful APIs', 'AI', 'Computer Vision'],
      imageUrl: '',
      githubUrl: '',
      status: 'in-progress',
    },
    {
      id: '3',
      title: 'Lost and Found Management System',
      description: 'Full-stack web application for lost and found item reporting with user authentication and admin approval workflows. Features normalized MySQL database with secure CRUD operations and responsive frontend interface.',
      tags: ['PHP', 'MySQL', 'HTML/CSS', 'Session Auth', 'Bootstrap'],
      imageUrl: '/images/projects/lostfound.png',
      githubUrl: 'https://github.com/SupaOhm/Lost-and-Found-Management-System',
      status: 'completed',
    },
    {
      id: '4',
      title: 'Voke - Cognitive Enforcement Alarm System',
      description: 'Mobile application engineered to enforce wakefulness using task-based interruption logic. Designed modular challenge engine with difficulty scaling, failure-state escalation, and anti-bypass mechanisms (app close detection, device shutdown penalty). Implemented persistent state tracking and gamified streak system to reinforce behavioral consistency.',
      tags: ['Flutter', 'Dart', 'Mobile Architecture', 'State Persistence', 'Gamification Systems'],
      imageUrl: '',
      githubUrl: '',
      status: 'planned',
    },
    {
      id: '5',
      title: 'Online Shop Database System',
      description: 'Designed and implemented a normalized relational database for an e-commerce platform. Created EERD models, obtained relational schema, and optimized MySQL queries for efficient data retrieval.',
      tags: ['MySQL', 'Database Design', 'Normalization'],
      imageUrl: '/images/projects/db.png',
      githubUrl: 'https://github.com/SupaOhm/onlineshop-DB',
      status: 'completed',
    },
    {
      id: '6',
      title: 'NoSleep CLI Tool',
      description: 'Lightweight Windows command-line utility that prevents system sleep mode and display shutdown. Simple yet effective solution for maintaining system activity during long-running tasks.',
      tags: ['Python', 'CLI', 'Windows', 'Operating System'],
      imageUrl: '/images/projects/nosleep.jpg',
      githubUrl: 'https://github.com/SupaOhm/NoSleep-CLI',
      status: 'completed',
    },
    {
      id: '7',
      title: 'Binary Matching Arduino Game',
      description: 'Educational embedded systems game for practicing binary to decimal conversion. Built with Arduino Uno R3, featuring LED displays and challenging players to match binary numbers with interactive gameplay.',
      tags: ['C++', 'Arduino', 'Embedded Systems'],
      imageUrl: '/images/projects/arduino.jpg',
      githubUrl: 'https://github.com/SupaOhm/Binary-Matching-Arduino-Game',
      status: 'completed',
    },
    {
      id: '8',
      title: 'Intrusion Detection as a Service',
      description: 'Research project developing a cloud-based intrusion detection system for both signature-based and anomaly-based detection using algorithms and machine learning. Focused on cloud deployment for scalable network security monitoring.',
      tags: ['IEEE', 'Research', 'Machine Learning', 'Cloud Computing', 'Cybersecurity'],
      imageUrl: '',
      githubUrl: '',
      status: 'in-progress',
    },
    {
      id: '9',
      title: 'Baka Platform UX/UI Overhaul',
      description: 'Ongoing collaboration with BAKA Co., Ltd. to redesign Baka Index, a sugarcane satellite-image platform using Google Earth Engine. Conducting user research among farmers, usability testing, and prototyping in Figma.',
      tags: ['Figma', 'UX/UI Research', 'Google Earth Engine'],
      imageUrl: '/images/projects/baka.jpg',
      githubUrl: '',
      status: 'in-progress',
    },
    {
      id: '10',
      title: 'Human Computer Interface Design Project',
      description: 'Course project designing a mobile bus routing application prototype applying HCI and usability principles. Focused on accessibility, visual hierarchy, and user experience flow through user research and iterative design.',
      tags: ['Figma', 'HCI', 'Mobile Design', 'UX/UI', 'Usability', 'User Research'],
      imageUrl: '/images/projects/hci.png',
      githubUrl: '',
      status: 'completed',
    }
  ];

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % projects.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + projects.length) % projects.length);
  };

  // Update card height when center card changes
  useEffect(() => {
    if (centerCardRef.current) {
      const height = centerCardRef.current.offsetHeight;
      setCardHeight(height);
    }
  }, [currentIndex]);

  // far-left (-2), left (-1), center (0), right (1), far-right (2)
  const getStyleForPosition = (position: -2 | -1 | 0 | 1 | 2) => {
    if (position === 0) {
      return {
        transform: 'translateX(0) scale(1) rotateY(0deg)',
        opacity: 1,
        zIndex: 30,
        filter: 'brightness(1.2)',
      };
    }
    if (position === 1) {
      return {
        transform: 'translateX(110%) scale(0.85) rotateY(-35deg)',
        opacity: 0.7,
        zIndex: 20,
        filter: 'brightness(0.7)',
      };
    }
    if (position === -1) {
      return {
        transform: 'translateX(-110%) scale(0.85) rotateY(35deg)',
        opacity: 0.7,
        zIndex: 20,
        filter: 'brightness(0.7)',
      };
    }
    if (position === 2) {
      return {
        transform: 'translateX(220%) scale(0.7) rotateY(-45deg)',
        opacity: 0,
        zIndex: 10,
        filter: 'brightness(0.5)',
      };
    }
    // position === -2
    return {
      transform: 'translateX(-220%) scale(0.7) rotateY(45deg)',
      opacity: 0,
      zIndex: 10,
      filter: 'brightness(0.5)',
    };
  };

  return (
    <section id="projects" className="py-20 px-4 sm:px-6 lg:px-8 relative">
      {/* Subtle background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/5 via-blue-900/5 to-transparent pointer-events-none" />
      
      <div className="max-w-6xl mx-auto relative z-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-blue-400 bg-clip-text text-transparent text-center flex-1">
            Featured Projects
          </h2>
          
          {/* View Toggle Button */}
          <button
            onClick={() => setIsCarouselView(!isCarouselView)}
            className="group flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-gray-800/50 to-gray-700/50 text-gray-300 rounded-lg hover:from-blue-500/20 hover:to-purple-500/20 hover:text-white transition-all duration-300 border border-gray-700/50 hover:border-blue-400/50 hover:shadow-lg hover:shadow-blue-500/20"
            aria-label="Toggle view"
          >
            {isCarouselView ? (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
                {/*<span className="text-sm font-medium hidden sm:inline">Grid</span>*/}
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                {/*<span className="text-sm font-medium hidden sm:inline">Carousel</span>*/}
              </>
            )}
          </button>
        </div>

        <p className="text-gray-400 text-center mb-12 max-w-2xl mx-auto">
          Here are some of my recent projects that showcase my skills and experience.
        </p>
        
        {isCarouselView ? (
          /* 3D Carousel View */
          <div className="relative overflow-x-hidden" style={{ minHeight: '500px' }}>
            <div className="relative py-12 flex items-center justify-center" style={{ minHeight: `${cardHeight + 96}px` }}>
              {/* Carousel Container */}
              <div className="relative w-full flex items-center justify-center" style={{ perspective: '2000px' }}>
                {(() => {
                  const leftIndex = (currentIndex - 1 + projects.length) % projects.length;
                  const rightIndex = (currentIndex + 1) % projects.length;
                  const farLeftIndex = (currentIndex - 2 + projects.length) % projects.length;
                  const farRightIndex = (currentIndex + 2) % projects.length;
                  const renderIndices = [farLeftIndex, leftIndex, currentIndex, rightIndex, farRightIndex];

                  return renderIndices.map((index) => {
                    const project = projects[index];
                    const isCenter = index === currentIndex;
                    const position: -2 | -1 | 0 | 1 | 2 = isCenter
                      ? 0
                      : index === leftIndex
                        ? -1
                        : index === rightIndex
                          ? 1
                          : index === farLeftIndex
                            ? -2
                            : 2;
                    const style = getStyleForPosition(position);

                    return (
                      <div
                        key={project.id}
                        ref={isCenter ? centerCardRef : null}
                        className="absolute w-[280px] sm:w-[360px] transition-all duration-700 ease-out cursor-pointer"
                        style={{
                          ...style,
                          transformStyle: 'preserve-3d',
                          willChange: 'transform, opacity',
                          pointerEvents: isCenter || position === -1 || position === 1 ? 'auto' : 'none',
                        }}
                        onClick={() => (position === -1 || position === 1) && setCurrentIndex(index)}
                      >
                        <div className={`${isCenter ? 'ring-4 ring-blue-500/60 shadow-[0_0_50px_rgba(59,130,246,0.5)]' : ''} rounded-xl overflow-hidden`}>
                          <ProjectCard project={project} />
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

            {/* Arrow Navigation */}
            <button
              onClick={handlePrev}
              className="absolute left-0 sm:left-4 top-64 bg-gray-800/70 hover:bg-gray-700 text-white px-1.5 py-8 sm:p-4 rounded-full backdrop-blur-sm transition-all duration-200 hover:scale-110 z-40 shadow-lg sm:shadow-xl"
              aria-label="Previous project"
            >
              <svg className="w-3.5 h-3.5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={handleNext}
              className="absolute right-0 sm:right-4 top-64 bg-gray-800/70 hover:bg-gray-700 text-white px-1.5 py-8 sm:p-4 rounded-full backdrop-blur-sm transition-all duration-200 hover:scale-110 z-40 shadow-lg sm:shadow-xl"
              aria-label="Next project"
            >
              <svg className="w-3.5 h-3.5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* Navigation Dots - Outside carousel container */}
            <div className="flex justify-center gap-2 mt-8">
              {projects.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`transition-all duration-300 rounded-full ${
                    currentIndex === index
                      ? 'bg-blue-500 w-8 h-3'
                      : 'bg-gray-600 hover:bg-gray-500 w-3 h-3'
                  }`}
                  aria-label={`Go to project ${index + 1}`}
                />
              ))}
            </div>
          </div>
        ) : (
          /* Grid View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project, index) => (
              <div
                key={project.id}
                style={{
                  animation: `fadeIn 0.6s ease-out ${index * 100}ms forwards`,
                  opacity: 0,
                }}
              >
                <ProjectCard project={project} />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

import { useState, useRef, useEffect, useMemo } from 'react';
import type { Project, ProjectCategory } from '../types/project';
import ProjectCard from './ProjectCard';

const PROJECTS: Project[] = [
  {
    id: '1',
    title: 'Full-stack MERN Expense Tracker',
    description:
      'Complete expense management application with RESTful API using Express and Mongoose. Features real-time expense calculation, CRUD operations, and React frontend with Axios integration for seamless data flow.',
    tags: ['MongoDB', 'Express.js', 'React', 'Node.js', 'RESTful APIs', 'Axios'],
    imageUrl: '/images/projects/expense.png',
    githubUrl: 'https://github.com/SupaOhm/Expense-Tracker',
    status: 'completed',
    categories: ['Web', 'Backend', 'Database'],
  },
  {
    id: '2',
    title: 'DressMe - AI-Powered Virtual Styling Assistant',
    description:
      'Software engineering project developing a virtual styling assistant that generates personalized outfit recommendations from user-uploaded photos. Integrates body-type analysis, style preference modeling, and wardrobe-aware filtering within a modular recommendation pipeline. Designed with formal SRS documentation, UML use case modeling, BPMN workflows, and RESTful API architecture.',
    tags: ['Software Engineering', 'System Design', 'SRS Documentation', 'BPMN', 'UML', 'RESTful APIs', 'AI', 'Computer Vision'],
    imageUrl: '',
    githubUrl: '',
    status: 'in-progress',
    categories: ['Mobile', 'AI', 'Backend'],
  },
  {
    id: '3',
    title: 'Lost and Found Management System',
    description:
      'Full-stack web application for lost and found item reporting with user authentication and admin approval workflows. Features normalized MySQL database with secure CRUD operations and responsive frontend interface.',
    tags: ['PHP', 'MySQL', 'HTML/CSS', 'Session Auth', 'Bootstrap'],
    imageUrl: '/images/projects/lostfound.png',
    githubUrl: 'https://github.com/SupaOhm/Lost-and-Found-Management-System',
    status: 'completed',
    categories: ['Web', 'Backend', 'Database'],
  },
  {
    id: '4',
    title: 'Voke - Cognitive Enforcement Alarm System',
    description:
      'Mobile application engineered to enforce wakefulness using task-based interruption logic. Designed modular challenge engine with difficulty scaling, failure-state escalation, and anti-bypass mechanisms (app close detection, device shutdown penalty). Implemented persistent state tracking and gamified streak system to reinforce behavioral consistency.',
    tags: ['Flutter', 'Dart', 'Mobile Architecture', 'State Persistence', 'Gamification Systems'],
    imageUrl: '',
    githubUrl: '',
    status: 'planned',
    categories: ['Mobile'],
  },
  {
    id: '5',
    title: 'Online Shop Database System',
    description:
      'Designed and implemented a normalized relational database for an e-commerce platform. Created EERD models, obtained relational schema, and optimized MySQL queries for efficient data retrieval.',
    tags: ['MySQL', 'Database Design', 'Normalization'],
    imageUrl: '/images/projects/db.png',
    githubUrl: 'https://github.com/SupaOhm/onlineshop-DB',
    status: 'completed',
    categories: ['Database'],
  },
  {
    id: '6',
    title: 'NoSleep CLI Tool',
    description:
      'Lightweight Windows command-line utility that prevents system sleep mode and display shutdown. Simple yet effective solution for maintaining system activity during long-running tasks.',
    tags: ['Python', 'CLI', 'Windows', 'Operating System'],
    imageUrl: '/images/projects/nosleep.jpg',
    githubUrl: 'https://github.com/SupaOhm/NoSleep-CLI',
    status: 'completed',
    categories: ['Tools'],
  },
  {
    id: '7',
    title: 'Binary Matching Arduino Game',
    description:
      'Educational embedded systems game for practicing binary to decimal conversion. Built with Arduino Uno R3, featuring LED displays and challenging players to match binary numbers with interactive gameplay.',
    tags: ['C++', 'Arduino', 'Embedded Systems'],
    imageUrl: '/images/projects/arduino.jpg',
    githubUrl: 'https://github.com/SupaOhm/Binary-Matching-Arduino-Game',
    status: 'completed',
    categories: ['Embedded'],
  },
  {
    id: '8',
    title: 'Intrusion Detection as a Service',
    description:
      'Research project developing a cloud-based intrusion detection system for both signature-based and anomaly-based detection using algorithms and machine learning. Focused on cloud deployment for scalable network security monitoring.',
    tags: ['IEEE', 'Research', 'Machine Learning', 'Cloud Computing', 'Cybersecurity'],
    imageUrl: '',
    githubUrl: '',
    status: 'in-progress',
    categories: ['Security', 'Cloud', 'AI'],
  },
  {
    id: '9',
    title: 'Baka Platform UX/UI Overhaul',
    description:
      'Ongoing collaboration with BAKA Co., Ltd. to redesign Baka Index, a sugarcane satellite-image platform using Google Earth Engine. Conducting user research among farmers, usability testing, and prototyping in Figma.',
    tags: ['Figma', 'UX/UI Research', 'Google Earth Engine'],
    imageUrl: '/images/projects/baka.jpg',
    githubUrl: '',
    status: 'in-progress',
    categories: ['Design'],
  },
  {
    id: '10',
    title: 'Human Computer Interface Design Project',
    description:
      'Course project designing a mobile bus routing application prototype applying HCI and usability principles. Focused on accessibility, visual hierarchy, and user experience flow through user research and iterative design.',
    tags: ['Figma', 'HCI', 'Mobile Design', 'UX/UI', 'Usability', 'User Research'],
    imageUrl: '/images/projects/hci.png',
    githubUrl: '',
    status: 'completed',
    categories: ['Design'],
  },
  {
    id: '11',
    title: 'RevRace - GPS Performance Tracking for Car Enthusiasts',
    description:
      'Mobile-first GPS performance tracking platform designed for street car enthusiasts to record, analyze, and share real-world driving stats. Captures live speed data, 0–100 km/h times, route history, and performance metrics with visualized dashboards. Includes shareable performance cards and community features for competitive comparison and engagement. Built with modular system architecture, real-time data processing, and RESTful API integration.',
    tags: ['Full-Stack Development', 'Mobile Development', 'GPS Data Processing', 'Real-Time Systems', 'RESTful APIs', 'Performance Analytics', 'Community Platform'],
    imageUrl: '',
    githubUrl: '',
    status: 'in-progress',
    categories: ['Mobile', 'Cloud', 'Backend'],
  },
];

const CATEGORY_ORDER: ProjectCategory[] = [
  'All',
  'Web',
  'Mobile',
  'Backend',
  'Database',
  'Tools',
  'Embedded',
  'Security',
  'Cloud',
  'AI',
  'Design',
];

type CarouselPosition = -2 | -1 | 0 | 1 | 2;

const getStyleForPosition = (position: CarouselPosition) => {
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

  return {
    transform: 'translateX(-220%) scale(0.7) rotateY(45deg)',
    opacity: 0,
    zIndex: 10,
    filter: 'brightness(0.5)',
  };
};

export default function Projects() {
  const [isCarouselView, setIsCarouselView] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [cardHeight, setCardHeight] = useState(600);
  const [selectedCategory, setSelectedCategory] = useState<ProjectCategory>('All');
  const centerCardRef = useRef<HTMLDivElement>(null);

  const filteredProjects = useMemo(
    () =>
      selectedCategory === 'All'
        ? PROJECTS
        : PROJECTS.filter((project) => project.categories.includes(selectedCategory)),
    [selectedCategory],
  );

  const categoryCounts = useMemo(() => {
    return CATEGORY_ORDER.map((category) => ({
      category,
      count: category === 'All' ? PROJECTS.length : PROJECTS.filter((project) => project.categories.includes(category)).length,
    }));
  }, []);

  const handleNext = () => {
    if (filteredProjects.length <= 1) {
      return;
    }

    setCurrentIndex((prev) => (prev + 1) % filteredProjects.length);
  };

  const handlePrev = () => {
    if (filteredProjects.length <= 1) {
      return;
    }

    setCurrentIndex((prev) => (prev - 1 + filteredProjects.length) % filteredProjects.length);
  };

  useEffect(() => {
    setCurrentIndex(0);
  }, [selectedCategory]);

  useEffect(() => {
    if (centerCardRef.current) {
      const height = centerCardRef.current.offsetHeight;
      setCardHeight(height);
    }
  }, [currentIndex, filteredProjects.length, isCarouselView]);

  const carouselItems = useMemo(() => {
    const totalProjects = filteredProjects.length;

    if (totalProjects === 0) {
      return [];
    }

    if (totalProjects === 1) {
      return [{ projectIndex: 0, position: 0 as CarouselPosition }];
    }

    if (totalProjects === 2) {
      const leftIndex = (currentIndex - 1 + totalProjects) % totalProjects;
      return [
        { projectIndex: leftIndex, position: -1 as CarouselPosition },
        { projectIndex: currentIndex, position: 0 as CarouselPosition },
      ];
    }

    const leftIndex = (currentIndex - 1 + totalProjects) % totalProjects;
    const rightIndex = (currentIndex + 1) % totalProjects;

    if (totalProjects === 3) {
      return [
        { projectIndex: leftIndex, position: -1 as CarouselPosition },
        { projectIndex: currentIndex, position: 0 as CarouselPosition },
        { projectIndex: rightIndex, position: 1 as CarouselPosition },
      ];
    }

    if (totalProjects === 4) {
      const farIndex = (currentIndex + 2) % totalProjects;
      return [
        { projectIndex: leftIndex, position: -1 as CarouselPosition },
        { projectIndex: currentIndex, position: 0 as CarouselPosition },
        { projectIndex: rightIndex, position: 1 as CarouselPosition },
        { projectIndex: farIndex, position: 2 as CarouselPosition },
      ];
    }

    const farLeftIndex = (currentIndex - 2 + totalProjects) % totalProjects;
    const farRightIndex = (currentIndex + 2) % totalProjects;

    return [
      { projectIndex: farLeftIndex, position: -2 as CarouselPosition },
      { projectIndex: leftIndex, position: -1 as CarouselPosition },
      { projectIndex: currentIndex, position: 0 as CarouselPosition },
      { projectIndex: rightIndex, position: 1 as CarouselPosition },
      { projectIndex: farRightIndex, position: 2 as CarouselPosition },
    ];
  }, [filteredProjects, currentIndex]);

  const carouselPositionByIndex = useMemo(() => {
    return new Map(carouselItems.map(({ projectIndex, position }) => [projectIndex, position]));
  }, [carouselItems]);

  return (
    <section id="projects" className="py-20 px-4 sm:px-6 lg:px-8 relative">
      {/* Subtle background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/5 via-blue-900/5 to-transparent pointer-events-none" />
      
      <div className="max-w-6xl mx-auto relative z-10">
        <p className="text-xs sm:text-sm uppercase tracking-[0.2em] text-blue-300/80 text-center mb-3">
          What I’ve Built
        </p>
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

        <p className="text-gray-400 text-center mb-8 max-w-2xl mx-auto">
          Projects that demonstrate my hands-on experience across web, mobile, and systems.
        </p>

        {/* Filter Buttons */}
        <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2 mb-8 max-w-5xl mx-auto">
          {categoryCounts.map(({ category, count }) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              aria-pressed={selectedCategory === category}
              className={`px-2.5 sm:px-3 py-1.5 rounded-md text-sm sm:text-base font-medium leading-tight tracking-wide transition-all duration-200 ${
                selectedCategory === category
                  ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-md shadow-blue-500/35 border border-blue-300/40'
                  : 'bg-gray-800/45 text-gray-300 border border-gray-700/50 hover:text-white hover:bg-gray-700/45 hover:border-blue-400/50'
              }`}
            >
              <span className="whitespace-nowrap">{category}</span>
              <span className="ml-1 text-xs sm:text-sm opacity-85">({count})</span>
            </button>
          ))}
        </div>
        
        {isCarouselView ? (
          /* 3D Carousel View */
          <div key={selectedCategory} className="relative overflow-x-hidden" style={{ minHeight: '500px' }}>
            <div className="relative py-12 flex items-center justify-center" style={{ minHeight: `${cardHeight + 96}px` }}>
              {/* Carousel Container */}
              <div className="relative w-full flex items-center justify-center" style={{ perspective: '2000px' }}>
                {filteredProjects.length > 0 ? (
                  filteredProjects.map((project, projectIndex) => {
                    const position = carouselPositionByIndex.get(projectIndex);

                    if (position === undefined) {
                      return null;
                    }

                    const isCenter = position === 0;
                    const style = getStyleForPosition(position);

                    return (
                      <div
                        key={`${selectedCategory}-${project.id}`}
                        ref={isCenter ? centerCardRef : null}
                        className={`w-[280px] sm:w-[360px] transition-all duration-700 ease-out ${
                          filteredProjects.length === 1 ? '' : 'absolute cursor-pointer'
                        }`}
                        style={{
                          ...style,
                          transformStyle: 'preserve-3d',
                          willChange: 'transform, opacity',
                          pointerEvents: isCenter || position === -1 || position === 1 ? 'auto' : 'none',
                        }}
                        onClick={() => {
                          if (position === -1 || position === 1) {
                            setCurrentIndex(projectIndex);
                          }
                        }}
                      >
                        <div
                          className={`${
                            isCenter ? 'ring-4 ring-blue-500/60 shadow-[0_0_50px_rgba(59,130,246,0.5)]' : ''
                          } rounded-xl overflow-hidden`}
                        >
                          <ProjectCard project={project} />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-20">
                    <p className="text-gray-400 text-lg">No projects found in this category.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Arrow Navigation */}
            {filteredProjects.length > 1 && (
              <>
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
              </>
            )}

            {/* Navigation Dots - Outside carousel container */}
            {filteredProjects.length > 1 && (
              <div className="flex justify-center gap-2 mt-8">
                {filteredProjects.map((_, index) => (
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
            )}
          </div>
        ) : (
          /* Grid View */
          <div key={selectedCategory}>
            {filteredProjects.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProjects.map((project, index) => (
                  <div
                    key={`${selectedCategory}-${project.id}`}
                    style={{
                      animation: `fadeIn 0.6s ease-out ${index * 100}ms forwards`,
                      opacity: 0,
                    }}
                  >
                    <ProjectCard project={project} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20">
                <p className="text-gray-400 text-lg">No projects found in this category.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

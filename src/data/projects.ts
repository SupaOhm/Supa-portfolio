import type { Project } from '../types/project';

export const PROJECTS: Project[] = [
  {
    id: '1',
    title: 'Full-Stack Expense Management',
    description:
      'Built a full-stack expense management web application with a React frontend and Express/MongoDB backend. Implemented secure CRUD operations, real-time expense calculations, and API integration with Axios to deliver a smooth end-to-end user workflow.',
    tags: ['MongoDB', 'Express.js', 'React', 'Node.js', 'RESTful APIs', 'Axios'],
    imageUrl: '/images/projects/expense.png',
    githubUrl: 'https://github.com/SupaOhm/Expense-Tracker',
    status: 'completed',
    categories: ['Web', 'Backend', 'Database'],
  },
  {
    id: '3',
    title: 'Lost and Found Management System',
    description:
      'Developed a full-stack web application for reporting and managing lost items with user authentication and admin approval workflows. Structured the system around a normalized MySQL database, secure CRUD operations, and a responsive interface for reliable day-to-day use.',
    tags: ['PHP', 'MySQL', 'HTML/CSS', 'Session Auth', 'Bootstrap'],
    imageUrl: '/images/projects/lostfound.png',
    githubUrl: 'https://github.com/SupaOhm/Lost-and-Found-Management-System',
    status: 'completed',
    categories: ['Web', 'Backend', 'Database'],
  },
  {
    id: '12',
    title: 'Salary Trend Analysis Using Least-Squares Regression',
    description:
      'Developed a Scientific Computing project to analyze how age, education level, and years of experience influence salary using multiple least-squares regression models. Built the workflow in Python with Jupyter Notebook, performed data cleaning and encoding, compared linear, polynomial, logarithmic, and exponential models using R², and identified polynomial regression (degree 3) as the best-performing approach for salary prediction.',
    tags: ['Python', 'Jupyter Notebook', 'Pandas', 'NumPy', 'Matplotlib', 'Scikit-learn', 'Regression Analysis', 'Data Analysis'],
    imageUrl: '/images/projects/scicom.png',
    githubUrl: '',
    status: 'completed',
    categories: ['Data', 'AI'],
  },
  {
    id: '6',
    title: 'NoSleep CLI Tool',
    description:
      'Built a lightweight Windows command-line utility to prevent system sleep and display shutdown during long-running tasks. Focused on solving a practical productivity problem through a simple, dependable developer tool.',
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
      'Built an educational embedded systems game on Arduino Uno R3 to help users practice binary-to-decimal conversion. Integrated LEDs and interactive game logic to create a hands-on learning experience with immediate visual feedback.',
    tags: ['C++', 'Arduino', 'Embedded Systems'],
    imageUrl: '/images/projects/arduino.jpg',
    githubUrl: 'https://github.com/SupaOhm/Binary-Matching-Arduino-Game',
    status: 'completed',
    categories: ['Embedded'],
  },
  {
    id: '5',
    title: 'Online Shop Database System',
    description:
      'Designed and implemented a normalized relational database for an e-commerce platform. Produced EERD models, translated them into relational schemas, and optimized MySQL queries for consistent and efficient data retrieval.',
    tags: ['MySQL', 'Database Design', 'Normalization'],
    imageUrl: '/images/projects/db.png',
    githubUrl: 'https://github.com/SupaOhm/onlineshop-DB',
    status: 'completed',
    categories: ['Database'],
  },
  {
    id: '10',
    title: 'Human Computer Interface Design Project',
    description:
      'Designed a mobile bus routing prototype as part of an HCI course project, applying usability and accessibility principles throughout the design process. Conducted user research, refined information hierarchy, and iterated on interface flows to improve overall user experience.',
    tags: ['Figma', 'HCI', 'Mobile Design', 'UX/UI', 'Usability', 'User Research'],
    imageUrl: '/images/projects/hci.png',
    githubUrl: '',
    status: 'completed',
    categories: ['Design'],
  },
  {
    id: '4',
    title: 'Voke - Cognitive Enforcement Alarm System',
    description:
      'Planned a mobile alarm application focused on behavior-driven wakefulness enforcement. Defined a modular challenge system with difficulty scaling, failure-state escalation, anti-bypass logic, persistent progress tracking, and gamified streak mechanics to encourage consistency.',
    tags: ['Flutter', 'Dart', 'Mobile Architecture', 'State Persistence', 'Gamification Systems'],
    imageUrl: '',
    githubUrl: '',
    status: 'planned',
    categories: ['Mobile'],
  },
  {
    id: '11',
    title: 'RevRace - GPS Performance Tracking Platform',
    description:
      'Designed a mobile-first platform for car enthusiasts to capture, analyze, and share real-world driving performance. Built the product concept around live GPS telemetry, 0-100 km/h timing, route history, performance dashboards, and community-facing comparison features, with emphasis on modular architecture, real-time data processing, and API-driven system design.',
    tags: ['Full-Stack Development', 'Mobile Development', 'GPS Data Processing', 'Real-Time Systems', 'RESTful APIs', 'Performance Analytics', 'Community Platform'],
    imageUrl: '/images/projects/revrace.jpeg',
    githubUrl: '',
    status: 'in-progress',
    categories: ['Mobile', 'Cloud', 'Backend'],
  },
  {
    id: '2',
    title: 'DressMe - AI-Powered Virtual Styling Assistant',
    description:
      'Co-developed a software engineering project for generating personalized outfit recommendations from user-uploaded photos. Designed a modular recommendation pipeline combining body-type analysis, style preference modeling, and wardrobe-aware filtering, supported by formal SRS documentation, UML use cases, BPMN workflows, and RESTful API planning.',
    tags: ['Software Engineering', 'System Design', 'SRS Documentation', 'BPMN', 'UML', 'RESTful APIs', 'AI', 'Computer Vision'],
    imageUrl: '/images/projects/dressme.png',
    githubUrl: '',
    status: 'in-progress',
    categories: ['Mobile', 'AI', 'Backend'],
  },
  {
    id: '8',
    title: 'Intrusion Detection System as a Service (IDSaaS)',
    description:
      'Designed a multi-tenant cloud security platform for real-time log ingestion and threat detection. Combined signature-based detection with machine learning-driven anomaly analysis, with a focus on scalable stream processing, cloud-native architecture, and practical security monitoring for shared environments.',
    tags: ['IEEE', 'Research', 'Machine Learning', 'Cloud Computing', 'Cybersecurity'],
    imageUrl: '/images/projects/IDSaaS.png',
    githubUrl: '',
    status: 'in-progress',
    categories: ['Security', 'Cloud', 'AI'],
  },
  {
    id: '9',
    title: 'Baka Platform UX/UI Overhaul',
    description:
      'Collaborating with BAKA Co., Ltd. to redesign Baka Index, a sugarcane analytics platform powered by Google Earth Engine. Conducting user research with farmers, evaluating usability pain points, and translating findings into clearer interaction flows and higher-fidelity Figma prototypes.',
    tags: ['Figma', 'UX/UI Research', 'Google Earth Engine'],
    imageUrl: '/images/projects/baka.jpg',
    githubUrl: '',
    status: 'in-progress',
    categories: ['Design'],
  },
];

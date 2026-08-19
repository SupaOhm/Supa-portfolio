import type { Project } from '../types/project';

export const PROJECTS: Project[] = [
  {
    id: 'baka-ux-overhaul',
    title: 'Baka Platform UX/UI Overhaul',
    description:
      'Baka Index is a sugarcane analytics platform built on Google Earth Engine, and its users are farmers rather than analysts. Working with BAKA Co., Ltd., I run user research with those farmers, find where the current interface loses them, and translate the findings into clearer interaction flows and higher-fidelity Figma prototypes.',
    tags: ['Figma', 'UX/UI Research', 'Google Earth Engine'],
    imageUrl: '/images/projects/baka.webp',
    githubUrl: '',
    status: 'in-progress',
    categories: ['Design'],
  },
  {
    id: 'idsaas',
    title: 'Intrusion Detection System as a Service (IDSaaS)',
    description:
      'Signature-based detection only catches attacks someone has already named. IDSaaS pairs it with machine-learning anomaly analysis so unnamed behaviour surfaces too, then runs both over real-time log ingestion for many tenants at once. The hard parts are stream processing that scales and keeping detection trustworthy in a shared environment.',
    tags: ['IEEE', 'Research', 'Machine Learning', 'Cloud Computing', 'Cybersecurity'],
    imageUrl: '/images/projects/IDSaaS.webp',
    githubUrl: '',
    status: 'in-progress',
    categories: ['Security', 'Cloud', 'AI'],
  },
  {
    id: 'revrace',
    title: 'RevRace - GPS Performance Tracking Platform',
    description:
      'Published 0-100 km/h figures come from a closed track and a professional driver. RevRace measures the car you actually own on the road you actually drive: live GPS telemetry, timed runs, route history, and dashboards that put your numbers beside other drivers’. Built mobile-first around real-time data processing and a modular, API-driven architecture.',
    tags: ['Full-Stack Development', 'Mobile Development', 'GPS Data Processing', 'Real-Time Systems', 'RESTful APIs', 'Performance Analytics', 'Community Platform'],
    imageUrl: '/images/projects/revrace.webp',
    githubUrl: '',
    status: 'in-progress',
    categories: ['Mobile', 'Cloud', 'Backend'],
  },
  {
    id: 'expense-tracker',
    title: 'Full-Stack Expense Management',
    description:
      'Built a full-stack expense management web application with a React frontend and Express/MongoDB backend. Implemented secure CRUD operations, real-time expense calculations, and API integration with Axios to deliver a smooth end-to-end user workflow.',
    tags: ['MongoDB', 'Express.js', 'React', 'Node.js', 'RESTful APIs', 'Axios'],
    imageUrl: '/images/projects/expense.webp',
    githubUrl: 'https://github.com/SupaOhm/Expense-Tracker',
    status: 'completed',
    categories: ['Web', 'Backend', 'Database'],
  },
  {
    id: 'dressme',
    title: 'DressMe - AI-Powered Virtual Styling Assistant',
    description:
      'Co-developed a software engineering project for generating personalized outfit recommendations from user-uploaded photos. Designed a modular recommendation pipeline combining body-type analysis, style preference modeling, and wardrobe-aware filtering, supported by formal SRS documentation, UML use cases, BPMN workflows, and RESTful API planning.',
    tags: ['Software Engineering', 'System Design', 'SRS Documentation', 'BPMN', 'UML', 'RESTful APIs', 'AI', 'Computer Vision'],
    imageUrl: '/images/projects/dressme.webp',
    githubUrl: '',
    status: 'in-progress',
    categories: ['Mobile', 'AI', 'Backend'],
  },
  {
    id: 'lost-and-found',
    title: 'Lost and Found Management System',
    description:
      'Developed a full-stack web application for reporting and managing lost items with user authentication and admin approval workflows. Structured the system around a normalized MySQL database, secure CRUD operations, and a responsive interface for reliable day-to-day use.',
    tags: ['PHP', 'MySQL', 'HTML/CSS', 'Session Auth', 'Bootstrap'],
    imageUrl: '/images/projects/lostfound.webp',
    githubUrl: 'https://github.com/SupaOhm/Lost-and-Found-Management-System',
    status: 'completed',
    categories: ['Web', 'Backend', 'Database'],
  },
  {
    id: 'salary-regression',
    title: 'Salary Trend Analysis Using Least-Squares Regression',
    description:
      'Developed a Scientific Computing project to analyze how age, education level, and years of experience influence salary using multiple least-squares regression models. Built the workflow in Python with Jupyter Notebook, performed data cleaning and encoding, compared linear, polynomial, logarithmic, and exponential models using R², and identified polynomial regression (degree 3) as the best-performing approach for salary prediction.',
    tags: ['Python', 'Jupyter Notebook', 'Pandas', 'NumPy', 'Matplotlib', 'Scikit-learn', 'Regression Analysis', 'Data Analysis'],
    imageUrl: '/images/projects/scicom.webp',
    githubUrl: '',
    status: 'completed',
    categories: ['Data', 'AI'],
  },
  {
    id: 'online-shop-db',
    title: 'Online Shop Database System',
    description:
      'Designed and implemented a normalized relational database for an e-commerce platform. Produced EERD models, translated them into relational schemas, and optimized MySQL queries for consistent and efficient data retrieval.',
    tags: ['MySQL', 'Database Design', 'Normalization'],
    imageUrl: '/images/projects/db.webp',
    githubUrl: 'https://github.com/SupaOhm/onlineshop-DB',
    status: 'completed',
    categories: ['Database'],
  },
  {
    id: 'nosleep-cli',
    title: 'NoSleep CLI Tool',
    description:
      'Built a lightweight Windows command-line utility to prevent system sleep and display shutdown during long-running tasks. Focused on solving a practical productivity problem through a simple, dependable developer tool.',
    tags: ['Python', 'CLI', 'Windows', 'Operating System'],
    imageUrl: '/images/projects/nosleep.webp',
    githubUrl: 'https://github.com/SupaOhm/NoSleep-CLI',
    status: 'completed',
    categories: ['Tools'],
  },
  {
    id: 'hci-bus-routing',
    title: 'Human Computer Interface Design Project',
    description:
      'Designed a mobile bus routing prototype as part of an HCI course project, applying usability and accessibility principles throughout the design process. Conducted user research, refined information hierarchy, and iterated on interface flows to improve overall user experience.',
    tags: ['Figma', 'HCI', 'Mobile Design', 'UX/UI', 'Usability', 'User Research'],
    imageUrl: '/images/projects/hci.webp',
    githubUrl: '',
    status: 'completed',
    categories: ['Design', 'Mobile'],
  },
  {
    id: 'binary-arduino-game',
    title: 'Binary Matching Arduino Game',
    description:
      'Built an educational embedded systems game on Arduino Uno R3 to help users practice binary-to-decimal conversion. Integrated LEDs and interactive game logic to create a hands-on learning experience with immediate visual feedback.',
    tags: ['C++', 'Arduino', 'Embedded Systems'],
    imageUrl: '/images/projects/arduino.webp',
    githubUrl: 'https://github.com/SupaOhm/Binary-Matching-Arduino-Game',
    status: 'completed',
    categories: ['Embedded'],
  },
  {
    id: 'voke',
    title: 'Voke - Cognitive Enforcement Alarm System',
    description:
      'Planned a mobile alarm application focused on behavior-driven wakefulness enforcement. Defined a modular challenge system with difficulty scaling, failure-state escalation, anti-bypass logic, persistent progress tracking, and gamified streak mechanics to encourage consistency.',
    tags: ['Flutter', 'Dart', 'Mobile Architecture', 'State Persistence', 'Gamification Systems'],
    githubUrl: '',
    status: 'planned',
    categories: ['Mobile'],
  },
];

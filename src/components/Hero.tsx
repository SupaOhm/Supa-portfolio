import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

// Add or remove items from this array to customize what gets typed
const WORDS = [
  'Computer Engineering Student',
  'Software Dev',
  'Tech Enthusiast', 
  'Quick Learner',
  'Problem Solver',
  'Full-stack Dev',
];

export default function Hero() {
  const [displayedText, setDisplayedText] = useState('');
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [smoothMousePosition, setSmoothMousePosition] = useState({ x: 0, y: 0 });
  const mouseRef = useRef(mousePosition);
  const location = useLocation();
  const navigate = useNavigate();
  const typingSpeed = 80;
  const deletingSpeed = 50;
  const pauseDuration = 2000;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  // Keep latest mouse position in a ref to avoid re-registering the loop
  useEffect(() => {
    mouseRef.current = mousePosition;
  }, [mousePosition]);

  // Smooth cursor tracking with easing (single rAF loop)
  useEffect(() => {
    let animationFrameId: number;

    const smoothMove = () => {
      setSmoothMousePosition((prev) => ({
        x: prev.x + (mouseRef.current.x - prev.x) * 0.1,
        y: prev.y + (mouseRef.current.y - prev.y) * 0.1,
      }));
      animationFrameId = requestAnimationFrame(smoothMove);
    };

    animationFrameId = requestAnimationFrame(smoothMove);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  useEffect(() => {
    const currentWord = WORDS[currentWordIndex];
    let timeout: number;

    if (!isDeleting && displayedText === currentWord) {
      // Finished typing
      timeout = setTimeout(() => setIsDeleting(true), pauseDuration);
    } else if (isDeleting && displayedText === '') {
      // Finished deleting
      setIsDeleting(false);
      setCurrentWordIndex((prev) => (prev + 1) % WORDS.length);
    } else if (isDeleting) {
      // Deleting
      timeout = setTimeout(() => {
        setDisplayedText(currentWord.substring(0, displayedText.length - 1));
      }, deletingSpeed);
    } else {
      // Typing
      timeout = setTimeout(() => {
        setDisplayedText(currentWord.substring(0, displayedText.length + 1));
      }, typingSpeed);
    }

    return () => clearTimeout(timeout);
  }, [displayedText, currentWordIndex, isDeleting]);
  
  // Match Navbar logic: navigate to '/' then scroll, or just scroll if already on '/'
  const handleSectionClick = (id: string) => {
    if (location.pathname !== '/') {
      navigate('/', { state: { targetId: id } });
    } else {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <section 
      id="home" 
      className="relative min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 pt-16 overflow-hidden"
      onMouseMove={handleMouseMove}
    >
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-purple-900/20 to-pink-900/20 animate-gradient" />
      
      {/* Primary cursor-following glow - smooth and large */}
      <div
        className="absolute w-[500px] h-[500px] bg-gradient-to-r from-blue-500/15 via-purple-500/10 to-transparent rounded-full blur-[80px] pointer-events-none"
        style={{
          left: `${smoothMousePosition.x - 250}px`,
          top: `${smoothMousePosition.y - 250}px`,
          transition: 'none',
        }}
      />
      
      {/* Secondary accent glow - more subtle */}
      <div
        className="absolute w-[300px] h-[300px] bg-gradient-to-r from-blue-400/10 to-transparent rounded-full blur-[60px] pointer-events-none"
        style={{
          left: `${smoothMousePosition.x - 150}px`,
          top: `${smoothMousePosition.y - 150}px`,
          transition: 'none',
        }}
      />
      
      {/* Floating orbs */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-float-delayed" />

      <div className="max-w-4xl mx-auto text-center relative z-10">
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 animate-fade-in">
          Hi, I'm <span 
            onClick={() => handleSectionClick('about')}
            className="text-blue-400 hover:text-blue-300 hover:animate-pulse transition-colors cursor-pointer"
          >Supakorn Prayongyam</span>
        </h1>
        
        {/* Typing animation */}
        <div className="text-lg sm:text-xl md:text-2xl text-gray-300 mb-4 h-8 flex items-center justify-center">
          <span className="font-mono">{displayedText}</span>
          <span className="inline-block w-0.5 h-6 bg-blue-400 ml-1 animate-blink" />
        </div>
        
        <p className="text-base sm:text-lg text-gray-400 mb-2">
          Computer Engineering Student | SIIT, Thammasat University
        </p>
        
        <p className="text-sm text-gray-500 mb-4">
          3rd Year | GPA 3.23 | Pathum Thani, Thailand
        </p>
        
        <p className="text-base sm:text-lg text-gray-400 mb-12 max-w-2xl mx-auto">
          Fascinated by building full-stack applications, designing APIs, and working with relational and NoSQL databases.
          Seeking a Software Engineer internship to contribute to reliable systems while growing as an engineer.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
          <button
            type="button"
            onClick={() => handleSectionClick('projects')}
            className="group px-8 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-all duration-200 shadow-lg hover:shadow-blue-500/50 hover:shadow-xl hover:-translate-y-0.5"
          >
            View Projects
            <span className="inline-block ml-2 group-hover:translate-x-1 transition-transform">→</span>
          </button>
          <button
            type="button"
            onClick={() => handleSectionClick('connect')}
            className="group px-8 py-3 bg-gray-800 text-white rounded-lg font-medium hover:bg-gray-700 transition-all duration-200 border border-gray-700 hover:border-blue-500 hover:-translate-y-0.5 hover:font-semibold shadow-lg hover:shadow-blue-500/30"
          >
            Get in Touch
          </button>
        </div>

        {/* Scroll indicator */}
        <button type="button" onClick={() => handleSectionClick('about')} className="inline-block animate-bounce cursor-pointer">
          <svg className="w-6 h-6 text-gray-400 hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </button>
      </div>
    </section>
  );
}

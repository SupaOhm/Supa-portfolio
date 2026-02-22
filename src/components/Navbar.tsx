import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const NAV_LINKS = [
  { id: 'home', label: 'Home', type: 'route' as const },
  { id: 'about', label: 'About', type: 'section' as const },
  { id: 'skills', label: 'Skills', type: 'section' as const },
  { id: 'projects', label: 'Projects', type: 'section' as const },
  { id: 'connect', label: 'Connect', type: 'section' as const },
] as const;

const SECTION_IDS = NAV_LINKS.map(link => link.id);
const SCROLL_THRESHOLD = 50;
const VISIBILITY_THRESHOLD = 0.1;

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<string>('home');

  const handleSectionClick = useCallback((id: string) => {
    if (location.pathname !== '/') {
      navigate('/', { state: { targetId: id } });
    } else {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
    setIsMenuOpen(false);
  }, [location.pathname, navigate]);

  const isLinkActive = useCallback((linkId: string) => {
    return location.pathname === '/' && activeSection === linkId;
  }, [location.pathname, activeSection]);

  const updateActiveSection = useCallback(() => {
    const elements = SECTION_IDS
      .map((sectionId) => document.getElementById(sectionId))
      .filter((el): el is HTMLElement => !!el);

    if (elements.length === 0) return;

    let mostVisibleElement: HTMLElement | null = null;
    let maxOccupancy = 0;

    elements.forEach((el) => {
      const rect = el.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      
      const visibleHeight = Math.max(0, Math.min(viewportHeight, rect.bottom) - Math.max(0, rect.top));
      const occupancy = visibleHeight / viewportHeight;

      if (occupancy > maxOccupancy) {
        maxOccupancy = occupancy;
        mostVisibleElement = el;
      }
    });

    if (maxOccupancy > VISIBILITY_THRESHOLD && mostVisibleElement) {
      const element: HTMLElement = mostVisibleElement;
      setActiveSection(element.id);
    }
  }, []);

  // Detect scroll to change navbar appearance
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > SCROLL_THRESHOLD);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Track which section is in view on Home for active indicator
  useEffect(() => {
    if (location.pathname !== '/') {
      return;
    }

    let aboutSection: HTMLElement | null = null;

    window.addEventListener('scroll', updateActiveSection);
    
    // Handle About section expand/collapse
    aboutSection = document.getElementById('about');
    if (aboutSection) {
      aboutSection.addEventListener('transitionend', updateActiveSection);
    }

    updateActiveSection();

    return () => {
      window.removeEventListener('scroll', updateActiveSection);
      if (aboutSection) {
        aboutSection.removeEventListener('transitionend', updateActiveSection);
      }
    };
  }, [location.pathname, updateActiveSection]);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      isScrolled 
        ? 'bg-gray-900/95 backdrop-blur-md border-b border-blue-500/20 shadow-lg shadow-blue-500/10' 
        : 'bg-gray-900/50 backdrop-blur-sm border-b border-gray-800/50'
    }`}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left section: Logo and GitHub */}
          <div className="flex items-center gap-4">
            {/* Logo with gradient */}
            <button
              onClick={() => handleSectionClick('home')}
              className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent hover:from-blue-300 hover:to-purple-300 transition-all duration-300 hover:scale-105"
            >
              Portfolio
            </button>

            {/* GitHub Icon Button */}
            <a
              href="https://github.com/SupaOhm"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-blue-400 transition-all duration-300 hover:scale-110 p-2 hover:bg-blue-500/10 rounded-lg"
              aria-label="GitHub Profile"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z" clipRule="evenodd" />
              </svg>
            </a>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {NAV_LINKS.map((link) => (
              <button
                key={link.id}
                onClick={() => handleSectionClick(link.id)}
                className={`relative px-4 py-2 text-sm font-medium transition-all duration-300 group ${
                  isLinkActive(link.id) ? 'text-blue-400' : 'text-gray-300 hover:text-white'
                }`}
              >
                {link.label}
                <span className={`absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-blue-400 to-purple-400 transition-all duration-300 ${isLinkActive(link.id) ? 'w-full' : 'w-0 group-hover:w-full'}`} />
              </button>
            ))}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden text-gray-300 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-400 rounded p-2 transition-all duration-300 hover:bg-gray-800/50"
            aria-label="Toggle menu"
            aria-expanded={isMenuOpen}
          >
            {isMenuOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile Menu with smooth transition */}
        <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isMenuOpen ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0'
        }`}>
          <div className="md:hidden py-4 border-t border-gray-800">
            {NAV_LINKS.map((link) => (
              <button
                key={link.id}
                onClick={() => handleSectionClick(link.id)}
                className={`block w-full text-left px-4 py-2 text-sm font-medium transition-all duration-200 rounded ${
                  isLinkActive(link.id) ? 'bg-blue-500/10 text-blue-400 border-l-2 border-blue-400' : 'text-gray-300 hover:text-white hover:bg-gray-800/50'
                }`}
              >
                {link.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}

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
      className="relative min-h-screen flex items-center px-4 sm:px-6 lg:px-8 pt-16 overflow-hidden bg-grid-pattern bg-[#030712]"
      onMouseMove={handleMouseMove}
    >
      {/* Primary cursor-following glow - scaled down for structural feel */}
      <div
        className="absolute w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-[80px] pointer-events-none mix-blend-screen"
        style={{
          left: `${smoothMousePosition.x - 200}px`,
          top: `${smoothMousePosition.y - 200}px`,
          transition: 'none',
        }}
      />
      
      <div className="max-w-7xl mx-auto w-full relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center pt-10">
        
        {/* Left column: Text Content */}
        <div className="text-left relative marker-cross marker-cross-tl marker-cross-tr marker-cross-bl marker-cross-br p-6 sm:p-10 border border-gray-800/50 bg-gray-950/60 backdrop-blur-md">
          <p className="font-mono text-blue-400 mb-4 text-sm uppercase tracking-widest">// Initializing_Profile</p>
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 animate-fade-in tracking-tight">
            Hi, I'm <span 
              onClick={() => handleSectionClick('about')}
              className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 transition-colors cursor-pointer hover:opacity-80"
            >Supakorn</span>
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-gray-200 to-gray-500">Prayongyam</span>
          </h1>
          
          {/* Typing animation */}
          <div className="text-lg sm:text-xl text-gray-300 mb-8 h-8 flex items-center justify-start">
            <span className="font-mono text-blue-300">&gt; </span>
            <span className="font-mono ml-2 text-gray-200">{displayedText}</span>
            <span className="inline-block w-2.5 h-6 bg-blue-500 ml-1 animate-blink" />
          </div>
          
          <div className="font-mono text-xs sm:text-sm text-gray-400 mb-10 border-l-2 border-gray-700 pl-5 py-2 space-y-2">
            <p><span className="text-gray-500">PROGRAM    :</span> Computer Engineering, SIIT Thammasat</p>
            <p><span className="text-gray-500">YEAR       :</span> 3rd Year [GPA: 3.23]</p>
            <p><span className="text-gray-500">LOCATION   :</span> Pathum Thani, Thailand</p>
            <div className="mt-4 pt-4 border-t border-gray-800/50 text-gray-300 max-w-lg leading-relaxed font-sans text-base">
              Fascinated by building full-stack applications, designing APIs, and working with relational and NoSQL databases. Seeking a Software Engineer internship to contribute to reliable systems.
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-start">
            <button
              type="button"
              onClick={() => handleSectionClick('projects')}
              className="group px-8 py-3 bg-blue-500 text-gray-950 font-bold uppercase tracking-wider text-sm transition-all shadow-tactile border-2 border-transparent"
            >
              View Projects
              <span className="inline-block ml-2 group-hover:translate-x-1 transition-transform">→</span>
            </button>
            <button
              type="button"
              onClick={() => handleSectionClick('connect')}
              className="group px-8 py-3 bg-gray-900 text-gray-300 font-bold uppercase tracking-wider text-sm transition-all shadow-tactile-dark border-2 border-gray-600 focus:outline-none"
            >
              Get in Touch
            </button>
          </div>
        </div>

        {/* Right column: Blueprint Technical Display */}
        <div className="hidden lg:flex justify-center items-center relative h-full min-h-[500px] w-full">
           <div className="absolute inset-0 bg-dot-pattern opacity-30" />
           
           {/* Technical framing lines */}
           <div className="absolute top-0 right-0 w-32 h-32 border-t-[1px] border-r-[1px] border-blue-500/40" />
           <div className="absolute bottom-0 left-0 w-32 h-32 border-b-[1px] border-l-[1px] border-purple-500/40" />
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-[1px] bg-gradient-to-r from-transparent via-gray-700/50 to-transparent" />
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-full w-[1px] bg-gradient-to-b from-transparent via-gray-700/50 to-transparent" />

           {/* Floating Code Block */}
           <div className="relative z-10 p-6 border-[1px] border-gray-700/80 bg-gray-900/80 backdrop-blur-md shadow-2xl transform rotate-2 hover:rotate-0 transition-all duration-500 hover:shadow-[0_0_30px_rgba(59,130,246,0.15)] shadow-blue-900/20">
             <div className="flex gap-2 mb-4 border-b border-gray-700/50 pb-2">
               <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
               <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
               <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
             </div>
             <pre className="font-mono text-sm leading-relaxed text-blue-300/90">
{`const developer = {
  name: "Supakorn P.",
  role: "Full-Stack Dev",
  core_stack: [
    "TypeScript",
    "React",
    "Node.js",
    "SQL/NoSQL"
  ],
  passion: [
    "System Design",
    "Scalable APIs"
  ],
  status: "Seeking Internship"
  
};

// Ready to build
developer.initialize();`}
             </pre>
             <div className="absolute -bottom-3 -right-3 text-[10px] font-mono text-gray-500 bg-gray-900 px-1 border border-gray-800">
               SYS_ACTV
             </div>
           </div>
           
           {/* Floating crosshairs */}
           <div className="absolute top-1/4 left-1/4 w-4 h-4 text-blue-500/40 font-mono text-xs">+</div>
           <div className="absolute bottom-1/4 right-1/4 w-4 h-4 text-purple-500/40 font-mono text-xs">+</div>
        </div>

        {/* Scroll indicator - redesigned as a rigid arrow */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center">
          <div className="w-[1px] h-12 bg-gradient-to-b from-blue-500 to-transparent animate-pulse" />
          <button type="button" onClick={() => handleSectionClick('about')} className="text-blue-500 font-mono text-xs mt-2 uppercase tracking-widest hover:text-white transition-colors">
            Scroll
          </button>
        </div>
      </div>
    </section>
  );
}

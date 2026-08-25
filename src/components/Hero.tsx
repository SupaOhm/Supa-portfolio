import { useLocation, useNavigate } from 'react-router-dom';
import { useTypewriter } from '../hooks/useTypewriter';
import { useCursorGlow } from '../hooks/useCursorGlow';
import { currentScrollBehavior } from '../lib/scrollBehavior';
import { ACADEMIC_YEAR, GPA, INSTITUTION, LOCATION, PROGRAM } from '../data/profile';

// Add or remove items from this array to customize what gets typed.
// Each entry should be a role the work behind it can back up.
const WORDS = [
  'Computer Engineering Student',
  'Security Researcher',
  'AI & RAG Developer',
  'Backend Engineer',
  'Full-Stack Developer',
];

export default function Hero() {
  const displayedText = useTypewriter(WORDS);
  const handleMouseMove = useCursorGlow();
  const location = useLocation();
  const navigate = useNavigate();

  // Match Navbar logic: navigate to '/' then scroll, or just scroll if already on '/'
  const handleSectionClick = (id: string) => {
    if (location.pathname !== '/') {
      navigate('/', { state: { targetId: id } });
    } else {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: currentScrollBehavior() });
      }
    }
  };

  return (
    <section
      id="home"
      aria-labelledby="hero-heading"
      className="relative min-h-screen flex items-center px-4 sm:px-6 lg:px-8 pt-16 overflow-hidden bg-grid-pattern bg-[#030712]"
      onMouseMove={handleMouseMove}
    >
      {/* Primary cursor-following glow - scaled down for structural feel */}
      <div className="cursor-glow w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-[80px] pointer-events-none mix-blend-screen" />
      
      <div className="max-w-7xl mx-auto w-full relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center pt-10">
        
        {/* Left column: Text Content */}
        <div className="text-left relative marker-cross marker-cross-tl marker-cross-tr marker-cross-bl marker-cross-br p-6 sm:p-10 border border-gray-800/50 bg-gray-950/60 backdrop-blur-md">
          <p className="font-mono text-blue-400 mb-4 text-sm uppercase tracking-widest">// Initializing_Profile</p>
          <div className="mb-6 animate-fade-in">
            <p className="mb-3 font-mono text-xs uppercase tracking-[0.35em] text-gray-400">
              Hola World
            </p>
            <h1 id="hero-heading" className="text-5xl sm:text-6xl md:text-7xl lg:text-[5.5rem] font-black text-white tracking-[-0.04em] leading-[0.92]">
              <span className="block text-transparent bg-clip-text bg-linear-to-r from-blue-300 via-cyan-200 to-blue-500">
                Supakorn
              </span>
              <span className="block text-gray-100">Prayongyam</span>
              <span className="mt-4 block max-w-2xl text-lg sm:text-xl md:text-2xl font-medium tracking-[-0.02em] text-gray-300">
                SIIT, Thammasat University
              </span>
            </h1>
          </div>
          
          {/* Typing animation */}
          <div className="text-lg sm:text-xl text-gray-300 mb-8 h-8 flex items-center justify-start">
            <span className="font-mono text-blue-300">&gt; </span>
            <span className="font-mono ml-2 text-gray-200">{displayedText}</span>
            <span className="inline-block w-2.5 h-6 bg-blue-500 ml-1 animate-blink" />
          </div>
          
          <div className="font-mono text-xs sm:text-sm text-gray-400 mb-10 border-l-2 border-gray-700 pl-5 py-2 space-y-2">
            <p><span className="text-gray-400">PROGRAM    :</span> {PROGRAM}, {INSTITUTION}</p>
            <p><span className="text-gray-400">YEAR       :</span> {ACADEMIC_YEAR} [GPA: {GPA}]</p>
            <p><span className="text-gray-400">LOCATION   :</span> {LOCATION}</p>
            <div className="mt-4 pt-4 border-t border-gray-800/50 text-gray-300 max-w-lg leading-relaxed font-sans text-base">
              Cybersecurity and AI/RAG systems. Co-author of ESNIDSaaS, winner of the Best Paper Award at IEEE IMC 2026. Building things whose behaviour you can measure, and looking for a Software Engineer internship.
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
              className="group px-8 py-3 bg-gray-900 text-gray-300 font-bold uppercase tracking-wider text-sm transition-all shadow-tactile-dark border-2 border-gray-600 focus:outline-hidden focus:ring-2 focus:ring-blue-400"
            >
              Get in Touch
            </button>
          </div>
        </div>

        {/* Right column: Blueprint Technical Display */}
        <div className="hidden lg:flex justify-center items-center relative h-full min-h-[500px] w-full">
           <div className="absolute inset-0 bg-dot-pattern opacity-30" />
           
           {/* Technical framing lines */}
           <div className="absolute top-0 right-0 w-32 h-32 border-t border-r border-blue-500/40" />
           <div className="absolute bottom-0 left-0 w-32 h-32 border-b border-l border-purple-500/40" />
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-px bg-linear-to-r from-transparent via-gray-700/50 to-transparent" />
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-full w-px bg-linear-to-b from-transparent via-gray-700/50 to-transparent" />

           {/* Floating Code Block */}
           <div className="relative z-10 p-6 border border-gray-700/80 bg-gray-900/80 backdrop-blur-md shadow-2xl transform rotate-2 hover:rotate-0 transition-all duration-500 hover:shadow-[0_0_30px_rgba(59,130,246,0.15)] shadow-blue-900/20">
             <div className="flex gap-2 mb-4 border-b border-gray-700/50 pb-2">
               <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
               <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
               <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
             </div>
             <pre className="font-mono text-sm leading-relaxed text-blue-300/90">
{`const developer = {
  name: "Supakorn P.",
  role: "Computer Engineering Student",
  core_stack: [
    "JavaScript/TypeScript",
    "React",
    "Node.js",
    "SQL/NoSQL"
  ],
  passion: [
    "Artificial Intelligence",
    "Networking",
    "Full-stack Development",
    "Database Design"
  ],
  status: "Looking for Internship"
  
};

// Ready to build
developer.initialize();`}
             </pre>
             <div className="absolute -bottom-3 -right-3 text-[10px] font-mono text-gray-400 bg-gray-900 px-1 border border-gray-800">
               SYS_ACTV
             </div>
           </div>
           
           {/* Floating crosshairs */}
           <div className="absolute top-1/4 left-1/4 w-4 h-4 text-blue-500/40 font-mono text-xs">+</div>
           <div className="absolute bottom-1/4 right-1/4 w-4 h-4 text-purple-500/40 font-mono text-xs">+</div>
        </div>

        {/* Scroll indicator - redesigned as a rigid arrow */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center">
          <div className="w-px h-12 bg-linear-to-b from-blue-500 to-transparent animate-pulse" />
          <button type="button" onClick={() => handleSectionClick('about')} className="text-blue-500 font-mono text-xs mt-2 uppercase tracking-widest hover:text-white transition-colors">
            Scroll
          </button>
        </div>
      </div>
    </section>
  );
}

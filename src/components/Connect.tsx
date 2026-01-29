import { useState, useRef, useEffect } from 'react';

export default function Connect() {
  const [hoveredLink, setHoveredLink] = useState<string | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [smoothMousePosition, setSmoothMousePosition] = useState({ x: 0, y: 0 });
  const [showAllDetails, setShowAllDetails] = useState(false);
  const [fullHover, setFullHover] = useState<{ name: string | null; x: number; y: number }>({ name: null, x: 0, y: 0 });
  const mouseRef = useRef(mousePosition);

  // Keep latest mouse position in a ref
  useEffect(() => {
    mouseRef.current = mousePosition;
  }, [mousePosition]);

  // Smooth cursor tracking with easing (single rAF loop)
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

  const handleMouseMove = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const contactLinks = [
    {
      name: 'Phone',
      href: 'tel:+66895772122',
      detail: '(+66)\u00A089\u00A0577\u00A02122',
      description: '',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
        </svg>
      ),
    },
    {
      name: 'Email',
      href: 'mailto:ohm.supakornth@gmail.com',
      detail: 'ohm.supakornth@gmail.com',
      description: '',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      name: 'GitHub',
      href: 'https://github.com/SupaOhm',
      detail: '@SupaOhm',
      description: '',
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path fillRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z" clipRule="evenodd" />
        </svg>
      ),
    },
    {
      name: 'LinkedIn',
      href: 'https://linkedin.com/in/supakornpra',
      detail: '/in/supakornpra',
      description: '',
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
        </svg>
      ),
    },
  ];

  return (
    <section id="connect" className="py-20 px-4 sm:px-6 lg:px-8 relative">
      {/* Subtle background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/5 via-purple-900/5 to-transparent pointer-events-none" />
      
      <div className="max-w-4xl mx-auto text-center relative z-10">
        <h2 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-blue-400 bg-clip-text text-transparent mb-4">
          Get In Touch
        </h2>
        <p className="text-gray-400 mb-10 max-w-2xl mx-auto">
          I'm currently looking for internship opportunities. Whether you have a question 
          or just want to say hi, feel free to reach out!
        </p>

        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 flex-wrap mb-8">
          {contactLinks.map((link, index) => (
            <div
              key={link.name}
              className="relative"
              onMouseEnter={() => setHoveredLink(link.name)}
              onMouseLeave={() => setHoveredLink(null)}
            >
              <a
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                onMouseMove={handleMouseMove}
                className={`group flex flex-col items-center justify-center gap-2 rounded-xl border backdrop-blur-sm overflow-hidden relative transition-all duration-700 ease-in-out ${
                  hoveredLink === link.name
                    ? 'bg-gradient-to-br from-blue-500/60 via-purple-500/50 to-blue-600/60 shadow-2xl shadow-blue-500/60 border-blue-400/90 text-white'
                    : 'bg-gradient-to-r from-gray-800/50 to-gray-700/50 text-gray-300 border-gray-700/50 hover:border-blue-400/50 hover:shadow-lg hover:shadow-blue-500/20'
                }`}
                style={{
                  animation: `fadeIn 0.5s ease-out ${index * 100}ms forwards`,
                  opacity: 0,
                  width: hoveredLink === link.name ? '224px' : '120px',
                  height: hoveredLink === link.name ? '128px' : '96px',
                  padding: hoveredLink === link.name ? '24px' : '12px 16px',
                  transition: 'width 300ms ease-in-out, height 300ms ease-in-out, padding 300ms ease-in-out, all 300ms ease-in-out',
                }}
              >
                {/* Cursor-following gradient effects */}
                {hoveredLink === link.name && (
                  <>
                    <div
                      className="absolute w-[160px] h-[160px] bg-gradient-to-r from-blue-400/30 via-purple-400/25 to-transparent rounded-full blur-[50px] pointer-events-none opacity-100"
                      style={{
                        left: `${smoothMousePosition.x - 80}px`,
                        top: `${smoothMousePosition.y - 80}px`,
                        transition: 'none',
                      }}
                    />
                    <div
                      className="absolute w-[100px] h-[100px] bg-gradient-to-r from-blue-300/25 to-transparent rounded-full blur-[30px] pointer-events-none opacity-100"
                      style={{
                        left: `${smoothMousePosition.x - 50}px`,
                        top: `${smoothMousePosition.y - 50}px`,
                        transition: 'none',
                      }}
                    />
                  </>
                )}
                
                <span className={`relative z-10 transition-transform duration-300 ${hoveredLink === link.name ? 'scale-125' : 'scale-100'}`}>
                  {link.icon}
                </span>
                
                {hoveredLink === link.name ? (
                  <div className="flex flex-col items-center gap-1 animate-in fade-in duration-300 relative z-10">
                    <span className="font-bold text-sm">{link.name}</span>
                    <span className="text-xs font-semibold text-blue-100">{link.detail}</span>
                    <span className="text-xs text-blue-50 text-center leading-tight">{link.description}</span>
                  </div>
                ) : (
                  <span className="font-medium relative z-10 transition-opacity duration-500 ease-in-out">{link.name}</span>
                )}
              </a>
            </div>
          ))}
        </div>

        <div className="flex justify-center mb-8">
          <button
            onClick={() => setShowAllDetails((prev) => !prev)}
            aria-expanded={showAllDetails}
            className="px-4 py-3 rounded-full bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-blue-500/20 hover:from-blue-500/30 hover:via-purple-500/30 hover:to-blue-500/30 border border-blue-400/40 hover:border-blue-400/70 text-xs font-semibold text-blue-100 transition-all duration-300 shadow-sm hover:shadow-blue-500/20"
          >
            {showAllDetails ? 'Hide All Contact Details' : 'Show All Contact Details'}
          </button>
        </div>

        <div
          className={`mb-10 overflow-hidden transition-all duration-500 ease-in-out ${
            showAllDetails
              ? 'max-h-[1000px] opacity-100 translate-y-0'
              : 'max-h-0 opacity-0 -translate-y-2 pointer-events-none'
          }`}
        >
          <span className="block mb-6 text-center text-blue-200 font-bold text-xl">Supakorn Prayongyam</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
            {contactLinks.map((link) => (
              <a
                key={`full-${link.name}`}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                onMouseEnter={() => setFullHover((prev) => ({ ...prev, name: link.name }))}
                onMouseLeave={() => setFullHover({ name: null, x: 0, y: 0 })}
                onMouseMove={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setFullHover({
                    name: link.name,
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top,
                  });
                }}
                className="group relative overflow-hidden flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-gray-800/60 to-gray-700/60 border border-gray-700/60 hover:border-blue-400/60 hover:from-blue-900/20 hover:to-purple-900/20 transition-all duration-300"
              >
                {fullHover.name === link.name && (
                  <>
                    <span
                      className="pointer-events-none absolute w-[140px] h-[140px] bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-transparent rounded-full blur-[40px] opacity-80"
                      style={{
                        left: `${fullHover.x - 70}px`,
                        top: `${fullHover.y - 70}px`,
                      }}
                    />
                    <span
                      className="pointer-events-none absolute w-[80px] h-[80px] bg-gradient-to-r from-blue-300/25 to-transparent rounded-full blur-[24px] opacity-80"
                      style={{
                        left: `${fullHover.x - 40}px`,
                        top: `${fullHover.y - 40}px`,
                      }}
                    />
                  </>
                )}
                <span className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <span className="absolute -inset-6 bg-gradient-to-r from-blue-500/15 via-purple-500/15 to-pink-500/15 blur-3xl" />
                </span>
                <span className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-500/10 text-blue-200">
                  {link.icon}
                </span>
                <div className="flex flex-col">
                  <span className="text-md font-semibold text-white">{link.name}</span>
                  <span className="text-sm text-blue-100">{link.detail}</span>
                </div>
              </a>
            ))}
          </div>
        </div>
        {/*
        <div className="flex justify-center gap-3 mt-8">
          <a
            href="/Resume.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-gray-800/60 to-gray-700/60 border border-gray-700/60 hover:border-blue-400/60 hover:from-blue-900/20 hover:to-purple-900/20 text-gray-300 hover:text-white transition-all duration-300 text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="font-medium">Resume</span>
          </a>
          <a
            href="/Transcript.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-gray-800/60 to-gray-700/60 border border-gray-700/60 hover:border-blue-400/60 hover:from-blue-900/20 hover:to-purple-900/20 text-gray-300 hover:text-white transition-all duration-300 text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="font-medium">Transcript</span>
          </a>
        </div> */}
      </div>
    </section>
  );
}

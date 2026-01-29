export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t border-gray-800/50 bg-gradient-to-r from-gray-900/50 via-gray-950 to-gray-900/50 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <p className="text-gray-400 text-sm">
            © {currentYear} <span className="font-semibold">Supakorn P.</span> Built with <span className="text-blue-400 font-bold">React</span>, <span className="text-purple-400 font-bold">TypeScript</span> & <span className="text-pink-400 font-bold">Tailwind CSS</span>.
          </p>
        </div>
        <div className="h-px bg-gradient-to-r from-transparent via-gray-700/50 to-transparent" />
        <div className="mt-6 text-center">
          <p className="text-gray-500 text-sm">
            ohm.supakornth@gmail.com
          </p>
        </div>
      </div>
    </footer>
  );
}

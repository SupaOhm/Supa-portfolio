import { EMAIL } from '../data/profile';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="font-system relative border-t border-rule/50 px-6 py-12 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-[980px]">
        <div className="text-center mb-8">
          <p className="text-[13px] text-neutral">
            © {currentYear} <span className="font-semibold">Supakorn P.</span> Built with <span className="text-blue-300 font-bold">React</span>, <span className="text-purple-300 font-bold">TypeScript</span> & <span className="text-pink-300 font-bold">Tailwind CSS</span>.
          </p>
        </div>
        <div className="h-px bg-linear-to-r from-transparent via-rule/70 to-transparent" />
        <div className="mt-6 text-center">
          <p className="text-[13px] text-neutral">
            {EMAIL}
          </p>
        </div>
      </div>
    </footer>
  );
}

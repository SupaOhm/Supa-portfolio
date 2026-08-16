import { Link } from 'react-router-dom';

/**
 * Rendered for any URL the route table does not match.
 *
 * Required by the catch-all rewrite in vercel.json: because every unmatched
 * path is now handed to index.html, an unknown URL would otherwise render
 * nothing at all between Navbar and Footer.
 *
 * This is a soft 404 — Vercel returns HTTP 200 because a rewrite cannot set a
 * status code. Correct for a human, imperfect for a crawler; a true 404 status
 * would need a serverless function. See the spec's decision D2.
 */
export default function NotFound() {
  return (
    <main className="min-h-[60vh] flex items-center justify-center px-4 sm:px-6 lg:px-8 py-20">
      <div className="text-center max-w-lg">
        <p className="font-mono text-blue-400 mb-4 text-sm uppercase tracking-widest">
          // Error_404
        </p>
        <h1 className="text-4xl sm:text-5xl font-black tracking-[-0.03em] mb-4">
          Page not found
        </h1>
        <p className="text-gray-400 mb-8 leading-relaxed">
          That URL does not exist. It may have been mistyped, or the link that
          brought you here may be out of date.
        </p>
        <Link
          to="/"
          className="inline-block px-6 py-3 rounded-md border border-blue-500/40 bg-blue-500/10 text-blue-300 hover:border-blue-400/70 hover:text-blue-200 transition-colors duration-200"
        >
          Back to portfolio
        </Link>
      </div>
    </main>
  );
}

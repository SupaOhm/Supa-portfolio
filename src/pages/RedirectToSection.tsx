import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface RedirectToSectionProps {
  id: string;
}

/**
 * Resolves a standalone section URL (/about, /projects, /connect) onto the
 * single canonical page.
 *
 * These sections render only inside `Home`, which owns the <main> and <h1>
 * (via `Hero`) for whichever route is actually on screen — `NotFound` renders
 * its own pair for the catch-all route, but only one route is ever mounted at
 * a time, so the DOM never has more than one of each. Serving a section on
 * its own route would publish a page with neither landmark and no active nav
 * highlight (Navbar.tsx:23 disables it when pathname !== '/'), so these URLs
 * redirect rather than render.
 *
 * `replace: true` is required, not cosmetic: without it the section URL stays
 * in session history, so pressing Back returns to /about, which immediately
 * redirects forward again and traps the visitor.
 *
 * The scroll itself is not performed here — `Home` already has an effect that
 * reads `location.state.targetId` (Home.tsx:13-19). This component only
 * supplies that state.
 */
export default function RedirectToSection({ id }: RedirectToSectionProps) {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/', { replace: true, state: { targetId: id } });
  }, [navigate, id]);

  return null;
}

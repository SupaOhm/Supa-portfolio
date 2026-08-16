import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

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
  const location = useLocation();

  useEffect(() => {
    // Preserves the query string (e.g. ?utm_source=linkedin) across the
    // redirect, so shared campaign links keep their tracking params instead
    // of losing them the moment the visitor lands.
    navigate(
      { pathname: '/', search: location.search },
      { replace: true, state: { targetId: id } },
    );
    // Depends on location.search rather than the whole location object:
    // `location` is a new reference on every navigation (including the one
    // this effect itself triggers), which would refire the effect after
    // every redirect and loop. location.search is a primitive string, so it
    // only changes when the actual query string changes.
  }, [navigate, id, location.search]);

  return null;
}

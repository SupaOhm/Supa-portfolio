// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Home from './Home';
import { resetGitHubCache } from '../lib/githubCache';

/**
 * Home is the canonical page: `/` renders every section, and the three
 * redirect routes all land here. RedirectToSection.dom.test.tsx already
 * covers the `location.state.targetId` path end to end through <App />.
 *
 * What that leaves untested, and what this file covers, is the rest of
 * Home's mount effect: the `window.location.hash` fallback (the deep-link
 * path a shared /#connect URL takes, which no redirect route exercises),
 * the precedence between the two, and — most importantly — that a plain
 * visit to `/` scrolls nowhere at all.
 */

afterEach(() => {
  cleanup();
  // jsdom shares one window across every test in the file, so a hash left
  // set here would silently become the input to the next test.
  window.location.hash = '';
});

beforeEach(() => {
  // githubCache holds a module-level in-flight map that leaks between files
  // in the same worker.
  resetGitHubCache();
  // About and Connect fetch on mount. A never-settling promise holds them on
  // their static fallback copy with no state update after the test body.
  vi.stubGlobal(
    'fetch',
    vi.fn(() => new Promise(() => {})),
  );
  vi.mocked(Element.prototype.scrollIntoView).mockClear();
});

const scrollSpy = () => vi.mocked(Element.prototype.scrollIntoView);

const renderHome = (entry: string | { pathname: string; state?: unknown } = '/') =>
  render(
    <MemoryRouter initialEntries={[entry as string]}>
      <Home />
    </MemoryRouter>,
  );

/**
 * scrollToSection defers through setTimeout(…, 0). The mount effect has
 * already queued that timeout by the time render() returns, so a timeout
 * queued now runs strictly after it — which is what makes a "did not
 * scroll" assertion meaningful rather than merely early.
 */
const afterDeferredScroll = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('Home composition', () => {
  it('stacks all five sections in order', () => {
    // The navbar scrolls by element id and useActiveSection measures these
    // same ids. A section dropped or renamed here breaks both silently:
    // scrollIntoView is never reached because getElementById returns null.
    const { container } = renderHome();

    const ids = [...container.querySelectorAll('section[id], div[id]')]
      .map((el) => el.id)
      .filter((id) => ['home', 'about', 'skills', 'projects', 'connect'].includes(id));

    expect(ids).toEqual(['home', 'about', 'skills', 'projects', 'connect']);
  });

  it('renders the page inside a single main landmark', () => {
    renderHome();

    expect(screen.getByRole('main')).toBeInTheDocument();
  });
});

describe('Home scroll targeting', () => {
  it('does not scroll on a plain visit to /', async () => {
    // The regression this guards: an effect that scrolls unconditionally
    // yanks a first-time visitor off the hero before they have read it.
    renderHome('/');
    await afterDeferredScroll();

    expect(scrollSpy()).not.toHaveBeenCalled();
  });

  it('scrolls to the section named in navigation state', async () => {
    renderHome({ pathname: '/', state: { targetId: 'projects' } });

    await waitFor(() => {
      expect(scrollSpy()).toHaveBeenCalled();
      // `contexts` records each call's `this` — the scrolled element. Asserting
      // the id is the difference between "something scrolled" and "the right
      // section scrolled".
      expect((scrollSpy().mock.contexts[0] as Element).id).toBe('projects');
    });
  });

  it('scrolls to the section named in the URL hash', async () => {
    // The deep-link path: someone shares /#connect, or the browser restores a
    // hashed URL. No redirect route produces this, so nothing else covers it.
    window.location.hash = '#connect';
    renderHome('/');

    await waitFor(() => {
      expect((scrollSpy().mock.contexts[0] as Element).id).toBe('connect');
    });
  });

  it('prefers navigation state over a conflicting hash', async () => {
    // Both inputs can be live at once: a stale #about in the address bar while
    // the navbar pushes state for another section. State is the newer intent.
    window.location.hash = '#about';
    renderHome({ pathname: '/', state: { targetId: 'skills' } });

    await waitFor(() => {
      expect((scrollSpy().mock.contexts[0] as Element).id).toBe('skills');
    });
  });

  it('ignores a hash that matches no section', async () => {
    // A hash is user-supplied and can name anything, so Home routinely hands
    // scrollToSection an id that is not on the page. That the helper bails on
    // a null element is its own contract, covered by
    // useActiveSection.dom.test.tsx:158 with fake timers; what this asserts is
    // the Home-level consequence — the page still mounts and stays put.
    window.location.hash = '#no-such-section';
    renderHome('/');
    await afterDeferredScroll();

    expect(scrollSpy()).not.toHaveBeenCalled();
    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  it('ignores navigation state carrying no targetId', async () => {
    renderHome({ pathname: '/', state: { from: '/somewhere' } });
    await afterDeferredScroll();

    expect(scrollSpy()).not.toHaveBeenCalled();
  });

  it('scrolls once per mount, not once per section', async () => {
    // The effect reads one target and scrolls to it. Scrolling repeatedly
    // would fight the smooth-scroll animation already in flight.
    renderHome({ pathname: '/', state: { targetId: 'about' } });
    await waitFor(() => expect(scrollSpy()).toHaveBeenCalled());
    await afterDeferredScroll();

    expect(scrollSpy()).toHaveBeenCalledTimes(1);
  });
});

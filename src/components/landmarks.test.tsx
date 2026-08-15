// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Hero from './Hero';
import About from './About';
import Skills from './Skills';
import Projects from './Projects';
import Connect from './Connect';
import Navbar from './Navbar';

afterEach(cleanup);

beforeEach(() => {
  // About and Connect fetch the GitHub profile on mount. A never-settling promise
  // keeps them on their static fallback copy with no state update after the test
  // body, which would otherwise warn about updates outside act().
  vi.stubGlobal(
    'fetch',
    vi.fn(() => new Promise(() => {})),
  );
});

/**
 * A bare <section> has no implicit ARIA role. It is exposed as a `region`
 * landmark only once it has an accessible name, so getByRole('region', { name })
 * finding the element is itself the assertion that aria-labelledby resolved.
 */
describe('section landmarks', () => {
  it('names the hero section after its h1', () => {
    render(
      <MemoryRouter>
        <Hero />
      </MemoryRouter>,
    );
    // jsdom loads no CSS, so the block-level separators the accname algorithm
    // would insert in a browser are absent. Match by regex to tolerate both forms.
    expect(
      screen.getByRole('region', { name: /Supakorn\s*Prayongyam\s*SIIT, Thammasat University/ }),
    ).toBeInTheDocument();
  });

  it('names the about section after its h2', () => {
    render(<About />);
    expect(screen.getByRole('region', { name: 'About Me' })).toBeInTheDocument();
  });

  it('names the skills section after its h2', () => {
    render(<Skills />);
    expect(screen.getByRole('region', { name: 'Skills & Technologies' })).toBeInTheDocument();
  });

  it('names the projects section after its h2', () => {
    render(<Projects />);
    expect(screen.getByRole('region', { name: 'Featured Projects' })).toBeInTheDocument();
  });

  it('names the connect section after its h2', () => {
    render(<Connect />);
    expect(screen.getByRole('region', { name: 'Get In Touch' })).toBeInTheDocument();
  });

  it('names the primary navigation', () => {
    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>,
    );
    expect(screen.getByRole('navigation', { name: 'Main' })).toBeInTheDocument();
  });
});

// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import Navbar from './Navbar';

/**
 * These tests assert ATTRIBUTE OUTPUT, not focusability. jsdom does not implement
 * inert semantics and would report descendants of an inert subtree as focusable, so
 * a "not focusable" assertion here would be testing jsdom, not the browser.
 * Real focusability is covered by the manual keyboard pass in the plan's final task.
 */

// @testing-library/react's auto-cleanup only registers itself when a global
// `afterEach` exists (see its index.js), which requires vitest's `test.globals: true`.
// This project's vite.config.ts does not set that (Task 1's setup.ts imports `vi`
// explicitly rather than relying on globals), so each render() otherwise accumulates
// in the shared per-file jsdom document and later tests see duplicate "Toggle menu"
// buttons. Clean up explicitly instead of touching the global config.
afterEach(cleanup);

const renderNavbar = () =>
  render(
    <MemoryRouter>
      <Navbar />
    </MemoryRouter>,
  );

describe('Navbar mobile menu', () => {
  it('marks the menu inert while it is collapsed', () => {
    renderNavbar();
    const toggle = screen.getByRole('button', { name: /toggle menu/i });
    const menuId = toggle.getAttribute('aria-controls');
    expect(menuId).toBeTruthy();

    const menu = document.getElementById(menuId as string);
    expect(menu).not.toBeNull();
    expect(menu).toHaveAttribute('inert');
  });

  it('removes inert once the menu is open', async () => {
    const user = userEvent.setup();
    renderNavbar();
    const toggle = screen.getByRole('button', { name: /toggle menu/i });

    await user.click(toggle);

    const menu = document.getElementById(toggle.getAttribute('aria-controls') as string);
    expect(menu).not.toHaveAttribute('inert');
  });

  it('keeps aria-expanded in step with the menu state', async () => {
    const user = userEvent.setup();
    renderNavbar();
    const toggle = screen.getByRole('button', { name: /toggle menu/i });

    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
  });

  it('points aria-controls at an element that exists', () => {
    renderNavbar();
    const toggle = screen.getByRole('button', { name: /toggle menu/i });
    expect(document.getElementById(toggle.getAttribute('aria-controls') as string)).not.toBeNull();
  });
});

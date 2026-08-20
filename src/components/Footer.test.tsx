// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import Footer from './Footer';
import { EMAIL } from '../data/profile';

afterEach(cleanup);

describe('Footer', () => {
  it('shows the contact address from the single source of truth', () => {
    render(<Footer />);

    expect(screen.getByText(EMAIL)).toBeInTheDocument();
  });

  it('shows the current year', () => {
    render(<Footer />);

    const year = String(new Date().getFullYear());
    expect(screen.getByText(new RegExp(year))).toBeInTheDocument();
  });
});

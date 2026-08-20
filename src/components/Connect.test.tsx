// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import Connect from './Connect';
import {
  EMAIL_HREF,
  GITHUB_AVATAR_URL,
  GITHUB_PROFILE_URL,
  LINKEDIN_URL,
  PHONE_HREF,
} from '../data/profile';

const mockUseGitHubProfile = vi.fn();

// Without this the suite hits the real GitHub API on every run, against a
// 60-request-per-hour unauthenticated limit shared with local development.
vi.mock('../hooks/useGitHubProfile', () => ({
  useGitHubProfile: (username: string) => mockUseGitHubProfile(username),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const hrefs = () =>
  screen.getAllByRole('link').map((link) => link.getAttribute('href'));

describe('Connect with no GitHub data', () => {
  it('renders rather than crashing when the profile never arrives', () => {
    // CLAUDE.md states that a failed or malformed response renders blanks
    // rather than crashing, because every field is optional-chained. Nothing
    // tested that until now.
    mockUseGitHubProfile.mockReturnValue({ profile: null, isLoading: false });

    expect(() => render(<Connect />)).not.toThrow();
    expect(screen.getByRole('heading', { name: /get in touch/i })).toBeInTheDocument();
  });

  it('falls back to the derived avatar URL', () => {
    mockUseGitHubProfile.mockReturnValue({ profile: null, isLoading: false });

    render(<Connect />);

    const avatar = screen.getByAltText(/github avatar/i);
    expect(avatar).toHaveAttribute('src', GITHUB_AVATAR_URL);
  });

  it('still offers every way to make contact', () => {
    mockUseGitHubProfile.mockReturnValue({ profile: null, isLoading: false });

    render(<Connect />);

    const all = hrefs();
    expect(all).toContain(EMAIL_HREF);
    expect(all).toContain(PHONE_HREF);
    expect(all).toContain(GITHUB_PROFILE_URL);
    expect(all).toContain(LINKEDIN_URL);
  });
});

describe('Connect with GitHub data', () => {
  const PROFILE = {
    login: 'SupaOhm',
    avatarUrl: 'https://avatars.example/supaohm.png',
    profileUrl: 'https://github.com/SupaOhm',
    displayName: 'Supakorn Prayongyam',
    bio: 'Cybersecurity and AI/RAG systems.',
    location: 'Pathum Thani, Thailand',
    hireable: true,
    repositories: 24,
    followers: 12,
    totalStars: 30,
    sinceYear: 2022,
    updatedAt: '2026-08-01T00:00:00Z',
    topLanguage: 'TypeScript',
    mostStarredRepo: { name: 'AckLab', stars: 10, url: 'https://github.com/SupaOhm/AckLab' },
  };

  it('prefers the live avatar over the derived one', () => {
    mockUseGitHubProfile.mockReturnValue({ profile: PROFILE, isLoading: false });

    render(<Connect />);

    expect(screen.getByAltText(/github avatar/i)).toHaveAttribute('src', PROFILE.avatarUrl);
  });

  it('shows the fetched display name and bio', () => {
    mockUseGitHubProfile.mockReturnValue({ profile: PROFILE, isLoading: false });

    render(<Connect />);

    // Brief deviation: PROFILE.displayName ('Supakorn Prayongyam') collides
    // with a hardcoded <span> of the same text in the "Show All Contact
    // Details" panel (Connect.tsx:174), which is always in the DOM
    // regardless of GitHub data. A bare getByText matches both and throws.
    // The GitHub profile card's own name renders in a <p> (Connect.tsx:219),
    // so scope to that tag to disambiguate without weakening the assertion.
    expect(screen.getByText(PROFILE.displayName, { selector: 'p' })).toBeInTheDocument();
    expect(screen.getByText(PROFILE.bio)).toBeInTheDocument();
  });
});

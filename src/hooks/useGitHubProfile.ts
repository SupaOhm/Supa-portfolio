import { useEffect, useState } from 'react';

type GitHubUserResponse = {
  login: string;
  avatar_url: string;
  html_url: string;
  name: string | null;
  bio: string | null;
  location: string | null;
  hireable: boolean | null;
  public_repos: number;
  followers: number;
  repos_url: string;
  created_at: string;
  updated_at: string;
};

type GitHubRepoResponse = {
  name: string;
  html_url: string;
  stargazers_count: number;
  language: string | null;
};

export type GitHubProfile = {
  login: string;
  avatarUrl: string;
  profileUrl: string;
  displayName: string;
  bio: string;
  location: string;
  hireable: boolean | null;
  repositories: number;
  followers: number;
  totalStars: number;
  sinceYear: number;
  updatedAt: string;
  topLanguage: string;
  mostStarredRepo: {
    name: string;
    stars: number;
    url: string;
  } | null;
};

export async function fetchGitHubProfile(
  username: string,
  signal?: AbortSignal
): Promise<GitHubProfile> {
  const response = await fetch(`https://api.github.com/users/${username}`, {
    signal,
    headers: {
      Accept: 'application/vnd.github+json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch GitHub stats');
  }

  const data: GitHubUserResponse = await response.json();

  const reposResponse = await fetch(`${data.repos_url}?per_page=100&type=owner`, {
    signal,
    headers: {
      Accept: 'application/vnd.github+json',
    },
  });

  if (!reposResponse.ok) {
    throw new Error('Failed to fetch GitHub repositories');
  }

  const repos: GitHubRepoResponse[] = await reposResponse.json();
  const totalStars = repos.reduce((total, repo) => total + repo.stargazers_count, 0);
  const createdYear = new Date(data.created_at).getFullYear();

  const mostStarredRepo = repos.reduce<GitHubProfile['mostStarredRepo']>((best, repo) => {
    if (!best || repo.stargazers_count > best.stars) {
      return {
        name: repo.name,
        stars: repo.stargazers_count,
        url: repo.html_url,
      };
    }

    return best;
  }, null);

  const languageCountMap = repos.reduce<Record<string, number>>((map, repo) => {
    if (!repo.language) {
      return map;
    }

    map[repo.language] = (map[repo.language] ?? 0) + 1;
    return map;
  }, {});

  const topLanguage =
    Object.entries(languageCountMap).sort((first, second) => second[1] - first[1])[0]?.[0] ?? 'N/A';

  return {
    login: data.login,
    avatarUrl: data.avatar_url,
    profileUrl: data.html_url,
    displayName: data.name ?? data.login,
    bio: data.bio ?? 'No bio provided yet.',
    location: data.location ?? 'Not specified',
    hireable: data.hireable,
    repositories: data.public_repos,
    followers: data.followers,
    totalStars,
    sinceYear: createdYear,
    updatedAt: data.updated_at,
    topLanguage,
    mostStarredRepo,
  };
}

export function useGitHubProfile(username: string): {
  profile: GitHubProfile | null;
  isLoading: boolean;
} {
  const [profile, setProfile] = useState<GitHubProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    const loadProfile = async () => {
      try {
        setIsLoading(true);
        const result = await fetchGitHubProfile(username, controller.signal);
        setProfile(result);
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          setProfile(null);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    loadProfile();

    return () => {
      controller.abort();
    };
  }, [username]);

  return { profile, isLoading };
}

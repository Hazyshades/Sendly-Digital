export type GithubSessionUser = {
  id: string;
  login: string;
  name: string | null;
  avatarUrl: string | null;
};

export function getStoredGithubAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  const token =
    localStorage.getItem('github_oauth_token') ||
    localStorage.getItem('github_oauth') ||
    localStorage.getItem('github_access_token');
  return token && token.length > 10 ? token : null;
}

export async function fetchGithubSessionUser(accessToken: string): Promise<GithubSessionUser | null> {
  try {
    const response = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });
    if (!response.ok) return null;
    const data = (await response.json()) as {
      id?: number;
      login?: string;
      name?: string | null;
      avatar_url?: string | null;
    };
    if (data.id == null || !data.login) return null;
    return {
      id: String(data.id),
      login: data.login.trim().replace(/^@/, '').toLowerCase(),
      name: data.name ?? null,
      avatarUrl: data.avatar_url ?? null,
    };
  } catch {
    return null;
  }
}

import { fetchGithubSessionUser, getStoredGithubAccessToken } from '@/lib/paywall/githubSession';

export async function resolveGithubDisplayName(): Promise<string | null> {
  const token = getStoredGithubAccessToken();
  if (!token) return null;
  const user = await fetchGithubSessionUser(token);
  return user?.login ? `@${user.login}` : null;
}

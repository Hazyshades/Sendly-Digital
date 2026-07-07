import type { ZkOAuthIdentity } from './types';
import { fetchGithubSessionUser, getStoredGithubAccessToken } from '@/lib/paywall/githubSession';

const PLATFORM_LABEL = 'GitHub';

export async function resolveGithubIdentity(): Promise<ZkOAuthIdentity | null> {
  const token = getStoredGithubAccessToken();
  if (!token) return null;

  const user = await fetchGithubSessionUser(token);
  if (!user) return null;

  return {
    platform: 'github',
    socialUserId: user.id,
    username: user.login,
    displayLabel: `@${user.login} (${PLATFORM_LABEL})`,
  };
}

import type { ZkOAuthIdentity } from './types';
import { readTwitterOAuthTokens } from './tokenStorage';

const PLATFORM_LABEL = 'Twitter / X';

export async function resolveTwitterIdentity(): Promise<ZkOAuthIdentity | null> {
  const tokens = readTwitterOAuthTokens();
  if (!tokens) return null;

  if (tokens.kind === 'oauth1') {
    if (tokens.userId) {
      const username = tokens.screenName?.replace(/^@/, '') || 'user';
      return {
        platform: 'twitter',
        socialUserId: tokens.userId,
        username,
        displayLabel: `@${username} (${PLATFORM_LABEL})`,
      };
    }
    return null;
  }

  try {
    const response = await fetch('https://api.x.com/2/users/me?user.fields=id,username', {
      headers: { Authorization: `Bearer ${tokens.accessToken}` },
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { data?: { id?: string; username?: string } };
    const id = data.data?.id;
    const username = data.data?.username?.replace(/^@/, '');
    if (!id || !username) return null;
    return {
      platform: 'twitter',
      socialUserId: id,
      username,
      displayLabel: `@${username} (${PLATFORM_LABEL})`,
    };
  } catch {
    return null;
  }
}

import { readTwitterOAuthTokens } from './tokenStorage';

export async function resolveTwitterDisplayName(): Promise<string | null> {
  const tokens = readTwitterOAuthTokens();
  if (!tokens) return null;

  if (tokens.kind === 'oauth1' && tokens.screenName) {
    return `@${tokens.screenName.replace(/^@/, '')}`;
  }

  if (tokens.kind === 'oauth2' && tokens.accessToken) {
    try {
      const response = await fetch('https://api.x.com/2/users/me?user.fields=username', {
        headers: { Authorization: `Bearer ${tokens.accessToken}` },
      });
      if (!response.ok) return null;
      const data = (await response.json()) as { data?: { username?: string } };
      return data.data?.username ? `@${data.data.username}` : null;
    } catch {
      return null;
    }
  }

  return null;
}

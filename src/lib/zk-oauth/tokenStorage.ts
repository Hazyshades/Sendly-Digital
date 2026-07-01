export type TwitterOAuthTokens =
  | { kind: 'oauth2'; accessToken: string }
  | { kind: 'oauth1'; oauthToken: string; oauthTokenSecret: string; userId?: string; screenName?: string };

export function readTwitterOAuthTokens(): TwitterOAuthTokens | null {
  if (typeof window === 'undefined') return null;

  const oauth1Token = localStorage.getItem('twitter_oauth1_token');
  const oauth1Secret = localStorage.getItem('twitter_oauth1_secret');
  if (oauth1Token && oauth1Secret) {
    const userId = localStorage.getItem('twitter_oauth1_user_id') ?? undefined;
    const screenName = localStorage.getItem('twitter_oauth1_screen_name') ?? undefined;
    return {
      kind: 'oauth1',
      oauthToken: oauth1Token,
      oauthTokenSecret: oauth1Secret,
      userId,
      screenName,
    };
  }

  const raw = localStorage.getItem('twitter_oauth_token') || localStorage.getItem('twitter_oauth');
  if (!raw) return null;

  let token = raw;
  if (raw.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(raw) as { access_token?: string; token?: string };
      token = parsed.access_token ?? parsed.token ?? raw;
    } catch {
      token = raw;
    }
  }

  if (typeof token === 'string' && token.length > 10) {
    return { kind: 'oauth2', accessToken: token };
  }

  return null;
}

export function readTwitchAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  const stored =
    localStorage.getItem('twitch_oauth_token') ||
    localStorage.getItem('twitch_oauth') ||
    localStorage.getItem('twitch_access_token');
  return stored && stored.length > 10 ? stored : null;
}

export function readTelegramAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem('telegram_oauth_token') || localStorage.getItem('telegram_oauth');
  return stored && stored.length > 10 ? stored : null;
}

export const ZK_OAUTH_IDENTITY_UPDATED_EVENT = 'identity-updated';

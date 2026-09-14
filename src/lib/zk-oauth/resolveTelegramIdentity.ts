import type { ZkOAuthIdentity } from './types';
import { readLiveTelegramAccessToken, readLiveTelegramIdentity } from './telegramSession';

const PLATFORM_LABEL = 'Telegram';

export async function resolveTelegramIdentity(): Promise<ZkOAuthIdentity | null> {
  const live = readLiveTelegramIdentity();
  if (!live) return null;

  let username = live.username;

  if (!username || username === live.socialUserId) {
    const accessToken = readLiveTelegramAccessToken();
    if (accessToken) {
      try {
        const { getZkTlsApiUrl } = await import('./apiUrl');
        const apiUrl = getZkTlsApiUrl();
        const response = await fetch(`${apiUrl}/api/telegram/me`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (response.ok) {
          const data = (await response.json()) as { login?: string };
          username = (data.login || '').replace(/^@/, '') || username;
        }
      } catch {
        // keep username from the JWT
      }
    }
  }

  if (!username) username = live.socialUserId;

  return {
    platform: 'telegram',
    socialUserId: live.socialUserId,
    username,
    displayLabel: `@${username} (${PLATFORM_LABEL})`,
  };
}

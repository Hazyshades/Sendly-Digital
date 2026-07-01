import type { ZkOAuthIdentity } from './types';
import { readTelegramAccessToken } from './tokenStorage';

const PLATFORM_LABEL = 'Telegram';

function decodeTelegramJwtPayload(
  token: string,
): { telegram_user_id?: string | number; username?: string; exp?: number } | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const json = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(json) as {
      telegram_user_id?: string | number;
      username?: string;
      exp?: number;
    };
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function resolveTelegramIdentity(): Promise<ZkOAuthIdentity | null> {
  const accessToken = readTelegramAccessToken();
  if (!accessToken) return null;

  const payload = decodeTelegramJwtPayload(accessToken);
  if (!payload?.telegram_user_id) return null;

  const socialUserId = String(payload.telegram_user_id);
  let username = (payload.username || '').replace(/^@/, '');

  if (!username) {
    try {
      const { getZkTlsApiUrl } = await import('./apiUrl');
      const apiUrl = getZkTlsApiUrl();
      const response = await fetch(`${apiUrl}/api/telegram/me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (response.ok) {
        const data = (await response.json()) as { login?: string };
        username = (data.login || '').replace(/^@/, '');
      }
    } catch {
      // fall through with empty username
    }
  }

  if (!username) username = socialUserId;

  return {
    platform: 'telegram',
    socialUserId,
    username,
    displayLabel: `@${username} (${PLATFORM_LABEL})`,
  };
}

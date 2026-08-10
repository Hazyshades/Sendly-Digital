import { readTelegramAccessToken } from './tokenStorage';

export async function resolveTelegramDisplayName(): Promise<string | null> {
  const accessToken = readTelegramAccessToken();
  if (!accessToken) return null;

  const parts = accessToken.split('.');
  if (parts.length === 3) {
    try {
      const json = atob(parts[1]!.replace(/-/g, '+').replace(/_/g, '/'));
      const payload = JSON.parse(json) as { username?: string };
      if (payload.username) return `@${payload.username.replace(/^@/, '')}`;
    } catch {
      // fall through
    }
  }

  return null;
}

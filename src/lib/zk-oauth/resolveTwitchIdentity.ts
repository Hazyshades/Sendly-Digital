import type { ZkOAuthIdentity } from './types';
import { readTwitchAccessToken } from './tokenStorage';

const PLATFORM_LABEL = 'Twitch';

export async function resolveTwitchIdentity(): Promise<ZkOAuthIdentity | null> {
  const accessToken = readTwitchAccessToken();
  if (!accessToken) return null;

  const clientId = import.meta.env.VITE_TWITCH_CLIENT_ID as string | undefined;
  if (!clientId) return null;

  try {
    const response = await fetch('https://api.twitch.tv/helix/users', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Client-Id': clientId,
      },
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { data?: Array<{ id?: string; login?: string; display_name?: string }> };
    const user = data.data?.[0];
    if (!user?.id) return null;
    const username = (user.login || user.display_name || 'user').replace(/^@/, '');
    return {
      platform: 'twitch',
      socialUserId: user.id,
      username,
      displayLabel: `${username} (${PLATFORM_LABEL})`,
    };
  } catch {
    return null;
  }
}

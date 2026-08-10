import { readTwitchAccessToken } from './tokenStorage';

export async function resolveTwitchDisplayName(): Promise<string | null> {
  const accessToken = readTwitchAccessToken();
  if (!accessToken) return null;

  const clientId = import.meta.env.VITE_TWITCH_CLIENT_ID as string | undefined;
  if (!clientId) return null;

  try {
    const response = await fetch('https://api.twitch.tv/helix/users', {
      headers: { Authorization: `Bearer ${accessToken}`, 'Client-Id': clientId },
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { data?: Array<{ login?: string }> };
    const login = data.data?.[0]?.login;
    return login ? login : null;
  } catch {
    return null;
  }
}

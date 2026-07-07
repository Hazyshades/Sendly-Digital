import type { ZkOAuthIdentity } from './types';
import { readLinkedInAccessToken } from './tokenStorage';

const PLATFORM_LABEL = 'LinkedIn';

export async function resolveLinkedInIdentity(): Promise<ZkOAuthIdentity | null> {
  const token = readLinkedInAccessToken();
  if (!token) return null;

  try {
    const response = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { sub?: string; name?: string; preferred_username?: string };
    if (!data.sub) return null;
    const username = (data.preferred_username || data.name || data.sub).replace(/^@/, '');
    return {
      platform: 'linkedin',
      socialUserId: data.sub,
      username,
      displayLabel: data.name ? `${data.name} (${PLATFORM_LABEL})` : `@${username} (${PLATFORM_LABEL})`,
    };
  } catch {
    return null;
  }
}

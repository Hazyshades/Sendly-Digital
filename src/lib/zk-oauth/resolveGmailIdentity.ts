import { normalizeGmailAddress } from '@/lib/reclaim/identity';
import type { ZkOAuthIdentity } from './types';
import { readGmailAccessToken } from './tokenStorage';

const PLATFORM_LABEL = 'Gmail';

export async function resolveGmailIdentity(): Promise<ZkOAuthIdentity | null> {
  const token = readGmailAccessToken();
  if (!token) return null;

  try {
    const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { sub?: string; email?: string };
    if (!data.sub) return null;
    const email = (data.email ?? '').trim().toLowerCase();
    const normalizedEmail = normalizeGmailAddress(email);
    if (!normalizedEmail) return null;
    return {
      platform: 'gmail',
      socialUserId: data.sub,
      username: normalizedEmail,
      displayLabel: `${normalizedEmail} (${PLATFORM_LABEL})`,
    };
  } catch {
    return null;
  }
}

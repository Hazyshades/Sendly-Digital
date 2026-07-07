import { keccak256, toUtf8Bytes } from 'ethers';

const SUPPORTED_SOCIAL_PLATFORMS = [
  'twitter',
  'twitch',
  'github',
  'instagram',
  // 'tiktok',
  'gmail',
  'linkedin',
  'telegram',
] as const;

export type SocialPlatform = (typeof SUPPORTED_SOCIAL_PLATFORMS)[number];

const safeDecode = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

/**
 * Normalize platform string (lowercase, trim, URL decode, aliases).
 */
export function normalizeSocialPlatform(platform: string): SocialPlatform | null {
  const decoded = safeDecode(String(platform ?? '')).trim().toLowerCase();
  const normalized = decoded === 'x' ? 'twitter' : decoded;
  return SUPPORTED_SOCIAL_PLATFORMS.includes(normalized as SocialPlatform)
    ? (normalized as SocialPlatform)
    : null;
}

/**
 * Normalize username (lowercase, trim, URL decode).
 */
export function normalizeSocialUsername(username: string): string | null {
  const decoded = safeDecode(String(username ?? '')).trim();
  if (!decoded) return null;
  return decoded.toLowerCase();
}

/**
 * Build normalized social identity: "platform:username".
 */
export function buildSocialIdentity(platform: string, username: string): string | null {
  const normalizedPlatform = normalizeSocialPlatform(platform);
  const normalizedUsername = normalizeSocialUsername(username);
  if (!normalizedPlatform || !normalizedUsername) return null;
  return `${normalizedPlatform}:${normalizedUsername}`;
}

/**
 * Generate social identity hash.
 * Format: keccak256("platform:username") after normalization.
 */
export function generateSocialIdentityHash(
  platform: string,
  username: string
): `0x${string}` | null {
  const identity = buildSocialIdentity(platform, username);
  if (!identity) return null;
  return keccak256(toUtf8Bytes(identity)) as `0x${string}`;
}

/** Canonical Twitch identity for raid payouts: twitch:uid:{user_id} */
export function buildTwitchUidIdentity(userId: string | number): string {
  return `twitch:uid:${String(userId).trim()}`;
}

/** Handle segment for paySocialIdentity / claim: uid:{user_id} */
export function twitchUidHandleSegment(userId: string | number): string {
  return `uid:${String(userId).trim()}`;
}

/** keccak256("twitch:uid:{user_id}") - matches creator-paywall twitchIdentity.ts */
export function generateTwitchUidIdentityHash(
  userId: string | number
): `0x${string}` | null {
  const id = String(userId).trim();
  if (!id) return null;
  return keccak256(toUtf8Bytes(buildTwitchUidIdentity(id))) as `0x${string}`;
}

export type TwitchHelixUser = {
  userId: string;
  login: string;
};

/** Resolve authenticated Twitch user from Helix GET /users (OAuth bearer). */
export async function fetchTwitchAuthenticatedUser(
  accessToken: string,
  clientId: string
): Promise<TwitchHelixUser | null> {
  const res = await fetch('https://api.twitch.tv/helix/users', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Client-Id': clientId,
    },
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { data?: Array<{ id?: string; login?: string }> };
  const user = json.data?.[0];
  if (!user?.id) return null;
  return {
    userId: String(user.id),
    login: String(user.login ?? '').toLowerCase(),
  };
}


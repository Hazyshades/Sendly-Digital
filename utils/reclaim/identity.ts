import { keccak256, toUtf8Bytes } from 'ethers';

const SUPPORTED_SOCIAL_PLATFORMS = [
  'twitter',
  'twitch',
  'github',
  'instagram',
  'tiktok',
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


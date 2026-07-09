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

/** Gmail recipient must be a full @gmail.com address (not a bare username). */
const GMAIL_ADDRESS_RE = /^[a-z0-9](?:[a-z0-9.+_-]*[a-z0-9])?@gmail\.com$/;

export function normalizeGmailAddress(email: string): string | null {
  const decoded = safeDecode(String(email ?? '')).trim().toLowerCase();
  if (!decoded || !GMAIL_ADDRESS_RE.test(decoded)) return null;
  return decoded;
}

/**
 * Canonical Gmail identity segment: full @gmail.com address.
 * Expands bare local part (e.g. "user" → "user@gmail.com").
 */
export function normalizeGmailIdentity(raw: string): string | null {
  const decoded = safeDecode(String(raw ?? '')).trim().toLowerCase().replace(/^@/, '');
  if (!decoded) return null;
  if (decoded.includes('@')) return normalizeGmailAddress(decoded);
  if (!/^[a-z0-9](?:[a-z0-9.+_-]*[a-z0-9])?$/.test(decoded)) return null;
  return `${decoded}@gmail.com`;
}

/** Legacy on-chain identity: gmail:{localpart} without domain. */
export function generateLegacyGmailIdentityHash(raw: string): `0x${string}` | null {
  const canonical = normalizeGmailIdentity(raw);
  if (!canonical) return null;
  const localPart = canonical.split('@')[0];
  if (!localPart) return null;
  return keccak256(toUtf8Bytes(`gmail:${localPart}`)) as `0x${string}`;
}

/** Canonical + legacy hashes for pending payment lookup (deduped). */
export function gmailIdentityHashes(raw: string): `0x${string}`[] {
  const canonical = normalizeGmailIdentity(raw);
  if (!canonical) return [];
  const canonicalHash = generateSocialIdentityHash('gmail', canonical);
  const legacyHash = generateLegacyGmailIdentityHash(raw);
  if (!canonicalHash) return legacyHash ? [legacyHash] : [];
  if (!legacyHash || legacyHash === canonicalHash) return [canonicalHash];
  return [canonicalHash, legacyHash];
}

export function gmailUsernamesMatch(a: string, b: string): boolean {
  const canonicalA = normalizeGmailIdentity(a);
  const canonicalB = normalizeGmailIdentity(b);
  if (!canonicalA || !canonicalB) return false;
  return canonicalA === canonicalB;
}

export function socialProofUsernamesMatch(platform: string, expected: string, extracted: string): boolean {
  const extractedNorm = normalizeSocialUsername(extracted);
  if (!extractedNorm) return true;
  if (platform === 'gmail') return gmailUsernamesMatch(expected, extractedNorm);
  const expectedNorm = normalizeSocialUsername(expected.replace(/^@/, ''));
  if (!expectedNorm) return false;
  return expectedNorm === extractedNorm;
}

export function isSocialRecipientValid(platform: string, username: string): boolean {
  const trimmed = username.trim();
  if (!trimmed) return false;
  if (platform === 'address') return /^0x[a-fA-F0-9]{40}$/.test(trimmed);
  if (platform === 'gmail') return !!normalizeGmailAddress(trimmed);
  return !!normalizeSocialUsername(trimmed.replace(/^@/, ''));
}

/**
 * Build normalized social identity: "platform:username".
 */
export function buildSocialIdentity(platform: string, username: string): string | null {
  const normalizedPlatform = normalizeSocialPlatform(platform);
  if (!normalizedPlatform) return null;
  const normalizedUsername =
    normalizedPlatform === 'gmail'
      ? normalizeGmailIdentity(username)
      : normalizeSocialUsername(username.replace(/^@/, ''));
  if (!normalizedUsername) return null;
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


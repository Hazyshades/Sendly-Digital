import {
  generateSocialIdentityHash,
  generateTwitchUidIdentityHash,
  normalizeGmailAddress,
  normalizeSocialPlatform,
  normalizeSocialUsername,
} from '@/lib/reclaim/identity';
import { fetchTwitchUserPreview } from '@/lib/twitch/userLookup';

export type SocialRecipient = {
  normalizedPlatform: string;
  normalizedUsername: string;
  recipientIdentityHash: `0x${string}`;
};

export type TwitchUserIdLookup = (
  login: string,
) => Promise<{ userId: string; login: string } | null>;

export async function defaultTwitchUserIdLookup(
  login: string,
): Promise<{ userId: string; login: string } | null> {
  const result = await fetchTwitchUserPreview(login);
  if (!result.success) return null;
  const userId = String(result.data.id ?? '').trim();
  if (!userId) return null;
  return { userId, login: result.data.login };
}

/**
 * Human-send identity: Twitch writes uid-hash after Helix resolve.
 * Lookup failure MUST NOT fall back to keccak256("twitch:{login}").
 */
export async function resolveSocialRecipient(
  platform: string,
  username: string,
  twitchLookup: TwitchUserIdLookup = defaultTwitchUserIdLookup,
): Promise<SocialRecipient> {
  const normalizedPlatform = normalizeSocialPlatform(platform);
  const normalizedUsername =
    normalizedPlatform === 'gmail'
      ? normalizeGmailAddress(username)
      : normalizeSocialUsername(username.replace(/^@/, ''));
  if (!normalizedPlatform) throw new Error('Unsupported platform');
  if (!normalizedUsername) throw new Error('Enter recipient');

  if (normalizedPlatform === 'twitch') {
    const resolved = await twitchLookup(normalizedUsername);
    if (!resolved?.userId) {
      throw new Error('Could not resolve Twitch user. Check the login and try again.');
    }
    const recipientIdentityHash = generateTwitchUidIdentityHash(resolved.userId);
    if (!recipientIdentityHash) throw new Error('Invalid social identity');
    return { normalizedPlatform, normalizedUsername, recipientIdentityHash };
  }

  const recipientIdentityHash = generateSocialIdentityHash(normalizedPlatform, normalizedUsername);
  if (!recipientIdentityHash) throw new Error('Invalid social identity');
  return { normalizedPlatform, normalizedUsername, recipientIdentityHash };
}

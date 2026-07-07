import { fetchTwitterUserPreview } from '@/lib/twitter';
import { fetchTwitchUserPreview } from '@/lib/twitch';
import { fetchTelegramUserPreview } from '@/lib/telegram';
import { fetchGitHubUserPreview } from '@/lib/github';

export type CreatorAvatar = {
  avatarUrl: string | null;
  displayName: string | null;
};

/** Module-level cache keyed by "platform:handle" so avatars survive route changes. */
const avatarCache = new Map<string, CreatorAvatar>();

function cacheKey(platform: string, handle: string): string {
  return `${platform}:${handle.toLowerCase()}`;
}

/**
 * Resolve a creator avatar + display name for a social identity, reusing the same
 * zk-sender lookup endpoints the Payments tab uses. Platforms without a lookup
 * (gmail, linkedin) resolve to null so the UI falls back to initials.
 */
export async function resolveCreatorAvatar(
  platform: string,
  handle: string,
): Promise<CreatorAvatar | null> {
  const cleaned = handle.replace(/^@/, '').trim();
  if (!cleaned) return null;

  const key = cacheKey(platform, cleaned);
  const cached = avatarCache.get(key);
  if (cached) return cached;

  let resolved: CreatorAvatar | null = null;

  try {
    if (platform === 'github') {
      const res = await fetchGitHubUserPreview(cleaned);
      if (res.success) resolved = { avatarUrl: res.data.avatar_url, displayName: res.data.name };
    } else if (platform === 'twitter') {
      const res = await fetchTwitterUserPreview(cleaned);
      if (res.success) {
        resolved = { avatarUrl: res.data.profile_image_url, displayName: res.data.name };
      }
    } else if (platform === 'twitch') {
      const res = await fetchTwitchUserPreview(cleaned);
      if (res.success) {
        resolved = { avatarUrl: res.data.profile_image_url, displayName: res.data.display_name };
      }
    } else if (platform === 'telegram') {
      const res = await fetchTelegramUserPreview(cleaned);
      if (res.success) {
        resolved = { avatarUrl: res.data.profile_image_url, displayName: res.data.name };
      }
    }
  } catch {
    resolved = null;
  }

  if (resolved) avatarCache.set(key, resolved);
  return resolved;
}

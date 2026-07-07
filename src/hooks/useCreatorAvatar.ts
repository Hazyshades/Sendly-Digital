import { useEffect, useState } from 'react';
import { resolveCreatorAvatar, type CreatorAvatar } from '@/lib/paywall/creatorAvatar';

/**
 * Fetches a creator avatar/display name for (platform, handle) via zk-sender lookups.
 * `enabled` lets callers skip the fetch when they already have an avatar.
 */
export function useCreatorAvatar(
  platform: string | undefined,
  handle: string | undefined,
  enabled = true,
): CreatorAvatar | null {
  const [avatar, setAvatar] = useState<CreatorAvatar | null>(null);

  useEffect(() => {
    if (!enabled || !platform || !handle) {
      setAvatar(null);
      return;
    }

    let cancelled = false;
    void resolveCreatorAvatar(platform, handle).then((result) => {
      if (!cancelled) setAvatar(result);
    });

    return () => {
      cancelled = true;
    };
  }, [platform, handle, enabled]);

  return avatar;
}

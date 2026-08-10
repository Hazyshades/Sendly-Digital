import { useMemo } from 'react';
import { useZkOAuthIdentity } from '@/lib/zk-oauth/useZkOAuthIdentity';

export type CreatorIdentity = {
  platform: string;
  handle: string;
  displayName: string;
  avatarUrl: string | null;
};

/**
 * Resolves the current creator identity from the connected primary social account.
 * Uses the same identity as ZkSend settlement (platform + normalized username),
 * so profile `(platform, handle)` matches on-chain `keccak256("platform:handle")`.
 */
export function useCreatorIdentity(): {
  identity: CreatorIdentity | null;
  loading: boolean;
  isZkHost: boolean;
} {
  const { identity, loading, isZkHost } = useZkOAuthIdentity();

  const creatorIdentity = useMemo((): CreatorIdentity | null => {
    if (!identity) return null;
    const handle = identity.username.replace(/^@/, '').toLowerCase();
    return {
      platform: identity.platform,
      handle,
      displayName: identity.username.replace(/^@/, ''),
      avatarUrl: null,
    };
  }, [identity]);

  return { identity: creatorIdentity, loading, isZkHost };
}

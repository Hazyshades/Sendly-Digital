import type { ZkOAuthIdentity } from '@/lib/zk-oauth/types';
import { readTwitterOAuthTokens, readZkOAuthAccessTokenForPlatform } from '@/lib/zk-oauth/tokenStorage';

export type OwnerOAuthProof = {
  ownerPlatform?: string;
  ownerOAuthToken?: string;
  /** OAuth1 Twitter screen name (attested client-side when API verify is unavailable). */
  ownerOAuthUsername?: string;
};

export function buildOwnerOAuthProof(identity: ZkOAuthIdentity | null): OwnerOAuthProof {
  if (!identity) return {};

  const ownerOAuthToken = readZkOAuthAccessTokenForPlatform(identity.platform) ?? undefined;
  if (!ownerOAuthToken) return {};

  const proof: OwnerOAuthProof = {
    ownerPlatform: identity.platform,
    ownerOAuthToken,
  };

  if (identity.platform === 'twitter') {
    const twitter = readTwitterOAuthTokens();
    if (twitter?.kind === 'oauth1') {
      const screenName =
        twitter.screenName?.replace(/^@/, '') ||
        identity.username.replace(/^@/, '');
      if (screenName) proof.ownerOAuthUsername = screenName;
    }
  }

  return proof;
}

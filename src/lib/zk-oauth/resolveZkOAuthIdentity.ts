import { ZK_OAUTH_PHASE1_PLATFORMS, type ZkOAuthIdentity, type ZkOAuthPlatform } from './types';
import { resolveTwitterIdentity } from './resolveTwitterIdentity';
import { resolveTwitchIdentity } from './resolveTwitchIdentity';
import { resolveTelegramIdentity } from './resolveTelegramIdentity';

const resolvers: Record<ZkOAuthPlatform, () => Promise<ZkOAuthIdentity | null>> = {
  twitter: resolveTwitterIdentity,
  twitch: resolveTwitchIdentity,
  telegram: resolveTelegramIdentity,
};

export function buildZkOAuthPrivyUserId(platform: ZkOAuthPlatform, socialUserId: string): string {
  return `zk-oauth:${platform}:${socialUserId}`;
}

export async function resolveZkOAuthIdentity(): Promise<ZkOAuthIdentity | null> {
  for (const platform of ZK_OAUTH_PHASE1_PLATFORMS) {
    const identity = await resolvers[platform]();
    if (identity) return identity;
  }
  return null;
}

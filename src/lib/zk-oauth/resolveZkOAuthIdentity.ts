import { ZK_OAUTH_WALLET_PLATFORMS, type ZkOAuthIdentity, type ZkOAuthPlatform } from './types';
import { readStoredPrimaryIdentity } from './primaryIdentity';
import { resolveTwitterIdentity } from './resolveTwitterIdentity';
import { resolveTwitchIdentity } from './resolveTwitchIdentity';
import { resolveTelegramIdentity } from './resolveTelegramIdentity';
import { resolveGithubIdentity } from './resolveGithubIdentity';
import { resolveGmailIdentity } from './resolveGmailIdentity';
import { resolveLinkedInIdentity } from './resolveLinkedInIdentity';

const resolvers: Record<ZkOAuthPlatform, () => Promise<ZkOAuthIdentity | null>> = {
  twitter: resolveTwitterIdentity,
  twitch: resolveTwitchIdentity,
  telegram: resolveTelegramIdentity,
  github: resolveGithubIdentity,
  gmail: resolveGmailIdentity,
  linkedin: resolveLinkedInIdentity,
};

export function buildZkOAuthPrivyUserId(platform: ZkOAuthPlatform, socialUserId: string): string {
  return `zk-oauth:${platform}:${socialUserId}`;
}

export async function resolveZkOAuthIdentity(): Promise<ZkOAuthIdentity | null> {
  const primary = readStoredPrimaryIdentity();
  if (primary) {
    const primaryIdentity = await resolvers[primary]();
    if (primaryIdentity) return primaryIdentity;
  }

  for (const platform of ZK_OAUTH_WALLET_PLATFORMS) {
    if (platform === primary) continue;
    const identity = await resolvers[platform]();
    if (identity) return identity;
  }
  return null;
}

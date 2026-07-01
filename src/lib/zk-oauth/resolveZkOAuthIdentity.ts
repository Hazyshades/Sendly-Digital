import { ZK_OAUTH_WALLET_PLATFORMS, type ZkOAuthIdentity, type ZkOAuthPlatform } from './types';
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
  for (const platform of ZK_OAUTH_WALLET_PLATFORMS) {
    const identity = await resolvers[platform]();
    if (identity) return identity;
  }
  return null;
}

export const ZK_OAUTH_WALLET_PLATFORMS = [
  'twitter',
  'twitch',
  'telegram',
  'github',
  'gmail',
  'linkedin',
] as const;

/** @deprecated Use `ZK_OAUTH_WALLET_PLATFORMS` */
export const ZK_OAUTH_PHASE1_PLATFORMS = ['twitter', 'twitch', 'telegram'] as const;

export type ZkOAuthPlatform = (typeof ZK_OAUTH_WALLET_PLATFORMS)[number];

export type ZkOAuthIdentity = {
  platform: ZkOAuthPlatform;
  socialUserId: string;
  username: string;
  displayLabel: string;
};

export const ZK_OAUTH_PHASE1_PLATFORMS = ['twitter', 'twitch', 'telegram'] as const;

export type ZkOAuthPlatform = (typeof ZK_OAUTH_PHASE1_PLATFORMS)[number];

export type ZkOAuthIdentity = {
  platform: ZkOAuthPlatform;
  socialUserId: string;
  username: string;
  displayLabel: string;
};

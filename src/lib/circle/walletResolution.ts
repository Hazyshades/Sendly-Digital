import { DeveloperWalletService, type DeveloperWallet } from '@/lib/circle/developerWalletService';

export const DEFAULT_BLOCKCHAIN = 'ARC-TESTNET';

export type SocialPlatform = 'twitter' | 'twitch' | 'telegram' | 'tiktok' | 'instagram';

export const SOCIAL_PLATFORMS: readonly SocialPlatform[] = [
  'twitter',
  'twitch',
  'telegram',
  'tiktok',
  'instagram',
] as const;

export type PrivySocialIdentity = {
  platform: SocialPlatform;
  socialUserId: string;
  username: string;
};

type PrivySocialAccount = {
  subject?: string;
  id?: string;
  username?: string;
  email?: string;
  firstName?: string;
  telegramUserId?: string;
};

type PlatformExtractor = {
  platform: SocialPlatform;
  getAccount: (user: any) => PrivySocialAccount | null | undefined;
  getSocialUserId: (account: PrivySocialAccount) => string | null | undefined;
  getUsername: (account: PrivySocialAccount) => string;
};

const PLATFORM_EXTRACTORS: readonly PlatformExtractor[] = [
  {
    platform: 'twitter',
    getAccount: (user) => user?.twitter,
    getSocialUserId: (account) => account.subject,
    getUsername: (account) => account.username || 'user',
  },
  {
    platform: 'twitch',
    getAccount: (user) => user?.twitch,
    getSocialUserId: (account) => account.subject,
    getUsername: (account) => account.username || account.email || 'user',
  },
  {
    platform: 'telegram',
    getAccount: (user) => user?.telegram,
    // telegramUserId is canonical; id/subject are Privy shape quirks across call sites
    getSocialUserId: (account) => account.telegramUserId ?? account.id ?? account.subject,
    getUsername: (account) => account.username || account.firstName || 'user',
  },
  {
    platform: 'tiktok',
    getAccount: (user) => user?.tiktok,
    getSocialUserId: (account) => account.subject,
    getUsername: (account) => account.username || 'user',
  },
  {
    platform: 'instagram',
    getAccount: (user) => user?.instagram,
    getSocialUserId: (account) => account.subject,
    getUsername: (account) => account.username || 'user',
  },
];

/**
 * ONE Privy social-id extraction ladder (table-driven).
 * With `platform` omitted, returns the first linked account in SOCIAL_PLATFORMS order.
 */
export function getPrivySocialIdentity(
  privyUser: any,
  platform?: SocialPlatform,
): PrivySocialIdentity | null {
  if (!privyUser) return null;

  const extractors = platform
    ? PLATFORM_EXTRACTORS.filter((extractor) => extractor.platform === platform)
    : PLATFORM_EXTRACTORS;

  for (const extractor of extractors) {
    const account = extractor.getAccount(privyUser);
    if (!account) continue;
    const socialUserId = extractor.getSocialUserId(account);
    if (!socialUserId) continue;
    return {
      platform: extractor.platform,
      socialUserId: String(socialUserId),
      username: extractor.getUsername(account),
    };
  }

  return null;
}

/** Strip the Privy DID prefix when present. */
export function normalizePrivyUserId(id: string): string {
  return id.startsWith('did:privy:') ? id.replace('did:privy:', '') : id;
}

export type ZkIdentityLike = {
  platform: string;
  socialUserId: string;
};

export type ResolveInternalWalletParams = {
  address?: string;
  zkIdentity?: ZkIdentityLike | null;
  privyUser?: any;
  privyUserId?: string;
  blockchain?: string;
};

function pickArcWallet(wallets: DeveloperWallet[], blockchain: string): DeveloperWallet | null {
  return wallets.find((wallet) => wallet.blockchain === blockchain) ?? wallets[0] ?? null;
}

/**
 * Full identity → Internal Wallet resolution chain (single source of truth):
 * connected address → zk OAuth social → Privy linked socials → Privy ID.
 *
 * Per-step failures are swallowed (intentional); one debug log point per swallow.
 */
export async function resolveInternalWallet(
  params: ResolveInternalWalletParams,
): Promise<DeveloperWallet | null> {
  const blockchain = params.blockchain ?? DEFAULT_BLOCKCHAIN;
  let found: DeveloperWallet | null = null;

  if (params.address) {
    const normalized = params.address.toLowerCase().trim();
    try {
      const wallets = await DeveloperWalletService.getWallets(normalized);
      found = pickArcWallet(wallets, blockchain);
    } catch (err) {
      console.debug('[walletResolution] address lookup failed', err);
    }
  }

  if (!found && params.zkIdentity) {
    try {
      const wallet = await DeveloperWalletService.getWalletBySocial(
        params.zkIdentity.platform,
        params.zkIdentity.socialUserId,
        blockchain,
      );
      if (wallet) found = wallet;
    } catch (err) {
      console.debug('[walletResolution] zk OAuth social lookup failed', err);
    }
  }

  if (!found && params.privyUser) {
    for (const platform of SOCIAL_PLATFORMS) {
      const identity = getPrivySocialIdentity(params.privyUser, platform);
      if (!identity) continue;
      try {
        const wallet = await DeveloperWalletService.getWalletBySocial(
          identity.platform,
          identity.socialUserId,
          blockchain,
        );
        if (wallet) {
          found = wallet;
          break;
        }
      } catch (err) {
        console.debug(`[walletResolution] Privy social lookup failed (${platform})`, err);
      }
    }
  }

  if (!found) {
    const rawPrivyId = params.privyUserId ?? params.privyUser?.id;
    if (rawPrivyId) {
      try {
        const wallets = await DeveloperWalletService.getWallets(normalizePrivyUserId(String(rawPrivyId)));
        found = pickArcWallet(wallets, blockchain);
      } catch (err) {
        console.debug('[walletResolution] Privy ID lookup failed', err);
      }
    }
  }

  return found;
}

/**
 * Resolves privyUserId (or equivalent) for Circle wallet transaction verification.
 * Moved verbatim from useCircleWallet.getCircleWalletPrivyUserIdForTx.
 */
export function resolvePrivyUserIdForTx(
  developerWallet: DeveloperWallet | null,
  connectedAddress: string | undefined,
  privyUserId: string | undefined,
): string | undefined {
  if (!developerWallet) return undefined;

  const walletCreatedWithAddress =
    developerWallet.user_id?.startsWith('0x') &&
    !developerWallet.privy_user_id &&
    connectedAddress &&
    developerWallet.user_id.toLowerCase() === connectedAddress.toLowerCase();

  if (walletCreatedWithAddress && connectedAddress) {
    return connectedAddress.toLowerCase();
  }
  if (developerWallet.privy_user_id?.startsWith('zk-oauth:')) {
    return developerWallet.privy_user_id;
  }
  if (privyUserId) {
    return normalizePrivyUserId(privyUserId);
  }
  if (connectedAddress) {
    return connectedAddress.toLowerCase();
  }
  return undefined;
}

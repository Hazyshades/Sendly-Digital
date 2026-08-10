import {
  VAULT_CONTRACT_ADDRESS,
  TWITCH_VAULT_CONTRACT_ADDRESS,
  TELEGRAM_VAULT_CONTRACT_ADDRESS,
  TIKTOK_VAULT_CONTRACT_ADDRESS,
  INSTAGRAM_VAULT_CONTRACT_ADDRESS,
  TwitterCardVaultABI,
  TwitchCardVaultABI,
  TelegramCardVaultABI,
  TikTokCardVaultABI,
  InstagramCardVaultABI,
} from '@/lib/web3/constants';

export type GiftCardPlatform = 'twitter' | 'twitch' | 'telegram' | 'tiktok' | 'instagram';

/** Key into ChainContracts for the per-platform vault address. */
export type VaultContractKey =
  | 'vaultContract'
  | 'twitchVault'
  | 'telegramVault'
  | 'tiktokVault'
  | 'instagramVault';

export type GiftCardPlatformDescriptor = {
  platform: GiftCardPlatform;
  /** Edge path segment under `/gift-cards/{segment}/...`. */
  apiPathSegment: string;
  /**
   * Per-platform handle normalization (CardsAPI + vault quirks).
   * - twitter/telegram/tiktok/instagram: lowercase, strip leading `@`, trim
   * - twitch: lowercase + trim only (no `@` strip — handles are bare login names)
   */
  normalizeHandle: (handle: string) => string;
  vaultContractKey: VaultContractKey;
  /** Default-chain vault address from constants.ts (ARC). */
  vaultAddress: string;
  vaultAbi: readonly unknown[];
  /** GiftCard contract method that mints into this vault. */
  createGiftCardFunctionName:
    | 'createGiftCardForTwitter'
    | 'createGiftCardForTwitch'
    | 'createGiftCardForTelegram'
    | 'createGiftCardForTikTok'
    | 'createGiftCardForInstagram';
  displayName: string;
};

const stripAtLower = (handle: string) => handle.toLowerCase().replace(/^@/, '').trim();
const twitchNormalize = (handle: string) => handle.toLowerCase().trim();

export const GIFT_CARD_PLATFORM_REGISTRY: Record<GiftCardPlatform, GiftCardPlatformDescriptor> = {
  twitter: {
    platform: 'twitter',
    apiPathSegment: 'twitter',
    normalizeHandle: stripAtLower,
    vaultContractKey: 'vaultContract',
    vaultAddress: VAULT_CONTRACT_ADDRESS,
    vaultAbi: TwitterCardVaultABI,
    createGiftCardFunctionName: 'createGiftCardForTwitter',
    displayName: 'Twitter',
  },
  twitch: {
    platform: 'twitch',
    apiPathSegment: 'twitch',
    normalizeHandle: twitchNormalize,
    vaultContractKey: 'twitchVault',
    vaultAddress: TWITCH_VAULT_CONTRACT_ADDRESS,
    vaultAbi: TwitchCardVaultABI,
    createGiftCardFunctionName: 'createGiftCardForTwitch',
    displayName: 'Twitch',
  },
  telegram: {
    platform: 'telegram',
    apiPathSegment: 'telegram',
    normalizeHandle: stripAtLower,
    vaultContractKey: 'telegramVault',
    vaultAddress: TELEGRAM_VAULT_CONTRACT_ADDRESS,
    vaultAbi: TelegramCardVaultABI,
    createGiftCardFunctionName: 'createGiftCardForTelegram',
    displayName: 'Telegram',
  },
  tiktok: {
    platform: 'tiktok',
    apiPathSegment: 'tiktok',
    normalizeHandle: stripAtLower,
    vaultContractKey: 'tiktokVault',
    vaultAddress: TIKTOK_VAULT_CONTRACT_ADDRESS,
    vaultAbi: TikTokCardVaultABI,
    createGiftCardFunctionName: 'createGiftCardForTikTok',
    displayName: 'TikTok',
  },
  instagram: {
    platform: 'instagram',
    apiPathSegment: 'instagram',
    normalizeHandle: stripAtLower,
    vaultContractKey: 'instagramVault',
    vaultAddress: INSTAGRAM_VAULT_CONTRACT_ADDRESS,
    vaultAbi: InstagramCardVaultABI,
    createGiftCardFunctionName: 'createGiftCardForInstagram',
    displayName: 'Instagram',
  },
};

export const GIFT_CARD_PLATFORMS: readonly GiftCardPlatform[] = [
  'twitter',
  'twitch',
  'telegram',
  'tiktok',
  'instagram',
] as const;

export function getGiftCardPlatform(platform: GiftCardPlatform): GiftCardPlatformDescriptor {
  return GIFT_CARD_PLATFORM_REGISTRY[platform];
}

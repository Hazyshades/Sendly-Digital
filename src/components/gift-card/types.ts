export type RecipientType = 'address' | 'twitter' | 'twitch' | 'telegram' | 'tiktok' | 'instagram';

export type SocialRecipientType = Exclude<RecipientType, 'address'>;

export type GiftCardCurrency = 'USDC' | 'EURC' | 'PATHUSD' | 'ALPHAUSD' | 'BETAUSD' | 'THETAUSD';

export interface GiftCardData {
  recipientType: RecipientType;
  recipientAddress: string;
  recipientUsername: string;
  amount: string;
  currency: GiftCardCurrency;
  design: 'pink' | 'blue' | 'green' | 'custom';
  message: string;
  secretMessage: string;
  hasTimer: boolean;
  timerHours: number;
  hasPassword: boolean;
  password: string;
  expiryDays: number;
  customImage: string;
  nftCover: string;
}

export type WalletSource = 'metamask' | 'developer';

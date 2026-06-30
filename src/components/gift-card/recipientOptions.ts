import type { RecipientType } from './types';

export type PlatformIconName = RecipientType;

export const RECIPIENT_OPTIONS: Array<{
  value: RecipientType;
  label: string;
  icon: PlatformIconName;
}> = [
  { value: 'address', label: 'Wallet address', icon: 'address' },
  { value: 'twitter', label: 'Twitter', icon: 'twitter' },
  { value: 'twitch', label: 'Twitch', icon: 'twitch' },
  { value: 'telegram', label: 'Telegram', icon: 'telegram' },
  { value: 'tiktok', label: 'TikTok', icon: 'tiktok' },
  { value: 'instagram', label: 'Instagram', icon: 'instagram' }
];

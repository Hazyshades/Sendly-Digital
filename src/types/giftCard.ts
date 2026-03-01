export interface GiftCardRecord {
  id?: number;
  token_id: string;
  chain_id?: number | null;
  sender_address: string;
  recipient_address?: string | null;
  recipient_username?: string | null;
  recipient_type: 'address' | 'twitter' | 'twitch' | 'telegram' | 'tiktok' | 'instagram';
  amount: string;
  currency: 'USDC' | 'EURC' | 'USYC';
  message: string;
  redeemed: boolean;
  tx_hash?: string | null;
  block_number?: number | null;
  created_at?: string;
  updated_at?: string;
  last_synced_at?: string | null;
}

export interface GiftCardInsert {
  token_id: string;
  chain_id?: number | null;
  sender_address: string;
  recipient_address?: string | null;
  recipient_username?: string | null;
  recipient_type: 'address' | 'twitter' | 'twitch' | 'telegram' | 'tiktok' | 'instagram';
  amount: string;
  currency: 'USDC' | 'EURC' | 'USYC';
  message: string;
  redeemed?: boolean;
  tx_hash?: string | null;
  block_number?: number | null;
}

export interface GiftCardInfo {
  tokenId: string;
  recipient: string;
  sender: string;
  amount: string;
  token: 'USDC' | 'EURC' | 'USYC';
  message: string;
  redeemed: boolean;
  type: 'sent' | 'received';
}

export interface BlockchainGiftCardInfo {
  amount: bigint;
  token: string;
  redeemed: boolean;
  message: string;
}

export interface GiftCardImageData {
  amount: string;
  currency: string;
  message: string;
  design: 'pink' | 'blue' | 'green' | 'custom';
  customImage?: string;
}


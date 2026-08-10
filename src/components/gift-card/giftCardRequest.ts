import { toMicro } from '@/lib/tokenAmount';
import type { GiftCardCurrency, GiftCardData, RecipientType, WalletSource } from './types';

const RECIPIENT_LABELS: Record<RecipientType, string> = {
  address: 'recipient',
  twitter: 'Twitter',
  twitch: 'Twitch',
  telegram: 'Telegram',
  tiktok: 'TikTok',
  instagram: 'Instagram'
};

export function resolveCreateWallet(params: {
  walletSource: WalletSource;
  isConnected: boolean;
  address?: string;
  hasDeveloperWallet: boolean;
  developerWallet: any;
}): { createAddress: string; useDeveloperWallet: boolean } | { error: string } {
  const { walletSource, isConnected, address, hasDeveloperWallet, developerWallet } = params;

  if (!isConnected && !hasDeveloperWallet) {
    return { error: 'Please connect your wallet first' };
  }

  if (walletSource === 'circle' && hasDeveloperWallet && developerWallet) {
    return { createAddress: developerWallet.wallet_address, useDeveloperWallet: true };
  }

  if (walletSource === 'external' && isConnected && address) {
    return { createAddress: address, useDeveloperWallet: false };
  }

  if (isConnected && address) {
    return { createAddress: address, useDeveloperWallet: false };
  }

  if (hasDeveloperWallet && developerWallet) {
    return { createAddress: developerWallet.wallet_address, useDeveloperWallet: true };
  }

  return { error: 'Wallet not connected' };
}

export function validateGiftCardRequest(formData: GiftCardData, contractAddress?: string | null): string | null {
  if (!contractAddress) {
    return 'GiftCard contract is not configured for this network. Set VITE_AVAX_CONTRACT_ADDRESS in .env.';
  }

  if (formData.recipientType === 'address') {
    if (!formData.recipientAddress || !formData.recipientAddress.startsWith('0x')) {
      return 'Please enter a valid recipient address';
    }
  } else if (!formData.recipientUsername || formData.recipientUsername.trim() === '') {
    return `Please enter a ${getRecipientLabel(formData.recipientType)} username`;
  }

  if (!formData.amount || parseFloat(formData.amount) <= 0) {
    return 'Please enter a valid amount';
  }

  return null;
}

export function getTokenAddress(currency: GiftCardCurrency, contracts: any) {
  const tokenByCurrency: Record<GiftCardCurrency, string | undefined> = {
    USDC: contracts.usdc,
    EURC: contracts.eurc,
    PATHUSD: contracts.pathusd,
    ALPHAUSD: contracts.alphausd,
    BETAUSD: contracts.betausd,
    THETAUSD: contracts.thetausd
  };

  return tokenByCurrency[currency] ?? contracts.usdc;
}

export function toTokenUnits(amount: string) {
  return toMicro(amount).toString();
}

export function normalizeRecipientUsername(formData: GiftCardData) {
  if (formData.recipientType === 'address') {
    return '';
  }

  return formData.recipientUsername.toLowerCase().replace(/^@/, '').trim();
}

function getRecipientLabel(recipientType: RecipientType) {
  return RECIPIENT_LABELS[recipientType];
}

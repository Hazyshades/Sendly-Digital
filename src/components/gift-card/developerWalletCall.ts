import type { GiftCardData } from './types';
import { normalizeRecipientUsername } from './giftCardRequest';

export function getDeveloperWalletCall(params: {
  formData: GiftCardData;
  amountWei: string;
  tokenAddress: string;
  metadataUri: string;
}) {
  const { formData, amountWei, tokenAddress, metadataUri } = params;
  const normalizedUsername = normalizeRecipientUsername(formData);
  const amount = BigInt(amountWei);

  switch (formData.recipientType) {
    case 'twitter':
      return {
        functionName: 'createGiftCardForTwitter',
        args: [normalizedUsername, amount, tokenAddress, metadataUri, formData.message]
      };
    case 'twitch':
      return {
        functionName: 'createGiftCardForTwitch',
        args: [normalizedUsername, amount, tokenAddress, metadataUri, formData.message]
      };
    case 'telegram':
      return {
        functionName: 'createGiftCardForTelegram',
        args: [normalizedUsername, amount, tokenAddress, metadataUri, formData.message]
      };
    case 'tiktok':
      return {
        functionName: 'createGiftCardForTikTok',
        args: [normalizedUsername, amount, tokenAddress, metadataUri, formData.message]
      };
    case 'instagram':
      return {
        functionName: 'createGiftCardForInstagram',
        args: [normalizedUsername, amount, tokenAddress, metadataUri, formData.message]
      };
    case 'address':
      return {
        functionName: 'createGiftCard',
        args: [formData.recipientAddress, amount, tokenAddress, metadataUri, formData.message]
      };
  }
}

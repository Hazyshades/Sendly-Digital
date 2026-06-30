import { GiftCardsService } from '@/lib/supabase/giftCards';
import type { GiftCardData, RecipientType } from './types';
import type { GiftCardCreationResult } from './flowTypes';

export async function saveCreatedGiftCard(params: {
  result: GiftCardCreationResult;
  formData: GiftCardData;
  activeChainId: number;
  createAddress: string;
  metadataUri: string;
}) {
  const { result, formData, activeChainId, createAddress, metadataUri } = params;
  const recipientUsernameForStorage = getRecipientUsernameForStorage(formData);
  const eventType = getGiftCardEventType(formData.recipientType);

  await GiftCardsService.upsertCard({
    token_id: result.tokenId,
    chain_id: activeChainId,
    sender_address: (createAddress || '').toLowerCase(),
    recipient_address: formData.recipientType === 'address' ? formData.recipientAddress.toLowerCase() : null,
    recipient_username: recipientUsernameForStorage,
    recipient_type: formData.recipientType,
    amount: formData.amount,
    currency: formData.currency,
    message: formData.message,
    redeemed: false,
    tx_hash: result.txHash
  }, activeChainId);

  await GiftCardsService.upsertCardGraph({
    token_id: result.tokenId,
    chain_id: activeChainId,
    sender_address: (createAddress || '').toLowerCase(),
    recipient_address: formData.recipientType === 'address' ? formData.recipientAddress.toLowerCase() : null,
    recipient_username: recipientUsernameForStorage,
    recipient_type: formData.recipientType,
    amount: formData.amount,
    currency: formData.currency,
    message: formData.message,
    redeemed: false,
    tx_hash: result.txHash,
    event_type: eventType,
    uri: metadataUri,
    block_number: null,
    block_timestamp: null
  }, activeChainId);
}

export function getGiftCardEventType(recipientType: RecipientType) {
  switch (recipientType) {
    case 'twitter':
      return 'GiftCardCreatedForTwitter';
    case 'twitch':
      return 'GiftCardCreatedForTwitch';
    case 'telegram':
      return 'GiftCardCreatedForTelegram';
    case 'tiktok':
      return 'GiftCardCreatedForTikTok';
    case 'instagram':
      return 'GiftCardCreatedForInstagram';
    case 'address':
      return 'GiftCardCreated';
  }
}

export function getRecipientUsernameForStorage(formData: GiftCardData) {
  return formData.recipientType === 'address'
    ? null
    : formData.recipientUsername.replace(/^@/, '').trim();
}

import web3Service from '@/lib/web3/web3Service';
import { createTwitterCardMapping } from '@/lib/twitter';
import { createTwitchCardMapping } from '@/lib/twitch';
import { createTelegramCardMapping } from '@/lib/telegram';
import { createTikTokCardMapping } from '@/lib/tiktok';
import { createInstagramCardMapping } from '@/lib/instagram';
import type { GiftCardData, SocialRecipientType } from './types';
import type { GiftCardCreationResult } from './flowTypes';

interface SocialMappingPayload {
  tokenId: string;
  username: string;
  temporaryOwner: string;
  senderAddress: string;
  amount: string;
  currency: string;
  message: string;
  metadataUri: string;
}

const SOCIAL_GIFT_CARD_ADAPTERS: Record<SocialRecipientType, {
  createCard: (username: string, formData: GiftCardData, metadataUri: string) => Promise<GiftCardCreationResult>;
  saveMapping: (payload: SocialMappingPayload) => Promise<unknown>;
}> = {
  twitter: {
    createCard: (username, formData, metadataUri) =>
      web3Service.createCardForTwitter(username, formData.amount, formData.currency, metadataUri, formData.message),
    saveMapping: createTwitterCardMapping
  },
  twitch: {
    createCard: (username, formData, metadataUri) =>
      web3Service.createCardForTwitch(username, formData.amount, formData.currency, metadataUri, formData.message),
    saveMapping: createTwitchCardMapping
  },
  telegram: {
    createCard: (username, formData, metadataUri) =>
      web3Service.createCardForTelegram(username, formData.amount, formData.currency, metadataUri, formData.message),
    saveMapping: createTelegramCardMapping
  },
  tiktok: {
    createCard: (username, formData, metadataUri) =>
      web3Service.createCardForTikTok(username, formData.amount, formData.currency, metadataUri, formData.message),
    saveMapping: createTikTokCardMapping
  },
  instagram: {
    createCard: (username, formData, metadataUri) =>
      web3Service.createCardForInstagram(username, formData.amount, formData.currency, metadataUri, formData.message),
    saveMapping: createInstagramCardMapping
  }
};

export async function createSocialGiftCard(params: {
  formData: GiftCardData;
  normalizedUsername: string;
  metadataUri: string;
}): Promise<GiftCardCreationResult> {
  const { formData, normalizedUsername, metadataUri } = params;
  if (formData.recipientType === 'address') {
    throw new Error('Address recipients are not social gift cards');
  }

  return SOCIAL_GIFT_CARD_ADAPTERS[formData.recipientType].createCard(normalizedUsername, formData, metadataUri);
}

export async function saveSocialCardMapping(params: {
  formData: GiftCardData;
  result: GiftCardCreationResult;
  normalizedUsername: string;
  createAddress: string;
  metadataUri: string;
}) {
  const { formData, result, normalizedUsername, createAddress, metadataUri } = params;
  if (formData.recipientType === 'address') {
    return;
  }

  try {
    await SOCIAL_GIFT_CARD_ADAPTERS[formData.recipientType].saveMapping({
      tokenId: result.tokenId,
      username: normalizedUsername,
      temporaryOwner: '',
      senderAddress: createAddress,
      amount: formData.amount,
      currency: formData.currency,
      message: formData.message,
      metadataUri
    });
  } catch (error) {
    console.error(`Error saving ${formData.recipientType} card metadata:`, error);
  }
}

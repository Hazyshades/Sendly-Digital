import type { TelegramCardMapping } from '@/types/social';
import { giftCardMappingAPI } from '@/lib/giftCards/mappingAPI';

export type { TelegramCardMapping };

export const telegramCardsAPI = giftCardMappingAPI('telegram');

export async function createTelegramCardMapping(data: {
  tokenId: string;
  username: string;
  temporaryOwner: string;
  senderAddress: string;
  amount: string;
  currency: string;
  message: string;
  metadataUri: string;
}): Promise<TelegramCardMapping> {
  return telegramCardsAPI.create(data) as Promise<TelegramCardMapping>;
}

export async function getPendingTelegramCards(username: string): Promise<TelegramCardMapping[]> {
  return telegramCardsAPI.getPending(username) as Promise<TelegramCardMapping[]>;
}

export async function getTelegramCardMapping(tokenId: string): Promise<TelegramCardMapping | null> {
  return telegramCardsAPI.getByToken(tokenId) as Promise<TelegramCardMapping | null>;
}

export async function claimTelegramCard(
  tokenId: string,
  username: string,
  walletAddress: string,
): Promise<TelegramCardMapping> {
  return telegramCardsAPI.claim(tokenId, username, walletAddress) as Promise<TelegramCardMapping>;
}

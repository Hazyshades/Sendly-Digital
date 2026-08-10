import type { TikTokCardMapping } from '@/types/social';
import { giftCardMappingAPI } from '@/lib/giftCards/mappingAPI';

export type { TikTokCardMapping };

export const tiktokCardsAPI = giftCardMappingAPI('tiktok');

export async function createTikTokCardMapping(data: {
  tokenId: string;
  username: string;
  temporaryOwner: string;
  senderAddress: string;
  amount: string;
  currency: string;
  message: string;
  metadataUri: string;
}): Promise<TikTokCardMapping> {
  return tiktokCardsAPI.create(data) as Promise<TikTokCardMapping>;
}

export async function getPendingTikTokCards(username: string): Promise<TikTokCardMapping[]> {
  return tiktokCardsAPI.getPending(username) as Promise<TikTokCardMapping[]>;
}

export async function getTikTokCardMapping(tokenId: string): Promise<TikTokCardMapping | null> {
  return tiktokCardsAPI.getByToken(tokenId) as Promise<TikTokCardMapping | null>;
}

export async function claimTikTokCard(
  tokenId: string,
  username: string,
  walletAddress: string,
): Promise<TikTokCardMapping> {
  return tiktokCardsAPI.claim(tokenId, username, walletAddress) as Promise<TikTokCardMapping>;
}

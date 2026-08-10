import type { InstagramCardMapping } from '@/types/social';
import { giftCardMappingAPI } from '@/lib/giftCards/mappingAPI';

export type { InstagramCardMapping };

export const instagramCardsAPI = giftCardMappingAPI('instagram');

export async function createInstagramCardMapping(data: {
  tokenId: string;
  username: string;
  temporaryOwner: string;
  senderAddress: string;
  amount: string;
  currency: string;
  message: string;
  metadataUri: string;
}): Promise<InstagramCardMapping> {
  return instagramCardsAPI.create(data) as Promise<InstagramCardMapping>;
}

export async function getPendingInstagramCards(username: string): Promise<InstagramCardMapping[]> {
  return instagramCardsAPI.getPending(username) as Promise<InstagramCardMapping[]>;
}

export async function getInstagramCardMapping(tokenId: string): Promise<InstagramCardMapping | null> {
  return instagramCardsAPI.getByToken(tokenId) as Promise<InstagramCardMapping | null>;
}

export async function claimInstagramCard(
  tokenId: string,
  username: string,
  walletAddress: string,
): Promise<InstagramCardMapping> {
  return instagramCardsAPI.claim(tokenId, username, walletAddress) as Promise<InstagramCardMapping>;
}

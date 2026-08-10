import type { TwitterCardMapping } from '@/types/social';
import { giftCardMappingAPI } from '@/lib/giftCards/mappingAPI';

export type { TwitterCardMapping };

export const twitterCardsAPI = giftCardMappingAPI('twitter');

export async function createTwitterCardMapping(data: {
  tokenId: string;
  username: string;
  temporaryOwner: string;
  senderAddress: string;
  amount: string;
  currency: string;
  message: string;
  metadataUri: string;
}): Promise<TwitterCardMapping> {
  return twitterCardsAPI.create(data) as Promise<TwitterCardMapping>;
}

export async function getPendingTwitterCards(username: string): Promise<TwitterCardMapping[]> {
  return twitterCardsAPI.getPending(username) as Promise<TwitterCardMapping[]>;
}

export async function getTwitterCardMapping(tokenId: string): Promise<TwitterCardMapping | null> {
  return twitterCardsAPI.getByToken(tokenId) as Promise<TwitterCardMapping | null>;
}

export async function claimTwitterCard(
  tokenId: string,
  username: string,
  walletAddress: string,
): Promise<TwitterCardMapping> {
  return twitterCardsAPI.claim(tokenId, username, walletAddress) as Promise<TwitterCardMapping>;
}

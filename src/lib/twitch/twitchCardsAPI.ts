import type { TwitchCardMapping } from '@/types/social';
import { giftCardMappingAPI } from '@/lib/giftCards/mappingAPI';

export type { TwitchCardMapping };

export const twitchCardsAPI = giftCardMappingAPI('twitch');

export async function createTwitchCardMapping(data: {
  tokenId: string;
  username: string;
  temporaryOwner: string;
  senderAddress: string;
  amount: string;
  currency: string;
  message: string;
  metadataUri: string;
}): Promise<TwitchCardMapping> {
  return twitchCardsAPI.create(data) as Promise<TwitchCardMapping>;
}

export async function getPendingTwitchCards(username: string): Promise<TwitchCardMapping[]> {
  return twitchCardsAPI.getPending(username) as Promise<TwitchCardMapping[]>;
}

export async function getTwitchCardMapping(tokenId: string): Promise<TwitchCardMapping | null> {
  return twitchCardsAPI.getByToken(tokenId) as Promise<TwitchCardMapping | null>;
}

export async function claimTwitchCard(
  tokenId: string,
  username: string,
  walletAddress: string,
): Promise<TwitchCardMapping> {
  return twitchCardsAPI.claim(tokenId, username, walletAddress) as Promise<TwitchCardMapping>;
}

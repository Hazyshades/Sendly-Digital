import { edgeFetch, isEdgeFetchError } from '@/lib/supabase/client';
import type {
  TwitterCardMapping,
  TwitchCardMapping,
  TelegramCardMapping,
  TikTokCardMapping,
  InstagramCardMapping,
} from '@/types/social';
import {
  getGiftCardPlatform,
  type GiftCardPlatform,
} from './registry';

export type GiftCardMapping =
  | TwitterCardMapping
  | TwitchCardMapping
  | TelegramCardMapping
  | TikTokCardMapping
  | InstagramCardMapping;

export type GiftCardMappingCreateInput = {
  tokenId: string;
  username: string;
  temporaryOwner: string;
  senderAddress: string;
  amount: string;
  currency: string;
  message: string;
  metadataUri: string;
};

export type GiftCardMappingAPI = {
  create: (data: GiftCardMappingCreateInput) => Promise<GiftCardMapping>;
  getPending: (username: string) => Promise<GiftCardMapping[]>;
  getByToken: (tokenId: string) => Promise<GiftCardMapping | null>;
  claim: (tokenId: string, username: string, walletAddress: string) => Promise<GiftCardMapping>;
};

export function giftCardMappingAPI(platform: GiftCardPlatform): GiftCardMappingAPI {
  const { apiPathSegment: seg, normalizeHandle, displayName } = getGiftCardPlatform(platform);

  return {
    async create(data) {
      console.log(`Creating ${displayName} mapping at: /gift-cards/${seg}/create`);
      console.log('Request data:', {
        ...data,
        metadataUri: data.metadataUri?.substring(0, 50) + '...',
      });

      try {
        const result = await edgeFetch<{ mapping: GiftCardMapping }>(
          'smart-action',
          `/gift-cards/${seg}/create`,
          { method: 'POST', body: data, auth: 'anon' },
        );
        console.log('Success response:', result);
        return result.mapping;
      } catch (error) {
        console.error(`Error in create ${displayName} card mapping:`, error);
        if (error instanceof TypeError && error.message.includes('fetch')) {
          throw new Error('Network error: Unable to reach the server. Please check your connection.');
        }
        if (isEdgeFetchError(error)) {
          const details = error.errorData?.details;
          const base =
            (typeof error.errorData?.error === 'string' && error.errorData.error) ||
            (typeof error.errorData?.message === 'string' && error.errorData.message) ||
            error.message ||
            `Failed to create ${displayName} card mapping`;
          throw new Error(details ? `${base}: ${details}` : String(base));
        }
        throw error;
      }
    },

    async getPending(username) {
      const normalizedUsername = normalizeHandle(username);
      const result = await edgeFetch<{ cards?: GiftCardMapping[] }>(
        'smart-action',
        `/gift-cards/${seg}/${encodeURIComponent(normalizedUsername)}`,
        { auth: 'anon' },
      );
      return result.cards || [];
    },

    async getByToken(tokenId) {
      const raw = await edgeFetch<{ mapping: GiftCardMapping }>(
        'smart-action',
        `/gift-cards/${seg}/by-token/${encodeURIComponent(tokenId)}`,
        { auth: 'anon', rawResponse: true },
      );
      if (raw.status === 404) return null;
      if (!raw.ok) {
        const errorData = (raw.data && typeof raw.data === 'object' ? raw.data : {}) as Record<
          string,
          unknown
        >;
        throw new Error(
          (typeof errorData.error === 'string' && errorData.error) ||
            `Failed to fetch ${displayName} card mapping`,
        );
      }
      return raw.data.mapping;
    },

    async claim(tokenId, username, walletAddress) {
      const result = await edgeFetch<{ mapping: GiftCardMapping }>(
        'smart-action',
        `/gift-cards/${seg}/${encodeURIComponent(tokenId)}/claim`,
        {
          method: 'POST',
          body: { username, walletAddress },
          auth: 'anon',
        },
      );
      return result.mapping;
    },
  };
}

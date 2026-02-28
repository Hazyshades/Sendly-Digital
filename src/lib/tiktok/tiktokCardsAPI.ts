import { getApiUrl } from '@/lib/supabase/client';
import { publicAnonKey } from '@/lib/supabase/info';
import type { TikTokCardMapping } from '@/types/social';

const SUPABASE_FUNCTION_URL = import.meta.env.VITE_SUPABASE_FUNCTION_URL || `${getApiUrl()}/smart-action`;

export type { TikTokCardMapping };

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
  const url = `${SUPABASE_FUNCTION_URL}/gift-cards/tiktok/create`;
  console.log('Creating TikTok mapping at:', url);
  console.log('Request data:', { ...data, metadataUri: data.metadataUri?.substring(0, 50) + '...' });

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`,
      },
      body: JSON.stringify(data),
    });

    console.log('Response status:', response.status, response.statusText);

    if (!response.ok) {
      let errorMessage = 'Failed to create TikTok card mapping';
      try {
        const errorData = await response.json();
        console.error('Error response:', errorData);
        errorMessage = errorData.error || errorData.message || errorMessage;
        if (errorData.details) {
          errorMessage += `: ${errorData.details}`;
        }
      } catch (e) {
        const text = await response.text().catch(() => '');
        console.error('Failed to parse error response:', text);
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    const result = await response.json();
    console.log('Success response:', result);
    return result.mapping;
  } catch (error) {
    console.error('Error in createTikTokCardMapping:', error);
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Network error: Unable to reach the server. Please check your connection.');
    }
    throw error;
  }
}

export async function getPendingTikTokCards(username: string): Promise<TikTokCardMapping[]> {
  const normalizedUsername = username.toLowerCase().replace(/^@/, '').trim();
  const response = await fetch(`${SUPABASE_FUNCTION_URL}/gift-cards/tiktok/${normalizedUsername}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${publicAnonKey}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to fetch pending TikTok cards');
  }

  const result = await response.json();
  return result.cards || [];
}

export async function getTikTokCardMapping(tokenId: string): Promise<TikTokCardMapping | null> {
  const response = await fetch(`${SUPABASE_FUNCTION_URL}/gift-cards/tiktok/by-token/${tokenId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${publicAnonKey}`,
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to fetch TikTok card mapping');
  }

  const result = await response.json();
  return result.mapping;
}

export async function claimTikTokCard(
  tokenId: string,
  username: string,
  walletAddress: string
): Promise<TikTokCardMapping> {
  const response = await fetch(`${SUPABASE_FUNCTION_URL}/gift-cards/tiktok/${tokenId}/claim`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${publicAnonKey}`,
    },
    body: JSON.stringify({
      username,
      walletAddress,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to claim TikTok card');
  }

  const result = await response.json();
  return result.mapping;
}






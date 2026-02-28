import { getApiUrl } from '@/lib/supabase/client';
import { publicAnonKey } from '@/lib/supabase/info';

const SUPABASE_FUNCTION_URL = import.meta.env.VITE_SUPABASE_FUNCTION_URL || `${getApiUrl()}/smart-action`;

import type { TwitchCardMapping } from '@/types/social';

export type { TwitchCardMapping };

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
  const url = `${SUPABASE_FUNCTION_URL}/gift-cards/twitch/create`;
  console.log('Creating Twitch mapping at:', url);
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
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      let errorMessage = 'Failed to create Twitch card mapping';
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
    console.error('Error in createTwitchCardMapping:', error);
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Network error: Unable to reach the server. Please check your connection.');
    }
    throw error;
  }
}

export async function getPendingTwitchCards(username: string): Promise<TwitchCardMapping[]> {
  const normalizedUsername = username.toLowerCase();
  const response = await fetch(`${SUPABASE_FUNCTION_URL}/gift-cards/twitch/${normalizedUsername}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${publicAnonKey}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch pending Twitch cards');
  }

  const result = await response.json();
  return result.cards || [];
}

export async function getTwitchCardMapping(tokenId: string): Promise<TwitchCardMapping | null> {
  const response = await fetch(`${SUPABASE_FUNCTION_URL}/gift-cards/twitch/by-token/${tokenId}`, {
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
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch Twitch card mapping');
  }

  const result = await response.json();
  return result.mapping;
}

export async function claimTwitchCard(
  tokenId: string,
  username: string,
  walletAddress: string
): Promise<TwitchCardMapping> {
  const response = await fetch(`${SUPABASE_FUNCTION_URL}/gift-cards/twitch/${tokenId}/claim`, {
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
    const error = await response.json();
    throw new Error(error.error || 'Failed to claim Twitch card');
  }

  const result = await response.json();
  return result.mapping;
}





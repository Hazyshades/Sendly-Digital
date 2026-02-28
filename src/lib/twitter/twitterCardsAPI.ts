import { getApiUrl } from '@/lib/supabase/client';
import { publicAnonKey } from '@/lib/supabase/info';

// Correctly form URL: getApiUrl() already returns /functions/v1
// Function name is 'smart-action' (corresponds to URL in Dashboard)
const SUPABASE_FUNCTION_URL = import.meta.env.VITE_SUPABASE_FUNCTION_URL || `${getApiUrl()}/smart-action`;

import type { TwitterCardMapping } from '@/types/social';

export type { TwitterCardMapping };

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
  const url = `${SUPABASE_FUNCTION_URL}/gift-cards/twitter/create`;
  console.log('Creating Twitter mapping at:', url);
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
      let errorMessage = 'Failed to create Twitter card mapping';
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
    console.error('Error in createTwitterCardMapping:', error);
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Network error: Unable to reach the server. Please check your connection.');
    }
    throw error;
  }
}

export async function getPendingTwitterCards(username: string): Promise<TwitterCardMapping[]> {
  const normalizedUsername = username.toLowerCase().replace('@', '');
  const response = await fetch(`${SUPABASE_FUNCTION_URL}/gift-cards/twitter/${normalizedUsername}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${publicAnonKey}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch pending Twitter cards');
  }

  const result = await response.json();
  return result.cards || [];
}

export async function getTwitterCardMapping(tokenId: string): Promise<TwitterCardMapping | null> {
  const response = await fetch(`${SUPABASE_FUNCTION_URL}/gift-cards/twitter/by-token/${tokenId}`, {
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
    throw new Error(error.error || 'Failed to fetch Twitter card mapping');
  }

  const result = await response.json();
  return result.mapping;
}

export async function claimTwitterCard(
  tokenId: string,
  username: string,
  walletAddress: string
): Promise<TwitterCardMapping> {
  const response = await fetch(`${SUPABASE_FUNCTION_URL}/gift-cards/twitter/${tokenId}/claim`, {
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
    throw new Error(error.error || 'Failed to claim Twitter card');
  }

  const result = await response.json();
  return result.mapping;
}




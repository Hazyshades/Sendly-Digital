import { getApiUrl } from '@/lib/supabase/client';
import { publicAnonKey } from '@/lib/supabase/info';
import type { TelegramCardMapping } from '@/types/social';

const SUPABASE_FUNCTION_URL = import.meta.env.VITE_SUPABASE_FUNCTION_URL || `${getApiUrl()}/smart-action`;

export type { TelegramCardMapping };

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
  const url = `${SUPABASE_FUNCTION_URL}/gift-cards/telegram/create`;
  console.log('Creating Telegram mapping at:', url);
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
      let errorMessage = 'Failed to create Telegram card mapping';
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
    console.error('Error in createTelegramCardMapping:', error);
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Network error: Unable to reach the server. Please check your connection.');
    }
    throw error;
  }
}

export async function getPendingTelegramCards(username: string): Promise<TelegramCardMapping[]> {
  const normalizedUsername = username.toLowerCase().replace(/^@/, '').trim();
  const response = await fetch(`${SUPABASE_FUNCTION_URL}/gift-cards/telegram/${normalizedUsername}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${publicAnonKey}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to fetch pending Telegram cards');
  }

  const result = await response.json();
  return result.cards || [];
}

export async function getTelegramCardMapping(tokenId: string): Promise<TelegramCardMapping | null> {
  const response = await fetch(`${SUPABASE_FUNCTION_URL}/gift-cards/telegram/by-token/${tokenId}`, {
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
    throw new Error(error.error || 'Failed to fetch Telegram card mapping');
  }

  const result = await response.json();
  return result.mapping;
}

export async function claimTelegramCard(
  tokenId: string,
  username: string,
  walletAddress: string
): Promise<TelegramCardMapping> {
  const response = await fetch(`${SUPABASE_FUNCTION_URL}/gift-cards/telegram/${tokenId}/claim`, {
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
    throw new Error(error.error || 'Failed to claim Telegram card');
  }

  const result = await response.json();
  return result.mapping;
}






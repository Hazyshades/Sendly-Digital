/**
 * Telegram user lookup for username input preview (avatar + name).
 * Calls zk-sender Edge Function GET /zk-sender/telegram/user (zktls-service MTProto + DB cache).
 */

import { getApiUrl } from '../supabase/client';
import { publicAnonKey } from '../supabase/info';

export interface TelegramUserPreview {
  username: string;
  name: string;
  profile_image_url: string | null;
}

export interface TelegramUserLookupResult {
  success: true;
  data: TelegramUserPreview;
}

export interface TelegramUserLookupError {
  success: false;
  error: string;
  code: string;
}

export type TelegramUserLookupResponse = TelegramUserLookupResult | TelegramUserLookupError;

function getTelegramLookupBaseUrl(): string {
  return (
    (import.meta.env.VITE_SUPABASE_ZKSEND_FUNCTION_URL as string | undefined) ||
    (import.meta.env.VITE_SUPABASE_FUNCTION_URL as string | undefined) ||
    getApiUrl()
  );
}

/**
 * Normalize username: trim, remove leading @, lowercase for API lookup.
 */
export function normalizeTelegramUsername(handle: string): string {
  return handle.trim().replace(/^@/, '').toLowerCase();
}

/**
 * Fetch Telegram user profile by username for preview.
 * Returns result with success/error for UI to show avatar, name, or error message.
 */
export async function fetchTelegramUserPreview(username: string): Promise<TelegramUserLookupResponse> {
  const normalized = normalizeTelegramUsername(username);
  if (!normalized) {
    return { success: false, error: 'Enter a username', code: 'MISSING_USERNAME' };
  }

  const base = getTelegramLookupBaseUrl().replace(/\/$/, '');
  const url = `${base}/zk-sender/telegram/user?username=${encodeURIComponent(normalized)}`;

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${publicAnonKey}` },
    });
    const body = await res.json().catch(() => ({}));

    if (res.ok && body.username) {
      return {
        success: true,
        data: {
          username: body.username,
          name: body.name ?? body.username,
          profile_image_url: body.profile_image_url ?? null,
        },
      };
    }

    if (res.status === 404 || body.code === 'USER_NOT_FOUND') {
      return { success: false, error: 'User not found', code: 'USER_NOT_FOUND' };
    }
    if (res.status === 429 || body.code === 'RATE_LIMITED') {
      return { success: false, error: 'Too many requests', code: 'RATE_LIMITED' };
    }
    if (res.status === 503 || body.code === 'TELEGRAM_NOT_CONFIGURED') {
      return { success: false, error: 'Telegram lookup not available', code: 'TELEGRAM_NOT_CONFIGURED' };
    }

    const message = typeof body.error === 'string' ? body.error : 'Request failed';
    return {
      success: false,
      error: message,
      code: body.code ?? 'REQUEST_FAILED',
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Request failed';
    return { success: false, error: message, code: 'NETWORK_ERROR' };
  }
}

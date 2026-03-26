/**
 * Twitch user lookup for login input preview (avatar, display_name, followers).
 * Calls zk-sender Edge Function GET /zk-sender/twitch/user (Helix API + DB cache).
 */

import { getApiUrl } from '@/lib/supabase/client';
import { publicAnonKey } from '@/lib/supabase/info';

export interface TwitchUserPreview {
  login: string;
  display_name: string;
  profile_image_url: string | null;
  followers_total: number;
}

export interface TwitchUserLookupResult {
  success: true;
  data: TwitchUserPreview;
}

export interface TwitchUserLookupError {
  success: false;
  error: string;
  code: string;
}

export type TwitchUserLookupResponse = TwitchUserLookupResult | TwitchUserLookupError;

function getTwitchLookupBaseUrl(): string {
  return (
    (import.meta.env.VITE_SUPABASE_ZKSEND_FUNCTION_URL as string | undefined) ||
    (import.meta.env.VITE_SUPABASE_FUNCTION_URL as string | undefined) ||
    getApiUrl()
  );
}

/**
 * Normalize login: trim, remove leading @, lowercase.
 */
export function normalizeTwitchLogin(handle: string): string {
  return handle.trim().replace(/^@/, '').toLowerCase();
}

/**
 * Format followers count for display (e.g. 39200 -> "39.2K").
 */
export function formatTwitchFollowers(total: number): string {
  if (total >= 1_000_000) {
    return `${(total / 1_000_000).toFixed(1)}M`;
  }
  if (total >= 1_000) {
    return `${(total / 1_000).toFixed(1)}K`;
  }
  return String(total);
}

/**
 * Fetch Twitch user profile by login for preview.
 * Returns result with success/error for UI to show avatar, display_name, followers, or error message.
 */
export async function fetchTwitchUserPreview(login: string): Promise<TwitchUserLookupResponse> {
  const normalized = normalizeTwitchLogin(login);
  if (!normalized) {
    return { success: false, error: 'Enter a username', code: 'MISSING_LOGIN' };
  }

  const base = getTwitchLookupBaseUrl().replace(/\/$/, '');
  const url = `${base}/zk-sender/twitch/user?login=${encodeURIComponent(normalized)}`;

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${publicAnonKey}` },
    });
    const body = await res.json().catch(() => ({}));

    if (res.ok && body.login) {
      return {
        success: true,
        data: {
          login: body.login,
          display_name: body.display_name ?? body.login,
          profile_image_url: body.profile_image_url ?? null,
          followers_total: typeof body.followers_total === 'number' ? body.followers_total : 0,
        },
      };
    }

    if (res.status === 404 || body.code === 'USER_NOT_FOUND') {
      return { success: false, error: 'User not found', code: 'USER_NOT_FOUND' };
    }
    if (res.status === 429 || body.code === 'RATE_LIMITED') {
      return { success: false, error: 'Too many requests', code: 'RATE_LIMITED' };
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

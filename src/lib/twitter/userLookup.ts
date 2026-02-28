/**
 * Twitter/X user lookup for handle input preview (avatar + name).
 * First checks Supabase cache (twitter_user_cache) to avoid hitting Twitter API;
 * only calls zk-sender Edge Function GET /zk-sender/twitter/user on cache miss.
 */

import { getApiUrl, supabase } from '@/lib/supabase/client';
import { publicAnonKey } from '@/lib/supabase/info';

const TWITTER_USER_CACHE_TABLE = 'twitter_user_cache';

export interface TwitterUserPreview {
  username: string;
  name: string;
  profile_image_url: string | null;
}

export interface TwitterUserLookupResult {
  success: true;
  data: TwitterUserPreview;
}

export interface TwitterUserLookupError {
  success: false;
  error: string;
  code: string;
}

export type TwitterUserLookupResponse = TwitterUserLookupResult | TwitterUserLookupError;

function getTwitterLookupBaseUrl(): string {
  return (
    (import.meta.env.VITE_SUPABASE_ZKSEND_FUNCTION_URL as string | undefined) ||
    (import.meta.env.VITE_SUPABASE_FUNCTION_URL as string | undefined) ||
    getApiUrl()
  );
}

/**
 * Normalize handle: trim and remove leading @.
 */
export function normalizeTwitterHandle(handle: string): string {
  return handle.trim().replace(/^@/, '');
}

/**
 * Fetch Twitter user profile by username for preview.
 * First looks up Supabase cache to avoid calling Twitter API; only calls Edge Function on cache miss.
 * Returns result with success/error for UI to show avatar, name, or error message.
 */
export async function fetchTwitterUserPreview(username: string): Promise<TwitterUserLookupResponse> {
  const normalized = normalizeTwitterHandle(username);
  if (!normalized) {
    return { success: false, error: 'Enter a username', code: 'MISSING_USERNAME' };
  }

  // 1. First check Supabase cache so we don't hit Twitter API when data already exists
  try {
    const { data: row, error: dbError } = await supabase
      .from(TWITTER_USER_CACHE_TABLE)
      .select('username, name, profile_image_url')
      .ilike('username', normalized)
      .maybeSingle();

    if (!dbError && row?.username) {
      return {
        success: true,
        data: {
          username: row.username,
          name: row.name ?? row.username,
          profile_image_url: row.profile_image_url ?? null,
        },
      };
    }
    // On DB error or no row, fall through to Edge Function (e.g. new username)
  } catch {
    // Supabase unavailable or table missing: fall through to Edge Function
  }

  // 2. Cache miss or no cache table: call zk-sender Edge Function (may use Twitter API)
  const base = getTwitterLookupBaseUrl().replace(/\/$/, '');
  const url = `${base}/zk-sender/twitter/user?username=${encodeURIComponent(normalized)}`;

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

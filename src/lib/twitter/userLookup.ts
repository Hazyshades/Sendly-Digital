/**
 * Twitter/X user lookup for handle input preview (avatar + name).
 * First checks Supabase cache (twitter_user_cache) to avoid hitting Twitter API;
 * only calls zk-sender Edge Function GET /zk-sender/twitter/user on cache miss or stale cache.
 */

import { getApiUrl, supabase } from '@/lib/supabase/client';
import { publicAnonKey } from '@/lib/supabase/info';

const TWITTER_USER_CACHE_TABLE = 'twitter_user_cache';

/**
 * Soft TTL for proactive revalidation.
 * Keep this aligned with backend TWITTER_USER_CACHE_DAYS (7d) so we do not
 * burn twitterapi.io credits on every revisit - avatar URL 404 still triggers
 * a one-shot refresh when the profile picture actually changed.
 */
export const TWITTER_CACHE_SOFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface TwitterUserPreview {
  username: string;
  name: string;
  profile_image_url: string | null;
  /** Cache timestamp from DB when available (ISO). */
  updated_at?: string | null;
}

export interface TwitterUserLookupResult {
  success: true;
  data: TwitterUserPreview;
  /** True when returned from cache without a live API refresh. */
  fromCache?: boolean;
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
 * Twitter CDN often serves `_normal` avatars that 404 after profile changes.
 * Try the next larger variant before giving up on the cached URL.
 */
export function upgradeTwitterAvatarUrl(url: string): string | null {
  if (url.includes('_normal.')) return url.replace('_normal.', '_bigger.');
  if (url.includes('_bigger.')) return url.replace('_bigger.', '_400x400.');
  return null;
}

function isCacheFresh(updatedAt: string | null | undefined, now = Date.now()): boolean {
  if (!updatedAt) return false;
  const ts = Date.parse(updatedAt);
  if (!Number.isFinite(ts)) return false;
  return now - ts < TWITTER_CACHE_SOFT_TTL_MS;
}

function previewFromRow(row: {
  username: string;
  name?: string | null;
  profile_image_url?: string | null;
  updated_at?: string | null;
}): TwitterUserPreview {
  return {
    username: row.username,
    name: row.name ?? row.username,
    profile_image_url: row.profile_image_url ?? null,
    updated_at: row.updated_at ?? null,
  };
}

async function fetchTwitterUserFromEdge(
  normalized: string,
  refresh: boolean
): Promise<TwitterUserLookupResponse> {
  const base = getTwitterLookupBaseUrl().replace(/\/$/, '');
  let url = `${base}/zk-sender/twitter/user?username=${encodeURIComponent(normalized)}`;
  if (refresh) url += '&refresh=1';

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${publicAnonKey}` },
    });
    const body = await res.json().catch(() => ({}));

    if (res.ok && body.username) {
      return {
        success: true,
        fromCache: Boolean(body.from_cache),
        data: {
          username: body.username,
          name: body.name ?? body.username,
          profile_image_url: body.profile_image_url ?? null,
          updated_at: body.updated_at ?? new Date().toISOString(),
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

export interface FetchTwitterUserPreviewOptions {
  /** Skip Supabase cache and always call Edge Function. Use when image returned 404 to get fresh profile_image_url. */
  skipCache?: boolean;
  /** Append refresh=1 so backend force-refreshes from Twitter API. */
  refresh?: boolean;
}

/**
 * Fetch Twitter user profile by username for preview.
 * Fresh cache (< soft TTL) returns immediately. Stale cache triggers Edge refresh;
 * if refresh fails, stale cache is returned so the UI still works.
 */
export async function fetchTwitterUserPreview(
  username: string,
  options?: FetchTwitterUserPreviewOptions
): Promise<TwitterUserLookupResponse> {
  const normalized = normalizeTwitterHandle(username);
  if (!normalized) {
    return { success: false, error: 'Enter a username', code: 'MISSING_USERNAME' };
  }

  const forceRefresh = options?.skipCache === true || options?.refresh === true;

  let stale: TwitterUserPreview | null = null;

  if (!forceRefresh) {
    try {
      const { data: row, error: dbError } = await supabase
        .from(TWITTER_USER_CACHE_TABLE)
        .select('username, name, profile_image_url, updated_at')
        .ilike('username', normalized)
        .maybeSingle();

      if (!dbError && row?.username) {
        const preview = previewFromRow(row);
        if (isCacheFresh(row.updated_at)) {
          return { success: true, fromCache: true, data: preview };
        }
        stale = preview;
      }
    } catch {
      // Supabase unavailable or table missing: fall through to Edge Function
    }
  }

  const edge = await fetchTwitterUserFromEdge(normalized, forceRefresh || Boolean(stale));
  if (edge.success) return edge;

  // Keep serving stale cache when live refresh fails (broken API / rate limit).
  if (stale) {
    return { success: true, fromCache: true, data: stale };
  }

  return edge;
}

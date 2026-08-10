/**
 * Twitter/X user lookup for handle input preview (avatar + name).
 * Prefer Supabase `twitter_user_cache`. Never call Twitter API when the DB
 * already has a profile_image_url (unless explicit refresh / skipCache).
 */

import { edgeFetch, supabase } from '@/lib/supabase/client';

const TWITTER_USER_CACHE_TABLE = 'twitter_user_cache';

/** Memory / soft TTL for in-app preview cache (does not force Twitter API). */
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

async function readTwitterUserCache(normalized: string): Promise<TwitterUserPreview | null> {
  try {
    const { data: row, error: dbError } = await supabase
      .from(TWITTER_USER_CACHE_TABLE)
      .select('username, name, profile_image_url, updated_at')
      .ilike('username', normalized)
      .maybeSingle();

    if (dbError || !row?.username) return null;
    return previewFromRow(row);
  } catch {
    return null;
  }
}

type TwitterEdgeBody = {
  username?: string;
  name?: string;
  profile_image_url?: string | null;
  updated_at?: string | null;
  from_cache?: boolean;
  error?: string;
  code?: string;
};

async function fetchTwitterUserFromEdge(
  normalized: string,
  refresh: boolean,
): Promise<TwitterUserLookupResponse> {
  let path = `/twitter/user?username=${encodeURIComponent(normalized)}`;
  if (refresh) path += '&refresh=1';

  try {
    const { ok, status, data: body } = await edgeFetch<TwitterEdgeBody>('zk-sender', path, {
      method: 'GET',
      auth: 'anon',
      rawResponse: true,
    });

    if (ok && body.username) {
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

    if (status === 404 || body.code === 'USER_NOT_FOUND') {
      return { success: false, error: 'User not found', code: 'USER_NOT_FOUND' };
    }
    if (status === 429 || body.code === 'RATE_LIMITED') {
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
  /**
   * Only read Supabase cache — never call Edge / Twitter API.
   * Returns CACHE_MISS when the row is absent (or has no avatar when requireImage is true).
   */
  cacheOnly?: boolean;
  /** With cacheOnly, treat a row without profile_image_url as a miss. Default true. */
  requireImage?: boolean;
}

/**
 * Fetch Twitter user profile by username for preview.
 * If `twitter_user_cache` already has profile_image_url → return it and do not call Twitter API.
 * API is used only on cache miss (or explicit refresh / skipCache).
 */
export async function fetchTwitterUserPreview(
  username: string,
  options?: FetchTwitterUserPreviewOptions,
): Promise<TwitterUserLookupResponse> {
  const normalized = normalizeTwitterHandle(username);
  if (!normalized) {
    return { success: false, error: 'Enter a username', code: 'MISSING_USERNAME' };
  }

  const forceRefresh = options?.skipCache === true || options?.refresh === true;
  const requireImage = options?.requireImage !== false;

  if (!forceRefresh) {
    const cached = await readTwitterUserCache(normalized);
    if (cached) {
      const hasImage = Boolean(cached.profile_image_url);
      if (hasImage || !requireImage) {
        return { success: true, fromCache: true, data: cached };
      }
      if (options?.cacheOnly) {
        return { success: false, error: 'Not in cache', code: 'CACHE_MISS' };
      }
      // Row without image: fall through to Edge once to populate avatar.
    } else if (options?.cacheOnly) {
      return { success: false, error: 'Not in cache', code: 'CACHE_MISS' };
    }
  }

  return fetchTwitterUserFromEdge(normalized, forceRefresh);
}

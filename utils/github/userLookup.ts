/**
 * GitHub user lookup for username input preview (avatar + name).
 * Calls zk-sender Edge Function GET /zk-sender/github/user (GitHub REST API).
 */

import { getApiUrl } from '../supabase/client';
import { publicAnonKey } from '../supabase/info';

export interface GitHubUserPreview {
  login: string;
  name: string;
  avatar_url: string | null;
}

export interface GitHubUserLookupResult {
  success: true;
  data: GitHubUserPreview;
}

export interface GitHubUserLookupError {
  success: false;
  error: string;
  code: string;
}

export type GitHubUserLookupResponse = GitHubUserLookupResult | GitHubUserLookupError;

function getGitHubLookupBaseUrl(): string {
  return (
    (import.meta.env.VITE_SUPABASE_ZKSEND_FUNCTION_URL as string | undefined) ||
    (import.meta.env.VITE_SUPABASE_FUNCTION_URL as string | undefined) ||
    getApiUrl()
  );
}

/**
 * Normalize login: trim, remove leading @, lowercase for API lookup.
 */
export function normalizeGitHubLogin(handle: string): string {
  return handle.trim().replace(/^@/, '').toLowerCase();
}

/**
 * Fetch GitHub user profile by username for preview.
 * Returns result with success/error for UI to show avatar, name, or error message.
 */
export async function fetchGitHubUserPreview(username: string): Promise<GitHubUserLookupResponse> {
  const normalized = normalizeGitHubLogin(username);
  if (!normalized) {
    return { success: false, error: 'Enter a username', code: 'MISSING_USERNAME' };
  }

  const base = getGitHubLookupBaseUrl().replace(/\/$/, '');
  const url = `${base}/zk-sender/github/user?username=${encodeURIComponent(normalized)}`;

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
          name: body.name ?? body.login,
          avatar_url: body.avatar_url ?? null,
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

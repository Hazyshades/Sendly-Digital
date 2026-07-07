import { publicAnonKey } from '@/lib/supabase/info';
import { getCreatorPaywallApiBase } from '@/lib/paywall/creatorPaywallAPI';

export type CreatorProfile = {
  platform: string;
  handle: string;
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  identityHash: string;
};

export type CreatorArticleSummary = {
  slug: string;
  title: string;
  priceUsdc: string;
  teaser: string;
  createdAt: string;
};

export type CreatorProfileResponse = {
  profile: CreatorProfile;
  articles: CreatorArticleSummary[];
};

function authHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${publicAnonKey}`,
  };
}

export async function getCreatorProfile(
  platform: string,
  handle: string,
): Promise<CreatorProfileResponse | { status: 'not_found' }> {
  const base = getCreatorPaywallApiBase();
  const url = `${base}/creator/${encodeURIComponent(platform)}/${encodeURIComponent(handle)}`;
  const response = await fetch(url, { method: 'GET', headers: authHeaders() });
  if (response.status === 404) return { status: 'not_found' };
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || `HTTP ${response.status}`);
  }
  return (await response.json()) as CreatorProfileResponse;
}

export type UpsertCreatorProfileInput = {
  platform: string;
  handle: string;
  githubAccessToken?: string;
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
};

export async function upsertCreatorProfile(
  input: UpsertCreatorProfileInput,
): Promise<{ profile: CreatorProfile | null; created: boolean }> {
  const base = getCreatorPaywallApiBase();
  const response = await fetch(`${base}/creator/profile`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || `HTTP ${response.status}`);
  }
  return (await response.json()) as { profile: CreatorProfile | null; created: boolean };
}

export async function updateCreatorProfile(
  input: UpsertCreatorProfileInput,
): Promise<{ profile: CreatorProfile }> {
  const base = getCreatorPaywallApiBase();
  const response = await fetch(`${base}/creator/profile`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || `HTTP ${response.status}`);
  }
  return (await response.json()) as { profile: CreatorProfile };
}

export function getCreatorProfilePath(platform: string, handle: string): string {
  return `/creator/${platform}/${handle}`;
}

import { creatorPaywallClient } from '@/lib/paywall/paywallClient';

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

export async function getCreatorProfile(
  platform: string,
  handle: string,
): Promise<CreatorProfileResponse | { status: 'not_found' }> {
  const { ok, status, data } = await creatorPaywallClient<CreatorProfileResponse | { error?: string }>(
    `/creator/${encodeURIComponent(platform)}/${encodeURIComponent(handle)}`,
    { method: 'GET', rawResponse: true },
  );
  if (status === 404) return { status: 'not_found' };
  if (!ok) {
    throw new Error((data as { error?: string }).error || `HTTP ${status}`);
  }
  return data as CreatorProfileResponse;
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
  return creatorPaywallClient<{ profile: CreatorProfile | null; created: boolean }>('/creator/profile', {
    method: 'POST',
    body: input,
  });
}

export async function updateCreatorProfile(
  input: UpsertCreatorProfileInput,
): Promise<{ profile: CreatorProfile }> {
  return creatorPaywallClient<{ profile: CreatorProfile }>('/creator/profile', {
    method: 'PATCH',
    body: input,
  });
}

export function getCreatorProfilePath(platform: string, handle: string): string {
  return `/creator/${platform}/${handle}`;
}

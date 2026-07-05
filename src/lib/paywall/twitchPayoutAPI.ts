import { getApiUrl } from '@/lib/supabase/client';
import { publicAnonKey } from '@/lib/supabase/info';

const BASE =
  (import.meta.env.VITE_CREATOR_PAYWALL_URL as string | undefined)?.trim().replace(/\/$/, '') ||
  `${getApiUrl()}/creator-paywall`;

async function twitchFetch(path: string, init?: RequestInit) {
  const headers = new Headers(init?.headers);
  if (!headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${publicAnonKey}`);
  }
  if (init?.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return data;
}

export type TwitchCampaignStatus = 'draft' | 'active' | 'paused' | 'ended';

export type TwitchCampaign = {
  id: string;
  sponsorId: string;
  broadcasterUserId: string;
  broadcasterLoginSnapshot: string | null;
  name: string;
  totalBudgetUsdc: string;
  remainingBudgetUsdc: string;
  status: TwitchCampaignStatus;
  startsAt: string | null;
  endsAt: string | null;
};

export type TwitchRaidPolicy = {
  id: string;
  campaignId: string;
  eventType: string;
  payoutKind: string;
  minViewers: number;
  ratePerViewerUsdc: string;
  maxPerEventUsdc: string;
  maxPerDayUsdc: string | null;
  enabled: boolean;
};

export type TwitchPayoutReceipt = {
  campaignId: string;
  policyId: string;
  recipientUserId: string;
  recipientLogin: string | null;
  amount: string;
  status: string;
  paymentId: string | null;
  txHash: string | null;
  claimStatus: string;
  skipReason: string | null;
  evidence: Record<string, unknown> | null;
  createdAt: string;
};

export async function fetchTwitchCampaigns(): Promise<TwitchCampaign[]> {
  const data = (await twitchFetch('/twitch/campaigns')) as { campaigns?: TwitchCampaign[] };
  return data.campaigns ?? [];
}

export async function fetchTwitchPayoutPolicies(): Promise<TwitchRaidPolicy[]> {
  const data = (await twitchFetch('/twitch/payout-policies')) as {
    policies?: TwitchRaidPolicy[];
  };
  return data.policies ?? [];
}

export async function fetchTwitchPayoutReceipts(): Promise<TwitchPayoutReceipt[]> {
  const data = (await twitchFetch('/twitch-payouts')) as { receipts?: TwitchPayoutReceipt[] };
  return data.receipts ?? [];
}

export async function createTwitchCampaign(input: {
  sponsorId: string;
  broadcasterUserId: string;
  broadcasterLoginSnapshot?: string;
  name: string;
  totalBudgetUsdc: number;
  status?: TwitchCampaignStatus;
}): Promise<TwitchCampaign> {
  const data = (await twitchFetch('/twitch/campaigns', {
    method: 'POST',
    body: JSON.stringify(input),
  })) as { campaign: TwitchCampaign };
  return data.campaign;
}

export async function upsertTwitchRaidPolicy(input: {
  campaignId: string;
  minViewers?: number;
  ratePerViewerUsdc: number;
  maxPerEventUsdc: number;
  maxPerDayUsdc?: number;
  enabled?: boolean;
}): Promise<TwitchRaidPolicy> {
  const data = (await twitchFetch('/twitch/payout-policy', {
    method: 'POST',
    body: JSON.stringify(input),
  })) as { policy: TwitchRaidPolicy };
  return data.policy;
}

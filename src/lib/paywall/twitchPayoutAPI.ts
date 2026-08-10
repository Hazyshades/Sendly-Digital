import { creatorPaywallClient, unwrapItems } from '@/lib/paywall/paywallClient';

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
  const data = await creatorPaywallClient<Record<string, unknown>>('/twitch/campaigns');
  return unwrapItems<TwitchCampaign>(data, 'campaigns');
}

export async function fetchTwitchPayoutPolicies(): Promise<TwitchRaidPolicy[]> {
  const data = await creatorPaywallClient<Record<string, unknown>>('/twitch/payout-policies');
  return unwrapItems<TwitchRaidPolicy>(data, 'policies');
}

export async function fetchTwitchPayoutReceipts(): Promise<TwitchPayoutReceipt[]> {
  const data = await creatorPaywallClient<Record<string, unknown>>('/twitch-payouts');
  return unwrapItems<TwitchPayoutReceipt>(data, 'receipts');
}

export async function createTwitchCampaign(input: {
  sponsorId: string;
  broadcasterUserId: string;
  broadcasterLoginSnapshot?: string;
  name: string;
  totalBudgetUsdc: number;
  status?: TwitchCampaignStatus;
}): Promise<TwitchCampaign> {
  const data = await creatorPaywallClient<{ campaign: TwitchCampaign }>('/twitch/campaigns', {
    method: 'POST',
    body: input,
  });
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
  const data = await creatorPaywallClient<{ policy: TwitchRaidPolicy }>('/twitch/payout-policy', {
    method: 'POST',
    body: input,
  });
  return data.policy;
}

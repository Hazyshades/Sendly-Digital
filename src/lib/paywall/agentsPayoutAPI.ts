import { leptonApiClient, unwrapItems } from '@/lib/lepton/leptonApiClient';
import type { PrPayoutPolicy, PrPayoutReceipt } from '@/lib/paywall/prPayoutAPI';
import type { TwitchCampaign, TwitchCampaignStatus, TwitchRaidPolicy } from '@/lib/paywall/twitchPayoutAPI';

/** Agents-owned policy fields returned by authenticated Agents endpoints. */
export type AgentsPrPayoutPolicy = PrPayoutPolicy & {
  ownerUserRef?: string | null;
  sponsorCircleWalletId?: string | null;
};

export type GithubAppConnectionStatus = {
  repoFullName: string;
  connected: boolean;
  installationId?: number | null;
  message?: string;
};

export type GithubAppInstallInfo = {
  installUrl: string;
};

const session = { auth: 'session' as const };

function normalizeRepoFullName(raw: string): string {
  return raw.trim().replace(/^https?:\/\/github\.com\//i, '').replace(/\.git$/i, '').replace(/\/+$/, '');
}

export function isValidRepoFullName(raw: string): boolean {
  const name = normalizeRepoFullName(raw);
  return /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(name);
}

export { normalizeRepoFullName };

function withWalletQuery(path: string, walletId?: string, extra?: Record<string, string>): string {
  const params = new URLSearchParams(extra);
  if (walletId?.trim()) params.set('sponsorCircleWalletId', walletId.trim());
  const q = params.toString();
  if (!q) return path;
  return `${path}${path.includes('?') ? '&' : '?'}${q}`;
}

/** Owner-scoped GitHub policies (Agents write surface). */
export async function fetchMyPrPayoutPolicies(walletId?: string): Promise<AgentsPrPayoutPolicy[]> {
  const data = await leptonApiClient<Record<string, unknown>>(
    withWalletQuery('/agents/pr-payout-policy', walletId),
    session,
  );
  return unwrapItems<AgentsPrPayoutPolicy>(data, 'policies');
}

export async function upsertMyPrPayoutPolicy(input: {
  repoFullName: string;
  repoId?: number;
  perPrAmountUsdc: number;
  dailyCapUsdc: number;
  budgetRemainingUsdc: number;
  active: boolean;
  sponsorCircleWalletId: string;
}): Promise<AgentsPrPayoutPolicy> {
  const repoFullName = normalizeRepoFullName(input.repoFullName);
  const data = await leptonApiClient<{ policy: AgentsPrPayoutPolicy }>('/agents/pr-payout-policy', {
    ...session,
    method: 'POST',
    body: { ...input, repoFullName },
  });
  return data.policy;
}

export async function fetchMyPrPayoutReceipts(
  walletId?: string,
  repoFullName?: string,
): Promise<PrPayoutReceipt[]> {
  const extra: Record<string, string> = {};
  if (repoFullName) extra.repo = normalizeRepoFullName(repoFullName);
  const data = await leptonApiClient<Record<string, unknown>>(
    withWalletQuery('/agents/pr-payouts', walletId, extra),
    session,
  );
  return unwrapItems<PrPayoutReceipt>(data, 'receipts');
}

export async function fetchGithubAppStatus(repoFullName: string): Promise<GithubAppConnectionStatus> {
  const repo = normalizeRepoFullName(repoFullName);
  const data = await leptonApiClient<GithubAppConnectionStatus>(
    `/agents/github-app/status?repo=${encodeURIComponent(repo)}`,
    session,
  );
  return data;
}

export async function fetchGithubAppInstallUrl(repoFullName?: string): Promise<GithubAppInstallInfo> {
  const fromEnv = (import.meta.env.VITE_GITHUB_APP_INSTALL_URL as string | undefined)?.trim();
  if (fromEnv) {
    const url = repoFullName
      ? `${fromEnv}${fromEnv.includes('?') ? '&' : '?'}suggested_repo=${encodeURIComponent(normalizeRepoFullName(repoFullName))}`
      : fromEnv;
    return { installUrl: url };
  }
  const q = repoFullName ? `?repo=${encodeURIComponent(normalizeRepoFullName(repoFullName))}` : '';
  return leptonApiClient<GithubAppInstallInfo>(`/agents/github-app/install-url${q}`, session);
}

export async function fetchMyTwitchCampaigns(walletId?: string): Promise<TwitchCampaign[]> {
  const data = await leptonApiClient<Record<string, unknown>>(
    withWalletQuery('/agents/twitch/campaigns', walletId),
    session,
  );
  return unwrapItems<TwitchCampaign>(data, 'campaigns');
}

export async function fetchMyTwitchPayoutPolicies(walletId?: string): Promise<TwitchRaidPolicy[]> {
  const data = await leptonApiClient<Record<string, unknown>>(
    withWalletQuery('/agents/twitch/payout-policies', walletId),
    session,
  );
  return unwrapItems<TwitchRaidPolicy>(data, 'policies');
}

export async function createMyTwitchCampaign(input: {
  sponsorCircleWalletId: string;
  broadcasterUserId: string;
  broadcasterLoginSnapshot?: string;
  name: string;
  totalBudgetUsdc: number;
  status?: TwitchCampaignStatus;
}): Promise<TwitchCampaign> {
  const data = await leptonApiClient<{ campaign: TwitchCampaign }>('/agents/twitch/campaigns', {
    ...session,
    method: 'POST',
    body: input,
  });
  return data.campaign;
}

export async function upsertMyTwitchRaidPolicy(input: {
  campaignId: string;
  minViewers?: number;
  ratePerViewerUsdc: number;
  maxPerEventUsdc: number;
  maxPerDayUsdc?: number;
  enabled?: boolean;
}): Promise<TwitchRaidPolicy> {
  const data = await leptonApiClient<{ policy: TwitchRaidPolicy }>('/agents/twitch/payout-policy', {
    ...session,
    method: 'POST',
    body: input,
  });
  return data.policy;
}

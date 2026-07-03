import { getApiUrl } from '@/lib/supabase/client';
import { publicAnonKey } from '@/lib/supabase/info';

const BASE =
  (import.meta.env.VITE_CREATOR_PAYWALL_URL as string | undefined)?.trim().replace(/\/$/, '') ||
  `${getApiUrl()}/creator-paywall`;

async function prFetch(path: string, init?: RequestInit) {
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

export type PrPayoutReceipt = {
  repo: string;
  prNumber: number;
  author: string;
  amount: string;
  status: string;
  paymentId: string | null;
  txHash: string | null;
  claimStatus: string;
  skipReason: string | null;
  createdAt: string;
};

export type PrPayoutPolicy = {
  repoId: number;
  repoFullName: string;
  sponsorPoolRef: string;
  perPrAmountUsdc: string;
  dailyCapUsdc: string;
  budgetRemainingUsdc: string;
  active: boolean;
};

export async function fetchPrPayoutReceipts(): Promise<PrPayoutReceipt[]> {
  const data = (await prFetch('/pr-payouts')) as { receipts?: PrPayoutReceipt[] };
  return data.receipts ?? [];
}

export async function fetchPrPayoutPolicies(): Promise<PrPayoutPolicy[]> {
  const data = (await prFetch('/pr-payout-policy')) as { policies?: PrPayoutPolicy[] };
  return data.policies ?? [];
}

export function getCreatorPaywallBase(): string {
  return BASE;
}

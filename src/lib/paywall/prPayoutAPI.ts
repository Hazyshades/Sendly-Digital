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

export type PayoutKind = 'merge' | 'bounty' | 'release' | 'review';

export const PAYOUT_KINDS: PayoutKind[] = ['merge', 'bounty', 'release', 'review'];

/** Fixed sponsor pool wallet shown across Lepton pages. */
export const SPONSOR_WALLET_ADDRESS = '0x6d4c724a90f4180d2784f56d4b96b5d4a461e9ca';

/** Shorten an EVM address for display: 0x1234…abcd. */
export function shortenAddress(address: string, lead = 6, tail = 4): string {
  if (!address || address.length <= lead + tail + 1) return address;
  return `${address.slice(0, lead)}…${address.slice(-tail)}`;
}

export type PrPayoutReceipt = {
  kind?: string;
  repo: string;
  prNumber: number | null;
  author: string;
  amount: string;
  status: string;
  paymentId: string | null;
  txHash: string | null;
  claimStatus: string;
  skipReason: string | null;
  createdAt: string;
};

const KIND_LABELS: Record<PayoutKind, string> = {
  merge: 'Merge',
  bounty: 'Bounty',
  release: 'Release',
  review: 'Review',
};

export function formatPayoutKindLabel(kind: string | undefined | null): string {
  if (!kind) return '-';
  if (kind in KIND_LABELS) return KIND_LABELS[kind as PayoutKind];
  return kind;
}

export function parsePayoutKindFilter(raw: string | null): PayoutKind | 'all' {
  if (!raw || raw === 'all') return 'all';
  if (PAYOUT_KINDS.includes(raw as PayoutKind)) return raw as PayoutKind;
  return 'all';
}

export type PrPayoutPolicy = {
  repoId: number;
  repoFullName: string;
  sponsorPoolRef: string;
  perPrAmountUsdc: string;
  dailyCapUsdc: string;
  budgetRemainingUsdc: string;
  active: boolean;
  bountyEnabled?: boolean;
  releasePoolUsdc?: string | number;
  splitMode?: string;
  reviewAmountUsdc?: string | number;
  reviewMinChars?: number;
  maxReviewersPerPr?: number;
};

export type IssueBounty = {
  repoFullName: string;
  issueNumber: number;
  amountUsdc: string | number;
  status: string;
};

/** Parse NUMERIC/string USDC values for display. */
export function formatUsdcAmount(value: string | number | undefined | null): string {
  if (value == null || value === '') return '0 USDC';
  const n = typeof value === 'number' ? value : parseFloat(String(value));
  if (!Number.isFinite(n)) return '0 USDC';
  const formatted = Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, '');
  return `${formatted} USDC`;
}

export async function fetchPrPayoutReceipts(): Promise<PrPayoutReceipt[]> {
  const data = (await prFetch('/pr-payouts')) as { receipts?: PrPayoutReceipt[] };
  return data.receipts ?? [];
}

export async function fetchPrPayoutPolicies(): Promise<PrPayoutPolicy[]> {
  const data = (await prFetch('/pr-payout-policy')) as { policies?: PrPayoutPolicy[] };
  return data.policies ?? [];
}

export async function fetchActiveIssueBounties(): Promise<IssueBounty[]> {
  const data = (await prFetch('/repo-bounties')) as { bounties?: IssueBounty[] };
  return data.bounties ?? [];
}

export function getCreatorPaywallBase(): string {
  return BASE;
}

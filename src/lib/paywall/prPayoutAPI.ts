import { toMicro, fromMicro } from '@/lib/tokenAmount';
import { creatorPaywallClient, getCreatorPaywallBase, unwrapItems } from '@/lib/paywall/paywallClient';

export { getCreatorPaywallBase };

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

/**
 * Parse NUMERIC/string USDC values for display.
 * Uses toMicro/fromMicro so trailing zeros are stripped without float drift.
 * (formatDisplayAmount alone would turn `5` into `5.00` — not used for that reason.)
 */
export function formatUsdcAmount(value: string | number | undefined | null): string {
  if (value == null || value === '') return '0 USDC';
  try {
    const raw = typeof value === 'number' ? String(value) : String(value).trim();
    if (!raw) return '0 USDC';
    return `${fromMicro(toMicro(raw))} USDC`;
  } catch {
    const n = typeof value === 'number' ? value : parseFloat(String(value));
    if (!Number.isFinite(n)) return '0 USDC';
    const formatted = Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, '');
    return `${formatted} USDC`;
  }
}

export async function fetchPrPayoutReceipts(): Promise<PrPayoutReceipt[]> {
  const data = await creatorPaywallClient<Record<string, unknown>>('/pr-payouts');
  return unwrapItems<PrPayoutReceipt>(data, 'receipts');
}

export async function fetchPrPayoutPolicies(): Promise<PrPayoutPolicy[]> {
  const data = await creatorPaywallClient<Record<string, unknown>>('/pr-payout-policy');
  return unwrapItems<PrPayoutPolicy>(data, 'policies');
}

export async function fetchActiveIssueBounties(): Promise<IssueBounty[]> {
  const data = await creatorPaywallClient<Record<string, unknown>>('/repo-bounties');
  return unwrapItems<IssueBounty>(data, 'bounties');
}

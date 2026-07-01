import { getApiUrl } from '@/lib/supabase/client';
import { publicAnonKey } from '@/lib/supabase/info';

const CREATOR_PAYWALL_BASE =
  (import.meta.env.VITE_CREATOR_PAYWALL_URL as string | undefined)?.trim().replace(/\/$/, '') ||
  `${getApiUrl()}/creator-paywall`;

export const MIN_PAYWALL_PRICE_USDC = 0.5;

export type PaywallPaymentInstructions = {
  slug: string;
  title: string;
  priceUsdc: string;
  recipient: { platform: string; handle: string };
  identityHash: string;
  chainId: string;
  contractAddress: string;
  usdcAddress: string;
  settlement: string;
  minPriceUsdc?: string;
};

export type PaywallLockedResponse = {
  error: 'payment_required';
  paywall: PaywallPaymentInstructions;
};

export type PaywallUnlockedResponse = {
  unlocked: true;
  slug: string;
  title: string;
  contentBody: string;
  recipient: { platform: string; handle: string };
  paymentId: string;
  txHash: string | null;
};

export type CreatePaywallInput = {
  githubAccessToken: string;
  slug: string;
  handle: string;
  priceUsdc: number;
  title: string;
  contentBody: string;
};

export type CreatePaywallResponse = {
  paywall: {
    id: string;
    slug: string;
    platform: string;
    handle: string;
    price_usdc: string;
    title: string;
    identity_hash: string;
    created_at: string;
  };
};

function paywallUrl(slug: string): string {
  const encoded = slug.split('/').map(encodeURIComponent).join('/');
  return `${CREATOR_PAYWALL_BASE}/paywall/${encoded}`;
}

export async function fetchPaywall(
  slug: string,
  proof?: { paymentId: string; txHash?: string; source?: 'human' | 'agent' },
): Promise<
  | { status: 'locked'; instructions: PaywallPaymentInstructions }
  | { status: 'unlocked'; data: PaywallUnlockedResponse }
  | { status: 'not_found' }
> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${publicAnonKey}`,
  };
  if (proof?.paymentId) {
    headers['X-Sendly-Payment-Id'] = proof.paymentId;
    if (proof.txHash) headers['X-Sendly-Tx-Hash'] = proof.txHash;
    headers['X-Sendly-Source'] = proof.source ?? 'human';
  }

  const response = await fetch(paywallUrl(slug), { method: 'GET', headers });

  if (response.status === 404) {
    return { status: 'not_found' };
  }

  if (response.status === 402) {
    const body = (await response.json()) as PaywallLockedResponse;
    return { status: 'locked', instructions: body.paywall };
  }

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || `HTTP ${response.status}`);
  }

  const data = (await response.json()) as PaywallUnlockedResponse;
  return { status: 'unlocked', data };
}

export async function createPaywall(input: CreatePaywallInput): Promise<CreatePaywallResponse> {
  const response = await fetch(`${CREATOR_PAYWALL_BASE}/paywall`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${publicAnonKey}`,
    },
    body: JSON.stringify({
      githubAccessToken: input.githubAccessToken,
      slug: input.slug,
      handle: input.handle,
      priceUsdc: input.priceUsdc,
      title: input.title,
      contentBody: input.contentBody,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as { error?: string; details?: string }).details || (err as { error?: string }).error || `HTTP ${response.status}`);
  }

  return response.json() as Promise<CreatePaywallResponse>;
}

export function getCreatorPaywallPublicPath(slug: string): string {
  return `/pay/${slug}`;
}

export function getCreatorPaywallApiBase(): string {
  return CREATOR_PAYWALL_BASE;
}

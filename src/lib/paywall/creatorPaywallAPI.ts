import { isEdgeFetchError } from '@/lib/supabase/client';
import { creatorPaywallClient, getCreatorPaywallBase } from '@/lib/paywall/paywallClient';

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
  paymentId: string | null;
  txHash: string | null;
  owner?: boolean;
};

export type CreatePaywallInput = {
  platform?: string;
  githubAccessToken?: string;
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

function paywallPath(slug: string): string {
  const encoded = slug.split('/').map(encodeURIComponent).join('/');
  return `/paywall/${encoded}`;
}

export async function fetchPaywall(
  slug: string,
  proof?: {
    paymentId?: string;
    txHash?: string | null;
    source?: 'human' | 'agent';
    githubAccessToken?: string;
    ownerPlatform?: string;
    ownerOAuthToken?: string;
    ownerOAuthUsername?: string;
  },
): Promise<
  | { status: 'locked'; instructions: PaywallPaymentInstructions }
  | { status: 'unlocked'; data: PaywallUnlockedResponse }
  | { status: 'not_found' }
> {
  const headers: Record<string, string> = {};
  if (proof?.paymentId) {
    headers['X-Sendly-Payment-Id'] = proof.paymentId;
    if (proof.txHash) headers['X-Sendly-Tx-Hash'] = proof.txHash;
    headers['X-Sendly-Source'] = proof.source ?? 'human';
  }
  if (proof?.githubAccessToken) {
    headers['X-Sendly-Github-Token'] = proof.githubAccessToken;
  }
  if (proof?.ownerPlatform && proof?.ownerOAuthToken) {
    headers['X-Sendly-Oauth-Platform'] = proof.ownerPlatform;
    headers['X-Sendly-Oauth-Token'] = proof.ownerOAuthToken;
    if (proof.ownerOAuthUsername) {
      headers['X-Sendly-Oauth-Username'] = proof.ownerOAuthUsername;
    }
  }

  const { ok, status, data } = await creatorPaywallClient<
    PaywallLockedResponse | PaywallUnlockedResponse | { error?: string }
  >(paywallPath(slug), {
    method: 'GET',
    headers,
    rawResponse: true,
  });

  if (status === 404) {
    return { status: 'not_found' };
  }

  if (status === 402) {
    const body = data as PaywallLockedResponse;
    return { status: 'locked', instructions: body.paywall };
  }

  if (!ok) {
    throw new Error((data as { error?: string }).error || `HTTP ${status}`);
  }

  return { status: 'unlocked', data: data as PaywallUnlockedResponse };
}

export async function createPaywall(input: CreatePaywallInput): Promise<CreatePaywallResponse> {
  try {
    return await creatorPaywallClient<CreatePaywallResponse>('/paywall', {
      method: 'POST',
      body: {
        platform: input.platform ?? 'github',
        githubAccessToken: input.githubAccessToken,
        slug: input.slug,
        handle: input.handle,
        priceUsdc: input.priceUsdc,
        title: input.title,
        contentBody: input.contentBody,
      },
    });
  } catch (err) {
    if (isEdgeFetchError(err)) {
      const details = err.errorData?.details;
      const error = err.errorData?.error;
      throw new Error(
        (typeof details === 'string' && details) ||
          (typeof error === 'string' && error) ||
          err.message,
      );
    }
    throw err;
  }
}

export function getCreatorPaywallPublicPath(slug: string): string {
  return `/pay/${slug}`;
}

export function getCreatorPaywallApiBase(): string {
  return getCreatorPaywallBase();
}

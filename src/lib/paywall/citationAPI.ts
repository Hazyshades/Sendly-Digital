import { creatorPaywallClient } from '@/lib/paywall/paywallClient';

export type CitationSource = {
  id: string;
  source_ref: string;
  source_type: 'slug' | 'url';
  platform: string;
  handle: string;
  price_usdc: string;
};

export type CitationPaymentRecord = {
  sourceRef: string;
  slug: string;
  title: string;
  platform: string;
  handle: string;
  amountUsdc: number;
  paymentId: string;
  txHash: string;
  excerpt: string;
};

export type CitationRunResult = {
  question: string;
  answer: string;
  citations: CitationPaymentRecord[];
};

export async function fetchCitationSources(): Promise<CitationSource[]> {
  const data = await creatorPaywallClient<{ sources?: CitationSource[] }>('/citation/sources');
  return data.sources ?? [];
}

export async function runCitationDemo(question: string): Promise<CitationRunResult> {
  return creatorPaywallClient<CitationRunResult>('/citation/demo-run', {
    method: 'POST',
    body: { question },
  });
}

export async function seedCitationFromPaywalls(slugs?: string[]): Promise<number> {
  const data = await creatorPaywallClient<{ count?: number }>('/citation/seed-from-paywalls', {
    method: 'POST',
    body: slugs?.length ? { slugs } : {},
  });
  return data.count ?? 0;
}

import { leptonApiClient } from '@/lib/lepton/leptonApiClient';

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
  const data = await leptonApiClient<{ sources?: CitationSource[] }>('/citation/sources');
  return data.sources ?? [];
}

export async function runCitationDemo(question: string): Promise<CitationRunResult> {
  return leptonApiClient<CitationRunResult>('/citation/demo-run', {
    method: 'POST',
    body: { question },
  });
}

export async function seedCitationSources(slugs?: string[]): Promise<number> {
  const data = await leptonApiClient<{ count?: number }>('/citation/seed-from-paywalls', {
    method: 'POST',
    body: slugs?.length ? { slugs } : {},
  });
  return data.count ?? 0;
}

import { getApiUrl } from '@/lib/supabase/client';
import { publicAnonKey } from '@/lib/supabase/info';

const BASE =
  (import.meta.env.VITE_CREATOR_PAYWALL_URL as string | undefined)?.trim().replace(/\/$/, '') ||
  `${getApiUrl()}/creator-paywall`;

async function citationFetch(path: string, init?: RequestInit) {
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
  const data = (await citationFetch('/citation/sources')) as { sources?: CitationSource[] };
  return data.sources ?? [];
}

export async function runCitationDemo(question: string): Promise<CitationRunResult> {
  return (await citationFetch('/citation/demo-run', {
    method: 'POST',
    body: JSON.stringify({ question }),
  })) as CitationRunResult;
}

export async function seedCitationFromPaywalls(slugs?: string[]): Promise<number> {
  const data = (await citationFetch('/citation/seed-from-paywalls', {
    method: 'POST',
    body: JSON.stringify(slugs?.length ? { slugs } : {}),
  })) as { count?: number };
  return data.count ?? 0;
}

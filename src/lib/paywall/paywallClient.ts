import { edgeFetch, getApiUrl, type EdgeFetchInit, type EdgeFetchRawResult } from '@/lib/supabase/client';

/** Resolved creator-paywall function base (env override or `/creator-paywall` under getApiUrl). */
export function getCreatorPaywallBase(): string {
  return (
    (import.meta.env.VITE_CREATOR_PAYWALL_URL as string | undefined)?.trim().replace(/\/$/, '') ||
    `${getApiUrl()}/creator-paywall`
  );
}

type PaywallInit = Omit<EdgeFetchInit, 'baseUrl'>;

/**
 * Thin edgeFetch wrapper for the creator-paywall Edge Function.
 * Defaults to anon Bearer auth (same as the previous per-file helpers).
 */
export async function creatorPaywallClient<T = unknown>(
  path: string,
  init: PaywallInit & { rawResponse: true },
): Promise<EdgeFetchRawResult<T>>;
export async function creatorPaywallClient<T = unknown>(
  path: string,
  init?: PaywallInit & { rawResponse?: false },
): Promise<T>;
export async function creatorPaywallClient<T = unknown>(
  path: string,
  init?: PaywallInit,
): Promise<T | EdgeFetchRawResult<T>> {
  const { rawResponse, ...rest } = init ?? {};
  if (rawResponse) {
    return edgeFetch<T>('creator-paywall', path, { auth: 'anon', ...rest, rawResponse: true });
  }
  return edgeFetch<T>('creator-paywall', path, { auth: 'anon', ...rest, rawResponse: false });
}

/**
 * Normalize list payloads: many paywall routes return `{ items }` or a domain key
 * (`receipts` / `policies` / `campaigns` / `bounties`).
 */
export function unwrapItems<T>(data: Record<string, unknown>, altKey: string): T[] {
  if (Array.isArray(data.items)) return data.items as T[];
  const alt = data[altKey];
  if (Array.isArray(alt)) return alt as T[];
  return [];
}

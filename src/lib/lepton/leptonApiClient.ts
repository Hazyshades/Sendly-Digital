import { edgeFetch, getApiUrl, type EdgeFetchInit, type EdgeFetchRawResult } from '@/lib/supabase/client';

/** Resolved API base for retained Lepton endpoints. */
export function getLeptonApiBase(): string {
  return (
    (import.meta.env.VITE_CREATOR_PAYWALL_URL as string | undefined)?.trim().replace(/\/$/, '') ||
    `${getApiUrl()}/creator-paywall`
  );
}

type LeptonApiInit = Omit<EdgeFetchInit, 'baseUrl'>;

/** Thin edgeFetch wrapper for retained Lepton endpoints. */
export async function leptonApiClient<T = unknown>(
  path: string,
  init: LeptonApiInit & { rawResponse: true },
): Promise<EdgeFetchRawResult<T>>;
export async function leptonApiClient<T = unknown>(
  path: string,
  init?: LeptonApiInit & { rawResponse?: false },
): Promise<T>;
export async function leptonApiClient<T = unknown>(
  path: string,
  init?: LeptonApiInit,
): Promise<T | EdgeFetchRawResult<T>> {
  const { rawResponse, ...rest } = init ?? {};
  if (rawResponse) {
    return edgeFetch<T>('creator-paywall', path, { auth: 'anon', ...rest, rawResponse: true });
  }
  return edgeFetch<T>('creator-paywall', path, { auth: 'anon', ...rest, rawResponse: false });
}

/** Normalize list payloads returned by retained Lepton endpoints. */
export function unwrapItems<T>(data: Record<string, unknown>, altKey: string): T[] {
  if (Array.isArray(data.items)) return data.items as T[];
  const alt = data[altKey];
  if (Array.isArray(alt)) return alt as T[];
  return [];
}

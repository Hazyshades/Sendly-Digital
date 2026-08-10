import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from './info';

const supabase = createClient(
  `https://${projectId}.supabase.co`,
  publicAnonKey
);

export { supabase };

export const getApiUrl = () => `https://${projectId}.supabase.co/functions/v1`;

export const getFunctionUrl = (functionName: string = 'smart-action') =>
  `${getApiUrl()}/${functionName}`;

/** HTTP error from edgeFetch / apiCall. Carries status + parsed JSON body. */
export class EdgeFetchError extends Error {
  status: number;
  errorData: Record<string, unknown>;
  details: unknown;
  error: unknown;

  constructor(message: string, status: number, errorData: Record<string, unknown>) {
    super(message);
    this.name = 'EdgeFetchError';
    this.status = status;
    this.errorData = errorData;
    this.details = errorData.details;
    this.error = errorData.error;
  }
}

export function isEdgeFetchError(err: unknown): err is EdgeFetchError {
  return err instanceof EdgeFetchError;
}

export type EdgeFetchAuth = 'session' | 'anon' | 'none';

export type EdgeFetchInit = {
  method?: string;
  /** Object is JSON-encoded; strings are sent as-is (apiCall compatibility). */
  body?: unknown;
  /** 'session' = access_token with anon-key fallback (same as legacy apiCall). */
  auth?: EdgeFetchAuth;
  headers?: Record<string, string>;
  /** Override resolved base (no trailing slash). When set, URL is `${baseUrl}/${fn}${path}` (fn omitted if empty). */
  baseUrl?: string;
  /**
   * When true, never throws on HTTP !ok — returns `{ ok, status, data }` so callers
   * can map 404/402/429 themselves (userLookup, paywall lock, etc.).
   */
  rawResponse?: boolean;
};

export type EdgeFetchRawResult<T> = { ok: boolean; status: number; data: T };

/**
 * Resolve Edge Function host once.
 * - zk-sender / direct-send: VITE_SUPABASE_ZKSEND_FUNCTION_URL ?? VITE_SUPABASE_FUNCTION_URL ?? getApiUrl()
 *   (host is `/functions/v1` — fn name is appended)
 * - creator-paywall: VITE_CREATOR_PAYWALL_URL ?? `${getApiUrl()}/creator-paywall`
 *   (already includes function name — fn is NOT appended again)
 * - default: getApiUrl() (fn appended)
 */
function resolveEdgeBase(fn: string, baseUrl?: string): { root: string; appendFn: boolean } {
  if (baseUrl) {
    return { root: baseUrl.replace(/\/$/, ''), appendFn: Boolean(fn) };
  }

  if (fn === 'zk-sender' || fn === 'direct-send') {
    const root = (
      (import.meta.env.VITE_SUPABASE_ZKSEND_FUNCTION_URL as string | undefined) ||
      (import.meta.env.VITE_SUPABASE_FUNCTION_URL as string | undefined) ||
      getApiUrl()
    ).replace(/\/$/, '');
    return { root, appendFn: true };
  }

  if (fn === 'creator-paywall') {
    const explicit = (import.meta.env.VITE_CREATOR_PAYWALL_URL as string | undefined)?.trim();
    const root = (explicit || `${getApiUrl()}/creator-paywall`).replace(/\/$/, '');
    return { root, appendFn: false };
  }

  return { root: getApiUrl().replace(/\/$/, ''), appendFn: Boolean(fn) };
}

function buildEdgeUrl(fn: string, path: string, baseUrl?: string): string {
  const { root, appendFn } = resolveEdgeBase(fn, baseUrl);
  const p = !path ? '' : path.startsWith('/') ? path : `/${path}`;
  const fnSeg = appendFn && fn ? `/${fn}` : '';
  return `${root}${fnSeg}${p}`;
}

async function resolveBearer(auth: EdgeFetchAuth): Promise<string | null> {
  if (auth === 'none') return null;
  if (auth === 'anon') return publicAnonKey;
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token || publicAnonKey;
}

function encodeBody(body: unknown): string | undefined {
  if (body === undefined || body === null) return undefined;
  if (typeof body === 'string') return body;
  return JSON.stringify(body);
}

/**
 * Shared fetch for Supabase Edge Functions.
 *
 * @example
 *   await edgeFetch('zk-sender', '/payments', { method: 'POST', body: input, auth: 'anon' });
 *   await edgeFetch('creator-paywall', '/pr-payouts', { auth: 'anon' });
 *   const raw = await edgeFetch('zk-sender', '/twitter/user?username=a', { auth: 'anon', rawResponse: true });
 *
 * Error semantics (rawResponse !== true):
 *   throws EdgeFetchError with `.status`, `.errorData`, `.details`, `.error`
 *   message = errorData.error || `HTTP ${status}` (same shaping as legacy apiCall).
 */
export async function edgeFetch<T = unknown>(
  fn: string,
  path: string,
  init: EdgeFetchInit & { rawResponse: true },
): Promise<EdgeFetchRawResult<T>>;
export async function edgeFetch<T = unknown>(
  fn: string,
  path: string,
  init?: EdgeFetchInit & { rawResponse?: false },
): Promise<T>;
export async function edgeFetch<T = unknown>(
  fn: string,
  path: string,
  init: EdgeFetchInit = {},
): Promise<T | EdgeFetchRawResult<T>> {
  const auth = init.auth ?? 'session';
  const method = init.method ?? (init.body !== undefined ? 'POST' : 'GET');
  const bearer = await resolveBearer(auth);
  const body = encodeBody(init.body);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...init.headers,
  };
  if (bearer && !headers.Authorization && !headers.authorization) {
    headers.Authorization = `Bearer ${bearer}`;
  }

  const url = buildEdgeUrl(fn, path, init.baseUrl);
  const response = await fetch(url, {
    method,
    headers,
    body: method === 'GET' || method === 'HEAD' ? undefined : body,
  });

  const data = (await response.json().catch(() =>
    init.rawResponse ? ({} as T) : ({ error: 'Unknown error' } as T),
  )) as T;

  if (init.rawResponse) {
    return { ok: response.ok, status: response.status, data };
  }

  if (!response.ok) {
    const errorData = (data && typeof data === 'object' ? data : { error: 'Unknown error' }) as Record<
      string,
      unknown
    >;
    const message =
      (typeof errorData.error === 'string' && errorData.error) || `HTTP ${response.status}`;
    throw new EdgeFetchError(message, response.status, errorData);
  }

  return data;
}

/** Legacy smart-action helper. Returns `any` (same as response.json()) for call-site compat. */
export const apiCall = async (endpoint: string, options: RequestInit = {}): Promise<any> => {
  const fullEndpoint = endpoint.startsWith('/smart-action')
    ? endpoint
    : `/smart-action${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  const stripped = fullEndpoint.replace(/^\//, '');
  const slash = stripped.indexOf('/');
  const fn = slash === -1 ? stripped : stripped.slice(0, slash);
  const path = slash === -1 ? '' : stripped.slice(slash);

  const headerRecord: Record<string, string> = {};
  if (options.headers) {
    const h = new Headers(options.headers);
    h.forEach((value, key) => {
      headerRecord[key] = value;
    });
  }

  return edgeFetch<any>(fn, path, {
    method: options.method,
    body: options.body,
    auth: 'session',
    headers: headerRecord,
  });
};

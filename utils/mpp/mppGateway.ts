import { getApiUrl, supabase } from '../supabase/client';

type PaidCallResult<T> =
  | { ok: true; data: T; receipt: string | null }
  | { ok: false; paymentRequired: true; challenge: string | null; status: number }
  | { ok: false; paymentRequired: false; error: string; status: number };

export type ResolveRecipientRequest = {
  platform: 'github' | 'twitch';
  handle: string;
};

export type ResolveRecipientResponse = {
  verified: boolean;
  platform: string;
  handle: string;
  displayName: string;
  avatarUrl: string | null;
  recipientType: string;
  confidence: number;
  correlationId: string;
};

export type PrepareTipRequest = {
  platform: 'github' | 'twitch';
  handle: string;
  amount: string;
  currency: string;
  message: string;
  correlationId?: string | null;
};

export type PrepareTipResponse = {
  prepared: boolean;
  payoutMode: string;
  claimUrl: string;
  memo: string;
  amount: string;
  currency: string;
  message: string;
  correlationId: string;
  resolveCorrelationId?: string | null;
};

function getMppGatewayBaseUrl() {
  const explicit = import.meta.env.VITE_SUPABASE_MPP_GATEWAY_URL as string | undefined;
  if (explicit && explicit.trim()) return explicit.trim().replace(/\/$/, '');
  return `${getApiUrl()}/mpp-gateway`;
}

async function getAuthHeaders() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function postPaid<T>(path: string, body: unknown): Promise<PaidCallResult<T>> {
  const response = await fetch(`${getMppGatewayBaseUrl()}${path}`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify(body),
  });

  if (response.status === 402) {
    return {
      ok: false,
      paymentRequired: true,
      challenge: response.headers.get('WWW-Authenticate'),
      status: 402,
    };
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    return {
      ok: false,
      paymentRequired: false,
      error: text || `HTTP ${response.status}`,
      status: response.status,
    };
  }

  const data = (await response.json()) as T;
  return {
    ok: true,
    data,
    receipt: response.headers.get('Payment-Receipt'),
  };
}

export async function resolveRecipientPaid(input: ResolveRecipientRequest) {
  return postPaid<ResolveRecipientResponse>('/mpp/resolve', input);
}

export async function prepareTipPaid(input: PrepareTipRequest) {
  return postPaid<PrepareTipResponse>('/mpp/prepare-tip', input);
}

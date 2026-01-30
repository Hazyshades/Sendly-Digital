import type { ReclaimProof } from './types';

function getReclaimApiBaseUrl(): string {
  if (typeof window !== 'undefined' && window.location?.origin) return window.location.origin;
  const envUrl =
    (import.meta.env.VITE_RECLAIM_API_URL as string | undefined) ||
    (import.meta.env.VITE_ZKTLS_API_URL as string | undefined);
  if (envUrl) return envUrl;
  return 'http://localhost:3001';
}

export async function fetchReclaimProofRequestConfig(input: {
  platform: string;
  username?: string;
  paymentId?: string | number;
  recipient?: string;
  redirectUrl?: string;
}): Promise<string> {
  const baseUrl = getReclaimApiBaseUrl().replace(/\/$/, '');
  const url = new URL(`${baseUrl}/api/reclaim/config`);
  url.searchParams.set('platform', input.platform);
  if (input.username) url.searchParams.set('username', input.username);
  if (input.paymentId != null) url.searchParams.set('paymentId', String(input.paymentId));
  if (input.recipient) url.searchParams.set('recipient', input.recipient);
  if (input.redirectUrl) url.searchParams.set('redirectUrl', input.redirectUrl);

  const res = await fetch(url.toString(), { method: 'GET' });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Reclaim config failed: ${res.status} ${text}`);
  }
  const json = (await res.json()) as { reclaimProofRequestConfig?: string };
  if (!json.reclaimProofRequestConfig) {
    throw new Error('Reclaim config response is missing reclaimProofRequestConfig');
  }
  return json.reclaimProofRequestConfig;
}

export async function verifyReclaimProofs(proofs: ReclaimProof[] | any): Promise<{
  isValid: boolean;
  context: any;
}> {
  const baseUrl = getReclaimApiBaseUrl().replace(/\/$/, '');
  const res = await fetch(`${baseUrl}/api/reclaim/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ proofs }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Reclaim verify failed: ${res.status} ${text}`);
  }
  return (await res.json()) as { isValid: boolean; context: any };
}

export async function fetchZkFetchSignature(input: {
  allowedUrls: string[];
  expiresAt?: number;
}): Promise<string> {
  const baseUrl = getReclaimApiBaseUrl().replace(/\/$/, '');
  const res = await fetch(`${baseUrl}/api/reclaim/zkfetch/signature`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      allowedUrls: input.allowedUrls,
      expiresAt: input.expiresAt,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Reclaim zkFetch signature failed: ${res.status} ${text}`);
  }

  const json = (await res.json()) as { signature?: string };
  if (!json.signature) {
    throw new Error('Reclaim zkFetch signature response is missing signature');
  }
  return json.signature;
}

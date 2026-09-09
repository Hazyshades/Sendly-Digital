import type { ReclaimProof } from '@/lib/reclaim/types';

export type ProofSessionInput = {
  platform: string;
  username: string;
  recipient: string;
  paymentId?: string;
};

/** Internal seam: interactive Reclaim proofs (Gmail and leftover non-zkFetch platforms). */
export type ProofSession = {
  run(input: ProofSessionInput): Promise<ReclaimProof[]>;
};

export function normalizeProofSessionResult(proof: unknown): ReclaimProof[] {
  if (typeof proof === 'string') {
    const parsed = JSON.parse(proof) as { proofs?: ReclaimProof[]; proof?: ReclaimProof | ReclaimProof[] };
    const raw = parsed?.proofs ?? parsed?.proof ?? parsed;
    return Array.isArray(raw) ? (raw as ReclaimProof[]) : [raw as ReclaimProof];
  }
  if (Array.isArray(proof)) {
    return proof as ReclaimProof[];
  }
  return [proof as ReclaimProof];
}

export function createBrowserProofSession(): ProofSession {
  return {
    async run(input) {
      const { fetchReclaimProofRequestConfig } = await import('@/lib/reclaim/api');
      const { ReclaimProofRequest } = await import('@reclaimprotocol/js-sdk');
      const config = await fetchReclaimProofRequestConfig({
        platform: input.platform,
        username: input.username,
        recipient: input.recipient,
        paymentId: input.paymentId,
        redirectUrl: typeof window !== 'undefined' ? window.location.href : undefined,
      });
      const request = await ReclaimProofRequest.fromJsonString(config);
      await request.triggerReclaimFlow();

      return new Promise<ReclaimProof[]>((resolve, reject) => {
        void request.startSession({
          onSuccess: (proof: unknown) => {
            const proofs = normalizeProofSessionResult(proof ?? []);
            if (!proofs[0]) {
              reject(new Error('Proof was not returned'));
              return;
            }
            resolve(proofs);
          },
          onError: (error: { message?: string }) => {
            reject(new Error(error?.message || 'Proof session cancelled'));
          },
        });
      });
    },
  };
}

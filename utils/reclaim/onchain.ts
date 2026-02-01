import type { ReclaimOnchainProof, ReclaimProof } from './types';

function toUint32(n: string | number, field: string): number {
  const num = typeof n === 'string' ? Number(n) : n;
  if (!Number.isFinite(num) || num < 0) {
    throw new Error(`Invalid ${field}: ${String(n)}`);
  }
  // Solidity expects uint32; clamp-check in JS
  if (num > 0xffffffff) {
    throw new Error(`${field} overflows uint32: ${String(n)}`);
  }
  return Math.trunc(num);
}

/**
 * Converts proof from Reclaim JS SDK to struct `Reclaim.Proof` format,
 * which is expected by `contracts/ZkSend.sol` (on-chain verifier).
 */
export function toOnchainReclaimProof(proof: ReclaimProof): ReclaimOnchainProof {
  // Reclaim SDK may return data in different structures depending on version/provider
  // Check multiple possible paths (as in server.js:250)
  const claimData = proof?.claimData || proof?.claim || proof?.claimInfo || null;
  
  // If claimData is still null, try extracting from top-level proof fields
  // Some SDK versions may have fields directly on proof object
  const resolvedClaimData = claimData || {
    provider: proof?.provider,
    parameters: proof?.parameters,
    context: proof?.context,
    identifier: proof?.identifier,
    owner: proof?.owner,
    timestampS: proof?.timestampS,
    epoch: proof?.epoch,
  };

  type ClaimDataWithRequired = {
    provider?: string;
    parameters?: string;
    context?: string;
    identifier: string;
    owner: string;
    timestampS?: string | number;
    epoch?: string | number;
  };

  if (
    !resolvedClaimData ||
    !('identifier' in resolvedClaimData) ||
    !resolvedClaimData.identifier ||
    !('owner' in resolvedClaimData) ||
    !resolvedClaimData.owner
  ) {
    console.error('[toOnchainReclaimProof] Proof structure:', JSON.stringify(proof, null, 2));
    throw new Error(
      'Reclaim proof is missing claimData. Expected fields: identifier, owner, timestampS, epoch. ' +
      'Check console for full proof structure.'
    );
  }

  const claim = resolvedClaimData as ClaimDataWithRequired;

  const signatures =
    Array.isArray(proof?.signatures) && proof.signatures.length > 0
      ? proof.signatures
      : Array.isArray(proof?.signedClaim?.signatures)
        ? proof.signedClaim.signatures
        : [];

  if (signatures.length === 0) {
    throw new Error('Reclaim proof is missing signatures');
  }

  return {
    claimInfo: {
      provider: String(claim.provider || ''),
      parameters: String(claim.parameters || ''),
      context: String(claim.context || ''),
    },
    signedClaim: {
      claim: {
        identifier: String(claim.identifier) as `0x${string}`,
        owner: String(claim.owner) as `0x${string}`,
        timestampS: toUint32(claim.timestampS, 'timestampS'),
        epoch: toUint32(claim.epoch, 'epoch'),
      },
      signatures: signatures.map((s: unknown) => String(s) as `0x${string}`),
    },
  };
}


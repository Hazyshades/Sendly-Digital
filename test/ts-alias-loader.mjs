import { pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Relative-to-src keys that should be stubbed for pure unit tests. */
const STUB_BY_SRC_REL = {
  'hooks/useCircleWallet.tsx': `
    export function getCircleWalletPrivyUserIdForTx() { return undefined; }
    export default {};
  `,
  'hooks/useCircleWallet.ts': `
    export function getCircleWalletPrivyUserIdForTx() { return undefined; }
    export default {};
  `,
  'lib/supabase/client.tsx': `
    export async function apiCall() { return {}; }
    export default {};
  `,
  'lib/supabase/client.ts': `
    export async function apiCall() { return {}; }
    export default {};
  `,
  'lib/web3/web3Service.ts': `
    const web3Service = {
      initialize: async () => {},
      claimZkSendPayment: async () => '0x',
      claimZkSendPayments: async () => '0x',
      claimDirectDeposit: async () => '0x',
    };
    export default web3Service;
  `,
  'lib/circle/developerWalletService.ts': `
    export class DeveloperWalletService {
      static async executeContractCall() { return { txHash: '0x', txId: '' }; }
      static async waitForTransaction() { return { txHash: '0x', txId: '' }; }
      static async sendTransaction() { return { success: true, txHash: '0x' }; }
    }
  `,
  'lib/reclaim/api.ts': `
    export async function verifyReclaimProofs() { return { isValid: true }; }
    export async function fetchReclaimProofRequestConfig() { return '{}'; }
  `,
  'lib/reclaim/onchain.ts': `
    export function toOnchainReclaimProof(proof) { return proof; }
  `,
  'lib/zksend/zksendPaymentsAPI.ts': `
    export async function markZkSendPaymentClaimed() { return {}; }
    export async function createZkSendPaymentRecord() { return {}; }
  `,
  'lib/directsend/directSendPaymentsAPI.ts': `
    export async function markDirectDepositClaimed() { return {}; }
  `,
  'lib/runtime/zkHost.ts': `
    export function isZkLocalhost() { return false; }
    export function isZkHost() { return false; }
  `,
  'lib/web3/constants.ts': `
    export const ARC_CHAIN_ID = 5042002;
    export const ERC20ABI = [];
    export const ZkSendABI = [];
    export function getContractsForChain() {
      return { usdc: '0x1', eurc: '0x2', zksend: '0x3', directSendV2: '0x4' };
    }
  `,
  'lib/web3/wagmiConfig.ts': `
    export const arcTestnet = { id: 5042002 };
  `,
  'lib/privy/usePrivySafe.ts': `
    export function usePrivySafe() { return { authenticated: false, getAccessToken: async () => null, user: null }; }
  `,
};

function toSrcRel(absPath) {
  const normalized = absPath.replace(/\\/g, '/');
  const rootNorm = root.replace(/\\/g, '/');
  if (!normalized.startsWith(rootNorm + '/src/')) return null;
  return normalized.slice((rootNorm + '/src/').length);
}

function resolveWithTs(specifier, parentURL) {
  if (specifier.startsWith('@/')) {
    const abs = path.join(root, 'src', specifier.slice(2));
    return tryResolve(abs);
  }
  if (specifier.startsWith('.') && parentURL) {
    const parentPath = fileURLToPath(parentURL);
    const abs = path.resolve(path.dirname(parentPath), specifier);
    return tryResolve(abs);
  }
  return null;
}

function tryResolve(absNoExt) {
  const candidates = [
    absNoExt,
    absNoExt + '.ts',
    absNoExt + '.tsx',
    absNoExt + '.js',
    absNoExt + '.mjs',
    path.join(absNoExt, 'index.ts'),
    path.join(absNoExt, 'index.tsx'),
    path.join(absNoExt, 'index.js'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c) && fs.statSync(c).isFile()) {
      return pathToFileURL(c).href;
    }
  }
  return null;
}

export async function resolve(specifier, context, nextResolve) {
  const resolved = resolveWithTs(specifier, context.parentURL);
  if (resolved) {
    return { shortCircuit: true, url: resolved };
  }
  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  if (!url.startsWith('file:')) {
    return nextLoad(url, context);
  }
  const filePath = fileURLToPath(url);
  const rel = toSrcRel(filePath);
  if (rel && STUB_BY_SRC_REL[rel]) {
    return {
      shortCircuit: true,
      format: 'module',
      source: STUB_BY_SRC_REL[rel],
    };
  }

  if (filePath.endsWith('.ts') || filePath.endsWith('.tsx') || filePath.endsWith('.mts')) {
    const source = fs.readFileSync(filePath, 'utf8');
    // Node 22+: strip TypeScript via the built-in transform when available.
    try {
      const { stripTypeScriptTypes } = await import('node:module');
      if (typeof stripTypeScriptTypes === 'function') {
        return {
          shortCircuit: true,
          format: 'module',
          source: stripTypeScriptTypes(source, { mode: 'strip' }),
        };
      }
    } catch {
      // fall through
    }
    return {
      shortCircuit: true,
      format: 'module',
      source,
    };
  }

  return nextLoad(url, context);
}

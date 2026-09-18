/**
 * Circle developer-controlled wallet blockchain identifiers for Arc.
 * Mainnet code `ARC` is documented on Circle Wallets supported-blockchains.
 * Enable mainnet Internal Wallet via VITE_CIRCLE_ARC_MAINNET_ENABLED after staging smoke.
 */

import {
  ARC_MAINNET_CHAIN_ID,
  ARC_TESTNET_CHAIN_ID,
  getChain,
} from '@/lib/web3/chains';

export const CIRCLE_BLOCKCHAIN_ARC_TESTNET = 'ARC-TESTNET';

/** Circle mainnet code — override with VITE_CIRCLE_ARC_MAINNET_BLOCKCHAIN if Circle renames. */
export const CIRCLE_BLOCKCHAIN_ARC_MAINNET =
  (import.meta.env.VITE_CIRCLE_ARC_MAINNET_BLOCKCHAIN as string | undefined)?.trim() ||
  'ARC';

/**
 * Whether Internal Wallet / DCW may target Arc Mainnet.
 * Requires chain capability (supportsInternalWallet) and explicit env opt-in.
 */
export function isCircleArcMainnetEnabled(): boolean {
  const flag = (import.meta.env.VITE_CIRCLE_ARC_MAINNET_ENABLED || '').toLowerCase().trim();
  return flag === '1' || flag === 'true' || flag === 'yes';
}

/** Map wagmi/app chain id → Circle blockchain string, or null if unsupported. */
export function circleBlockchainForChainId(chainId: number): string | null {
  if (chainId === ARC_TESTNET_CHAIN_ID) return CIRCLE_BLOCKCHAIN_ARC_TESTNET;
  if (chainId === ARC_MAINNET_CHAIN_ID) {
    if (!isCircleArcMainnetEnabled()) return null;
    return CIRCLE_BLOCKCHAIN_ARC_MAINNET;
  }
  return null;
}

/** Default Circle blockchain for “Arc” product flows (respects default Arc chain + gating). */
export function defaultCircleArcBlockchain(): string {
  const defaultArc = Number(
    import.meta.env.VITE_ARC_DEFAULT_CHAIN_ID ||
      import.meta.env.VITE_ARC_CHAIN_ID ||
      ARC_TESTNET_CHAIN_ID
  );
  const mapped = circleBlockchainForChainId(defaultArc);
  if (mapped) return mapped;
  return CIRCLE_BLOCKCHAIN_ARC_TESTNET;
}

/**
 * Internal Wallet allowed for this app chain.
 * Arc Mainnet: registry capability must be on AND VITE_CIRCLE_ARC_MAINNET_ENABLED.
 */
export function supportsInternalWalletForChain(chainId: number): boolean {
  const entry = getChain(chainId);
  if (!entry.capabilities.supportsInternalWallet) return false;
  if (chainId === ARC_MAINNET_CHAIN_ID) return isCircleArcMainnetEnabled();
  return true;
}

export function isCircleTestnetBlockchain(blockchain: string): boolean {
  return blockchain === CIRCLE_BLOCKCHAIN_ARC_TESTNET || blockchain.endsWith('-TESTNET') || blockchain.includes('SEPOLIA') || blockchain.includes('DEVNET') || blockchain.includes('FUJI') || blockchain.includes('AMOY');
}

export function isCircleArcBlockchain(blockchain: string): boolean {
  return blockchain === CIRCLE_BLOCKCHAIN_ARC_TESTNET || blockchain === CIRCLE_BLOCKCHAIN_ARC_MAINNET || blockchain === 'ARC';
}

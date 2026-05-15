import { getChainByChainId } from '@/lib/bridge/bridgeConfig';
import { arcTestnet, baseSepolia } from '@/lib/web3/wagmiConfig';

/** Public HTTPS RPC endpoints for simulator/read paths (Internal Wallet EIP-1193 relay). Expand as needed. */
const PUBLIC_RPC_FALLBACK: Record<number, string> = {
  11155111: 'https://ethereum-sepolia.publicnode.com',
  11155420: 'https://sepolia.optimism.io',
  421614: 'https://sepolia-rollup.arbitrum.io/rpc',
  80002: 'https://rpc-amoy.polygon.technology',
  43113: 'https://api.avax-test.network/ext/bc/C/rpc',
  1244: 'https://sepolia.unichain.world',
};

/**
 * Public HTTP RPC for relaying read-only JSON-RPC calls from Internal Wallet EIP-1193 shim.
 */
export function getBridgeHttpRpc(chainId: number): string {
  const configured = getChainByChainId(chainId)?.rpcUrl?.trim();
  if (configured) {
    return configured;
  }

  const fb = PUBLIC_RPC_FALLBACK[chainId];
  if (fb) {
    return fb;
  }

  const arcId = arcTestnet.id;
  const baseSepoliaId = baseSepolia.id;
  if (chainId === arcId) {
    return arcTestnet.rpcUrls.default.http[0];
  }
  if (chainId === baseSepoliaId) {
    return baseSepolia.rpcUrls.default.http[0];
  }

  throw new Error(`No configured HTTP RPC for chain ${chainId}. Extend bridgeRpc.ts or chainRegistry.rpcUrl.`);
}

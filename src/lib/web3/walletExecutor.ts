import { createPublicClient, http, type Abi } from 'viem';

import {
  DeveloperWalletService,
  type ExecuteContractCallParams,
} from '@/lib/circle/developerWalletService';
import type { WalletSource } from '@/hooks/useWalletSourcePreference';
import { ARC_CHAIN_ID, getChain } from '@/lib/web3/chains';

export type WalletReadCall = {
  address: `0x${string}`;
  abi: Abi;
  functionName: string;
  args?: readonly unknown[];
};

export type WalletWriteCall = {
  contractAddress: string;
  abiFunctionSignature: string;
  abiParameters: unknown[];
  ensureAllowance?: ExecuteContractCallParams['ensureAllowance'];
};

export interface WalletExecutor {
  kind: WalletSource;
  address: string;
  read<T>(call: WalletReadCall): Promise<T>;
  write(call: WalletWriteCall): Promise<{ txHash: string }>;
}

type DeveloperWalletLike = {
  wallet_address: string;
  circle_wallet_id: string;
};

type InternalAttribution = ExecuteContractCallParams['attribution'];

function createPublicClientForChain(chainId: number) {
  const entry = getChain(chainId);
  const rpcUrl = entry.rpcUrls[0];
  return createPublicClient({
    chain: entry.viemChain,
    transport: http(rpcUrl),
  });
}

async function readViaPublicClient<T>(
  chainId: number,
  call: WalletReadCall,
): Promise<T> {
  const publicClient = createPublicClientForChain(chainId);
  return (await publicClient.readContract({
    address: call.address,
    abi: call.abi,
    functionName: call.functionName as never,
    args: (call.args ?? []) as never,
  })) as T;
}

/**
 * Browser / external wallet adapter.
 * Reads use ChainRegistry RPC (no web3Service). Writes for this wave stay on
 * web3Service at callsites — do not route them here yet.
 */
export function createBrowserWalletExecutor(params: {
  address: string;
  chainId?: number;
}): WalletExecutor {
  const address = params.address;
  const chainId = params.chainId ?? ARC_CHAIN_ID;

  return {
    kind: 'external',
    address,
    read: <T>(call: WalletReadCall) => readViaPublicClient<T>(chainId, call),
    write: async () => {
      throw new Error(
        'External wallet writes are routed through web3Service in this wave; WalletExecutor.write is for internal wallets',
      );
    },
  };
}

/**
 * Circle / internal (developer) wallet adapter.
 * Reads use the same public client; writes go through executeContractCall.
 */
export function createInternalWalletExecutor(params: {
  wallet: DeveloperWalletLike;
  attribution?: InternalAttribution;
  chainId?: number;
  blockchain?: string;
}): WalletExecutor {
  const { wallet, attribution } = params;
  const chainId = params.chainId ?? ARC_CHAIN_ID;
  const blockchain = params.blockchain ?? 'ARC-TESTNET';

  return {
    kind: 'circle',
    address: wallet.wallet_address,
    read: <T>(call: WalletReadCall) => readViaPublicClient<T>(chainId, call),
    write: async (call: WalletWriteCall) => {
      const result = await DeveloperWalletService.executeContractCall({
        walletId: wallet.circle_wallet_id,
        walletAddress: wallet.wallet_address,
        contractAddress: call.contractAddress,
        abiFunctionSignature: call.abiFunctionSignature,
        abiParameters: call.abiParameters,
        ensureAllowance: call.ensureAllowance,
        blockchain,
        attribution,
      });
      return { txHash: result.txHash };
    },
  };
}

// Utility to get contract balance via block explorer API or RPC
import { createPublicClient, http } from 'viem';
import { chains } from './wagmiConfig';
import { getContractsForChain, ERC20ABI } from './constants';

const ARC_CHAIN_ID = Number(import.meta.env.VITE_ARC_CHAIN_ID || 5042002);
const BASE_SEPOLIA_CHAIN_ID = Number(import.meta.env.VITE_BASE_CHAIN_ID || 84532);

function isEtherscanLikeChain(chainId: number): boolean {
  return chainId === BASE_SEPOLIA_CHAIN_ID;
}

/**
 * Get contract balance in USDC using block explorer API (ArcScan, SnowTrace, or BaseScan)
 */
export async function getContractBalanceViaAPI(
  contractAddress: string,
  tokenAddress: string,
  chainId: number = ARC_CHAIN_ID
): Promise<number> {
  const contracts = getContractsForChain(chainId);
  try {
    if (isEtherscanLikeChain(chainId)) {
      // SnowTrace / BaseScan (Etherscan-compatible) API: tokenbalance
      const params = new URLSearchParams({
        module: 'account',
        action: 'tokenbalance',
        contractaddress: tokenAddress,
        address: contractAddress,
        tag: 'latest',
      });
      const response = await fetch(`${contracts.explorerApiUrl}?${params}`);
      if (!response.ok) throw new Error(`Explorer API error: ${response.status}`);
      const data = await response.json();
      if (data.result && data.status === '1') {
        const balanceWei = BigInt(data.result);
        return Number(balanceWei) / 1_000_000;
      }
      return await getContractBalanceViaRPC(contractAddress, tokenAddress, chainId);
    }
    // ArcScan (Blockscout-based)
    const response = await fetch(
      `${contracts.explorerApiUrl}/addresses/${contractAddress.toLowerCase()}/token-balances`,
      { method: 'GET', headers: { 'Content-Type': 'application/json' } }
    );
    if (!response.ok) throw new Error(`ArcScan API error: ${response.status} ${response.statusText}`);
    const data = await response.json();
    if (data.items && Array.isArray(data.items)) {
      const usdcBalance = data.items.find(
        (item: any) =>
          item.token?.address?.toLowerCase() === tokenAddress.toLowerCase() ||
          item.token?.symbol === 'USDC'
      );
      if (usdcBalance) {
        const balanceWei = BigInt(usdcBalance.value || usdcBalance.balance || '0');
        return Number(balanceWei) / 1_000_000;
      }
    }
    return await getContractBalanceViaRPC(contractAddress, tokenAddress, chainId);
  } catch (error) {
    return await getContractBalanceViaRPC(contractAddress, tokenAddress, chainId);
  }
}

/**
 * Get contract balance in USDC using RPC call
 */
export async function getContractBalanceViaRPC(
  contractAddress: string,
  tokenAddress: string,
  chainId: number = ARC_CHAIN_ID
): Promise<number> {
  const contracts = getContractsForChain(chainId);
  const chain = chains.find((c) => c.id === chainId) ?? chains[0];
  const rpcUrl = contracts.rpcUrls[0];
  const publicClient = createPublicClient({
    chain,
    transport: http(rpcUrl),
  });
  const balance = (await publicClient.readContract({
    address: tokenAddress as `0x${string}`,
    abi: ERC20ABI,
    functionName: 'balanceOf',
    args: [contractAddress as `0x${string}`],
  })) as bigint;
  return Number(balance) / 1_000_000;
}

/**
 * Get contract balance (tries API first, then RPC as fallback)
 */
export async function getContractBalance(
  contractAddress?: string,
  tokenAddress?: string,
  chainId: number = ARC_CHAIN_ID
): Promise<number> {
  const contracts = getContractsForChain(chainId);
  const addr = contractAddress ?? contracts.zksend;
  const token = tokenAddress ?? contracts.usdc;
  return await getContractBalanceViaAPI(addr, token, chainId);
}

/**
 * Get contract counters via block explorer API (ArcScan only; SnowTrace may not support)
 */
export async function getContractCounters(
  contractAddress: string,
  chainId: number = ARC_CHAIN_ID
): Promise<{
  transactions_count: number;
  token_transfers_count: number;
  gas_usage_count: string;
}> {
  const contracts = getContractsForChain(chainId);
  if (chainId === BASE_SEPOLIA_CHAIN_ID) {
    return {
      transactions_count: 0,
      token_transfers_count: 0,
      gas_usage_count: '0',
    };
  }
  const response = await fetch(
    `${contracts.explorerApiUrl}/addresses/${contractAddress.toLowerCase()}/counters`,
    { method: 'GET', headers: { 'Content-Type': 'application/json' } }
  );
  if (!response.ok) throw new Error(`ArcScan API error: ${response.status} ${response.statusText}`);
  const data = await response.json();
  return {
    transactions_count: data.transactions_count ? parseInt(data.transactions_count, 10) : 0,
    token_transfers_count: data.token_transfers_count ? parseInt(data.token_transfers_count, 10) : 0,
    gas_usage_count: data.gas_usage_count || '0',
  };
}

/**
 * Get contract transactions count via block explorer API
 */
export async function getContractTransactionsCount(
  contractAddress: string,
  chainId: number = ARC_CHAIN_ID
): Promise<number> {
  try {
    const counters = await getContractCounters(contractAddress, chainId);
    return counters.transactions_count;
  } catch (error) {
    if (chainId === BASE_SEPOLIA_CHAIN_ID) return 0;
    const contracts = getContractsForChain(chainId);
    const response = await fetch(
      `${contracts.explorerApiUrl}/addresses/${contractAddress.toLowerCase()}`,
      { method: 'GET', headers: { 'Content-Type': 'application/json' } }
    );
    if (response.ok) {
      const data = await response.json();
      if (data.transactions_count !== undefined) return parseInt(data.transactions_count, 10);
    }
    throw new Error(`Failed to get contract transactions count: ${error instanceof Error ? error.message : 'Unknown'}`);
  }
}

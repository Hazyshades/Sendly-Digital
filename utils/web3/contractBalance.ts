// Utility to get contract balance via ArcScan API or RPC
import { createPublicClient, http } from 'viem';
import { arcTestnet } from './wagmiConfig';
import { CONTRACT_ADDRESS, USDC_ADDRESS, ERC20ABI, ARC_RPC_URLS } from './constants';

const ARCSCAN_API_URL = 'https://testnet.arcscan.app/api/v2';

/**
 * Get contract balance in USDC using ArcScan API
 * @param contractAddress - Contract address to check balance for
 * @param tokenAddress - Token address (USDC by default)
 * @returns Balance in USDC (already divided by decimals)
 */
export async function getContractBalanceViaAPI(
  contractAddress: string = CONTRACT_ADDRESS,
  tokenAddress: string = USDC_ADDRESS
): Promise<number> {
  try {
    // Try ArcScan API first (Blockscout-based)
    // Get token balances for the contract address
    const balancesUrl = `${ARCSCAN_API_URL}/addresses/${contractAddress.toLowerCase()}/token-balances`;
    
    console.log(`[ContractBalance] Fetching balance from ArcScan API: ${balancesUrl}`);
    
    const response = await fetch(balancesUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`ArcScan API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // Find USDC token in the balances
    if (data.items && Array.isArray(data.items)) {
      const usdcBalance = data.items.find((item: any) => 
        item.token?.address?.toLowerCase() === tokenAddress.toLowerCase() ||
        item.token?.symbol === 'USDC'
      );

      if (usdcBalance) {
        // Balance is returned in smallest units (6 decimals for USDC)
        const balanceWei = BigInt(usdcBalance.value || usdcBalance.balance || '0');
        const balanceUsd = Number(balanceWei) / 1_000_000; // USDC has 6 decimals
        console.log(`[ContractBalance] Found USDC balance via API: ${balanceUsd} USDC`);
        return balanceUsd;
      }
    }

    // If not found in API, try RPC as fallback
    console.log('[ContractBalance] USDC not found in API response, trying RPC...');
    return await getContractBalanceViaRPC(contractAddress, tokenAddress);
  } catch (error) {
    console.error('[ContractBalance] API fetch failed, trying RPC fallback:', error);
    // Fallback to RPC
    return await getContractBalanceViaRPC(contractAddress, tokenAddress);
  }
}

/**
 * Get contract balance in USDC using RPC call
 * @param contractAddress - Contract address to check balance for
 * @param tokenAddress - Token address (USDC by default)
 * @returns Balance in USDC (already divided by decimals)
 */
export async function getContractBalanceViaRPC(
  contractAddress: string = CONTRACT_ADDRESS,
  tokenAddress: string = USDC_ADDRESS
): Promise<number> {
  try {
    const publicClient = createPublicClient({
      chain: arcTestnet,
      transport: http(ARC_RPC_URLS[0] || 'https://rpc.testnet.arc.network'),
    });

    console.log(`[ContractBalance] Fetching balance via RPC for contract: ${contractAddress}, token: ${tokenAddress}`);

    // Get balance using ERC20 balanceOf
    const balance = await publicClient.readContract({
      address: tokenAddress as `0x${string}`,
      abi: ERC20ABI,
      functionName: 'balanceOf',
      args: [contractAddress as `0x${string}`],
    }) as bigint;

    // USDC has 6 decimals
    const balanceUsd = Number(balance) / 1_000_000;
    
    console.log(`[ContractBalance] Found USDC balance via RPC: ${balanceUsd} USDC`);
    return balanceUsd;
  } catch (error) {
    console.error('[ContractBalance] RPC fetch failed:', error);
    throw new Error(`Failed to get contract balance: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get contract balance (tries API first, then RPC as fallback)
 * @param contractAddress - Contract address to check balance for (optional, defaults to CONTRACT_ADDRESS)
 * @param tokenAddress - Token address (optional, defaults to USDC_ADDRESS)
 * @returns Balance in USDC
 */
export async function getContractBalance(
  contractAddress?: string,
  tokenAddress?: string
): Promise<number> {
  return await getContractBalanceViaAPI(contractAddress, tokenAddress);
}

/**
 * Get contract counters (transactions_count, token_transfers_count, gas_usage_count) via ArcScan API
 * @param contractAddress - Contract address to check counters for (optional, defaults to CONTRACT_ADDRESS)
 * @returns Object with transactions_count, token_transfers_count, and gas_usage_count
 */
export async function getContractCounters(
  contractAddress: string = CONTRACT_ADDRESS
): Promise<{
  transactions_count: number;
  token_transfers_count: number;
  gas_usage_count: string;
}> {
  try {
    // Use the /counters endpoint from ArcScan API (Blockscout-based)
    const countersUrl = `${ARCSCAN_API_URL}/addresses/${contractAddress.toLowerCase()}/counters`;
    
    console.log(`[ContractBalance] Fetching counters from ArcScan API: ${countersUrl}`);
    
    const response = await fetch(countersUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`ArcScan API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // Parse the response
    const transactions_count = data.transactions_count ? parseInt(data.transactions_count, 10) : 0;
    const token_transfers_count = data.token_transfers_count ? parseInt(data.token_transfers_count, 10) : 0;
    const gas_usage_count = data.gas_usage_count || '0';

    console.log(`[ContractBalance] Found counters via API:`, {
      transactions_count,
      token_transfers_count,
      gas_usage_count
    });

    return {
      transactions_count,
      token_transfers_count,
      gas_usage_count
    };
  } catch (error) {
    console.error('[ContractBalance] Failed to get contract counters:', error);
    throw new Error(`Failed to get contract counters: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get contract transactions count via ArcScan API
 * @param contractAddress - Contract address to check transactions for (optional, defaults to CONTRACT_ADDRESS)
 * @returns Number of transactions
 */
export async function getContractTransactionsCount(
  contractAddress: string = CONTRACT_ADDRESS
): Promise<number> {
  try {
    const counters = await getContractCounters(contractAddress);
    return counters.transactions_count;
  } catch (error) {
    console.error('[ContractBalance] Failed to get transactions count:', error);
    // Fallback to old method if new endpoint fails
    try {
      const addressUrl = `${ARCSCAN_API_URL}/addresses/${contractAddress.toLowerCase()}`;
      const response = await fetch(addressUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.transactions_count !== undefined) {
          const count = parseInt(data.transactions_count, 10);
          console.log(`[ContractBalance] Found transactions count via address endpoint: ${count}`);
          return count;
        }
      }
    } catch (fallbackError) {
      console.error('[ContractBalance] Fallback method also failed:', fallbackError);
    }
    
    throw new Error(`Failed to get contract transactions count: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}


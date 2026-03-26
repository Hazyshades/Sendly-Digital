/**
 * ZNS (ZNS Connect Name Service) utilities
 * Documentation: https://docs.znsconnect.io/developer-guide/zns-api
 */

const ZNS_API_BASE_URL = 'https://zns.bio/api';

export interface ZNSResolveAddressResponse {
  code: number;
  primaryDomain?: string;
  userOwnedDomains?: string[];
}

export interface ZNSResolveDomainResponse {
  code: number;
  address?: string;
}

/**
 * Resolve ZNS domain for a given address
 * @param address - Ethereum address to resolve
 * @param chainId - Chain ID (default: 5042002 for ARC Testnet)
 * @returns Primary ZNS domain or null if not found
 */
export async function resolveZNSDomain(
  address: string,
  chainId: number = 5042002 // ARC Testnet
): Promise<string | null> {
  try {
    if (!address || !address.startsWith('0x')) {
      return null;
    }

    const url = `${ZNS_API_BASE_URL}/resolveAddress?chain=${chainId}&address=${address}`;
    const response = await fetch(url);

    if (!response.ok) {
      console.warn(`ZNS API error for address ${address}: ${response.status}`);
      return null;
    }

    const data: ZNSResolveAddressResponse = await response.json();

    if (data.code === 200 && data.primaryDomain && data.primaryDomain.trim()) {
      return data.primaryDomain.trim();
    }

    return null;
  } catch (error) {
    console.error(`Failed to resolve ZNS domain for ${address}:`, error);
    return null;
  }
}

/**
 * Resolve multiple ZNS domains for multiple addresses
 * Uses batching to avoid overwhelming the API
 * @param addresses - Array of addresses to resolve
 * @param chainId - Chain ID (default: 5042002 for ARC Testnet)
 * @param batchSize - Number of requests to process in parallel (default: 5)
 * @param delayBetweenBatches - Delay in ms between batches (default: 200)
 * @returns Map of address -> ZNS domain
 */
export async function resolveZNSDomainsBatch(
  addresses: string[],
  chainId: number = 5042002, // ARC Testnet
  batchSize: number = 5,
  delayBetweenBatches: number = 200
): Promise<Map<string, string | null>> {
  const results = new Map<string, string | null>();

  // Filter valid addresses
  const validAddresses = addresses.filter(
    (addr) => addr && addr.startsWith('0x')
  );

  if (validAddresses.length === 0) {
    return results;
  }

  // Process in batches
  for (let i = 0; i < validAddresses.length; i += batchSize) {
    const batch = validAddresses.slice(i, i + batchSize);
    
    const batchPromises = batch.map(async (address) => {
      const domain = await resolveZNSDomain(address, chainId);
      return { address, domain };
    });

    const batchResults = await Promise.all(batchPromises);
    
    for (const { address, domain } of batchResults) {
      results.set(address.toLowerCase(), domain);
    }

    // Delay between batches to avoid rate limiting
    if (i + batchSize < validAddresses.length) {
      await new Promise((resolve) => setTimeout(resolve, delayBetweenBatches));
    }
  }

  return results;
}

/**
 * Try to resolve ZNS domain across multiple chains
 * @param address - Ethereum address to resolve
 * @param chainIds - Array of chain IDs to try (default: [5042002] for ARC Testnet)
 * @returns Primary ZNS domain or null if not found on any chain
 */
export async function resolveZNSDomainMultiChain(
  address: string,
  chainIds: number[] = [5042002] // ARC Testnet only
): Promise<string | null> {
  for (const chainId of chainIds) {
    const domain = await resolveZNSDomain(address, chainId);
    if (domain) {
      return domain;
    }
  }
  return null;
}


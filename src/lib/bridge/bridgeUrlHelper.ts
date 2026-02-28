import { getChainBySlug, getTokenAddress } from './bridgeConfig';
import type { BridgeUrlParams } from '@/types/bridge';

export type { BridgeUrlParams };

/**
 * Generates URL for bridge page
 * @param params Bridge parameters
 * @returns URL string in format /bridge?params
 */
export function generateBridgeUrl(params: BridgeUrlParams): string {
  const { toChainSlug, fromChainId, tokenSymbol, amount } = params;
  
  // Check that target chain exists
  const toChain = getChainBySlug(toChainSlug);
  if (!toChain) {
    throw new Error(`Chain "${toChainSlug}" not found`);
  }

  // If tokenSymbol is specified, get token addresses
  let fromCurrency = params.fromCurrency;
  let toCurrency = params.toCurrency;
  
  if (tokenSymbol && fromChainId) {
    const fromTokenAddr = getTokenAddress(tokenSymbol, fromChainId);
    const toTokenAddr = getTokenAddress(tokenSymbol, toChain.chainId);
    
    if (fromTokenAddr && toTokenAddr) {
      fromCurrency = fromTokenAddr;
      toCurrency = toTokenAddr;
    }
  }

  // Build URL
  let url = `/bridge`;
  const queryParams: string[] = [];

  // Add toChainSlug as query parameter
  queryParams.push(`toChainSlug=${encodeURIComponent(toChainSlug)}`);

  if (fromChainId) {
    queryParams.push(`fromChainId=${fromChainId}`);
  }

  if (fromCurrency) {
    queryParams.push(`fromCurrency=${encodeURIComponent(fromCurrency)}`);
  }

  if (toCurrency) {
    queryParams.push(`toCurrency=${encodeURIComponent(toCurrency)}`);
  }

  if (amount) {
    queryParams.push(`amount=${encodeURIComponent(amount)}`);
  }

  if (queryParams.length > 0) {
    url += '?' + queryParams.join('&');
  }

  return url;
}

/**
 * Generates URL for bridge from Arc Testnet to specified chain
 * @param toChainSlug Target chain slug (e.g., 'base-sepolia')
 * @param tokenSymbol Token symbol ('USDC' or 'EURC')
 * @param amount Amount (optional)
 * @returns URL string
 */
export function generateBridgeUrlFromArc(
  toChainSlug: string,
  tokenSymbol: 'USDC' | 'EURC' | 'USYC' = 'USDC',
  amount?: string
): string {
  return generateBridgeUrl({
    toChainSlug,
    fromChainId: 5042002, // Arc Testnet
    tokenSymbol,
    amount
  });
}

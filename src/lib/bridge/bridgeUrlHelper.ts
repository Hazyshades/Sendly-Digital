import { getChainBySlug, getTokenAddress } from './bridgeConfig';
import type { BridgeUrlParams } from '@/types/bridge';

export type { BridgeUrlParams };

export function generateBridgeUrl(params: BridgeUrlParams): string {
  const { toChainSlug, fromChainId, tokenSymbol, amount } = params;
  const toChain = getChainBySlug(toChainSlug);
  if (!toChain) throw new Error(`Chain "${toChainSlug}" not found`);

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

  const sp = new URLSearchParams();
  sp.set('toChainSlug', toChainSlug);
  if (fromChainId) sp.set('fromChainId', String(fromChainId));
  if (fromCurrency) sp.set('fromCurrency', fromCurrency);
  if (toCurrency) sp.set('toCurrency', toCurrency);
  if (amount) sp.set('amount', amount);
  const q = sp.toString();
  return `/bridge${q ? `?${q}` : ''}`;
}

export function generateBridgeUrlFromArc(
  toChainSlug: string,
  tokenSymbol: 'USDC' | 'EURC' | 'USYC' = 'USDC',
  amount?: string
): string {
  return generateBridgeUrl({ toChainSlug, fromChainId: 5042002, tokenSymbol, amount });
}

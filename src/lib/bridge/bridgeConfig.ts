import { SUPPORTED_CHAINS, getChainByChainId } from './chainRegistry';
import { TOKENS, getTokenAddress, isTokenSupported, getSupportedTokensForChain, getTokenByAddress } from './tokenRegistry';
import type { ChainConfig } from './chainRegistry';
import type { TokenConfig } from './tokenRegistry';
import type { BridgeRouteValidation } from '@/types/bridge';

export { SUPPORTED_CHAINS, getChainByChainId, getChainBySlug, getChainByBridgeKitId } from './chainRegistry';
export type { ChainConfig } from './chainRegistry';
export { TOKENS, getTokenAddress, isTokenSupported, getSupportedTokensForChain, getTokenByAddress } from './tokenRegistry';
export type { TokenConfig } from './tokenRegistry';
export type { BridgeRouteValidation };

export function validateBridgeRoute(
  fromChainId: number,
  toChainId: number,
  tokenSymbol: string
): BridgeRouteValidation {
  if (fromChainId === toChainId) {
    return {
      isValid: false,
      error: 'Source and target chains cannot be the same'
    };
  }

  const fromChain = getChainByChainId(fromChainId);
  if (!fromChain) {
    return {
      isValid: false,
      error: `Source chain with chainId ${fromChainId} is not supported`
    };
  }

  const toChain = getChainByChainId(toChainId);
  if (!toChain) {
    return {
      isValid: false,
      error: `Target chain with chainId ${toChainId} is not supported`
    };
  }

  const token = TOKENS[tokenSymbol.toUpperCase()];
  if (!token) {
    return {
      isValid: false,
      error: `Token ${tokenSymbol} is not supported`
    };
  }

  if (!isTokenSupported(tokenSymbol, fromChainId)) {
    return {
      isValid: false,
      error: `Token ${tokenSymbol} is not supported in source chain ${fromChain.name}`
    };
  }

  if (!isTokenSupported(tokenSymbol, toChainId)) {
    return {
      isValid: false,
      error: `Token ${tokenSymbol} is not supported in target chain ${toChain.name}`
    };
  }

  const fromTokenAddress = getTokenAddress(tokenSymbol, fromChainId);
  const toTokenAddress = getTokenAddress(tokenSymbol, toChainId);

  if (!fromTokenAddress) {
    return {
      isValid: false,
      error: `Token address for ${tokenSymbol} not found for source chain ${fromChain.name}`
    };
  }

  if (!toTokenAddress) {
    return {
      isValid: false,
      error: `Token address for ${tokenSymbol} not found for target chain ${toChain.name}`
    };
  }

  return {
    isValid: true,
    fromChain,
    toChain,
    token
  };
}

export function validateBridgeRouteByAddresses(
  fromChainId: number,
  toChainId: number,
  fromCurrency: string,
  toCurrency: string
): BridgeRouteValidation {
  if (fromChainId === toChainId) {
    return {
      isValid: false,
      error: 'Source and target chains cannot be the same'
    };
  }

  const fromChain = getChainByChainId(fromChainId);
  if (!fromChain) {
    return {
      isValid: false,
      error: `Source chain with chainId ${fromChainId} is not supported`
    };
  }

  const toChain = getChainByChainId(toChainId);
  if (!toChain) {
    return {
      isValid: false,
      error: `Target chain with chainId ${toChainId} is not supported`
    };
  }

  if (fromCurrency === '0x0000000000000000000000000000000000000000' || 
      fromCurrency === 'native') {
    return {
      isValid: false,
      error: 'Native currency bridge is not supported yet'
    };
  }

  const fromToken = getTokenByAddress(fromCurrency, fromChainId);
  if (!fromToken) {
    return {
      isValid: false,
      error: `Token with address ${fromCurrency} not found in source chain ${fromChain.name}`
    };
  }

  const toToken = getTokenByAddress(toCurrency, toChainId);
  if (!toToken) {
    return {
      isValid: false,
      error: `Token with address ${toCurrency} not found in target chain ${toChain.name}`
    };
  }

  if (fromToken.symbol !== toToken.symbol) {
    return {
      isValid: false,
      error: `Tokens do not match: ${fromToken.symbol} ≠ ${toToken.symbol}`
    };
  }

  if (!isTokenSupported(fromToken.symbol, fromChainId)) {
    return {
      isValid: false,
      error: `Token ${fromToken.symbol} is not supported in source chain ${fromChain.name}`
    };
  }

  if (!isTokenSupported(toToken.symbol, toChainId)) {
    return {
      isValid: false,
      error: `Token ${toToken.symbol} is not supported in target chain ${toChain.name}`
    };
  }

  return {
    isValid: true,
    fromChain,
    toChain,
    token: fromToken
  };
}

export function getSupportedChainsForToken(tokenSymbol: string): ChainConfig[] {
  const token = TOKENS[tokenSymbol.toUpperCase()];
  if (!token) {
    return [];
  }
  return SUPPORTED_CHAINS.filter(chain => 
    token.supportedChainIds.includes(chain.chainId)
  );
}

export function getSupportedTokensForChainByChainId(chainId: number): TokenConfig[] {
  return getSupportedTokensForChain(chainId);
}

export function isChainCompatible(fromChainId: number, toChainId: number): boolean {
  const fromChain = getChainByChainId(fromChainId);
  const toChain = getChainByChainId(toChainId);
  
  if (!fromChain || !toChain) {
    return false;
  }

  return true;
}

import type { ChainConfig } from '@/lib/bridge/chainRegistry';
import type { TokenConfig } from '@/lib/bridge/tokenRegistry';
import type { DeveloperWallet } from '@/lib/circle/developerWalletService';

export type { ChainConfig, TokenConfig };

export interface BridgeRouteValidation {
  isValid: boolean;
  error?: string;
  fromChain?: ChainConfig;
  toChain?: ChainConfig;
  token?: TokenConfig;
}

export type BridgeResult = {
  statusUrl?: string;
  fromTxHash?: string;
  toTxHash?: string;
  error?: string;
};

/** When set, `/wallets/send-transaction` is used instead of `window.ethereum`. */
export interface DeveloperWalletBridgeSigner {
  wallet: DeveloperWallet;
  privyUserId?: string;
  socialPlatform?: string;
  socialUserId?: string;
}

export interface BridgeParams {
  fromChainId: number;
  toChainId: number;
  fromCurrency: string;
  toCurrency: string;
  amount: string;
  recipient?: string;
  developerWalletSigner?: DeveloperWalletBridgeSigner;
}

export interface BridgeUrlParams {
  toChainSlug: string;
  fromChainId?: number;
  toChainId?: number;
  fromCurrency?: string;
  toCurrency?: string;
  tokenSymbol?: 'USDC' | 'EURC' | 'USYC';
  amount?: string;
}


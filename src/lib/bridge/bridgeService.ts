import { BridgeKit } from '@circle-fin/bridge-kit';
import { createAdapterFromProvider } from '@circle-fin/adapter-viem-v2';
import { 
  validateBridgeRouteByAddresses,
  validateBridgeRoute,
  type BridgeRouteValidation
} from './bridgeConfig';

import type { BridgeResult, BridgeParams } from '@/types/bridge';

export type { BridgeResult, BridgeParams };

export class BridgeError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'BridgeError';
  }
}

class BridgeService {
  async bridgeArcToBase(amount: string): Promise<BridgeResult> {
    return this.bridge({
      fromChainId: 5042002,
      toChainId: 84532,
      fromCurrency: '0x3600000000000000000000000000000000000000',
      toCurrency: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
      amount
    });
  }

  async bridge({
    fromChainId,
    toChainId,
    fromCurrency,
    toCurrency,
    amount,
    recipient
  }: BridgeParams): Promise<BridgeResult> {
    if (!(window as any).ethereum) {
      throw new BridgeError(
        'Wallet not found. Please install MetaMask or another compatible wallet.',
        'WALLET_NOT_CONNECTED'
      );
    }

    const validation = validateBridgeRouteByAddresses(
      fromChainId,
      toChainId,
      fromCurrency,
      toCurrency
    );

    if (!validation.isValid) {
      throw new BridgeError(
        validation.error || 'Bridge route is invalid',
        'ROUTE_NOT_AVAILABLE',
        { validation }
      );
    }

    const fromChain = validation.fromChain!;
    const toChain = validation.toChain!;
    const token = validation.token!;

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      throw new BridgeError(
        'Invalid amount. Please enter a positive number.',
        'INVALID_AMOUNT'
      );
    }

    console.log('[BridgeService] Starting bridge:', {
      fromChain: fromChain.name,
      toChain: toChain.name,
      token: token.symbol,
      fromCurrency,
      toCurrency,
      amount
    });

    try {
      const kit = new BridgeKit();

      const adapter = await createAdapterFromProvider({
        provider: (window as any).ethereum,
        capabilities: {
          addressContext: 'user-controlled',
        },
      });

      const result = await kit.bridge({
        from: { 
          adapter, 
          chain: fromChain.bridgeKitId as any
        },
        to: { 
          adapter, 
          chain: toChain.bridgeKitId as any
        },
        amount,
        ...(recipient && { recipient })
      });

      const burnStep = result.steps.find((s) => s.name === 'depositForBurn');
      const mintStep = result.steps.find((s) => s.name === 'mint');

      console.log('[BridgeService] Bridge completed:', {
        fromTxHash: burnStep?.txHash,
        toTxHash: mintStep?.txHash,
        steps: result.steps.map(s => s.name)
      });

      return {
        fromTxHash: burnStep?.txHash,
        toTxHash: mintStep?.txHash,
        statusUrl: undefined
      };
    } catch (error: any) {
      console.error('[BridgeService] Bridge error:', error);
      
      if (error instanceof BridgeError) {
        throw error;
      }

      const errorMessage = error?.message || 'Bridge operation failed';
      
      if (errorMessage.includes('insufficient') || errorMessage.includes('balance')) {
        throw new BridgeError(
          'Insufficient funds to perform bridge',
          'INSUFFICIENT_BALANCE',
          error
        );
      }

      if (errorMessage.includes('user rejected') || errorMessage.includes('denied')) {
        throw new BridgeError(
          'Operation cancelled by user',
          'USER_REJECTED',
          error
        );
      }

      throw new BridgeError(
        errorMessage,
        'BRIDGE_FAILED',
        error
      );
    }
  }

  async validateBridgeRoute(
    fromChainId: number, 
    toChainId: number, 
    tokenSymbol: string
  ): Promise<BridgeRouteValidation> {
    return validateBridgeRoute(fromChainId, toChainId, tokenSymbol);
  }

  validateBridgeRouteByAddresses(
    fromChainId: number,
    toChainId: number,
    fromCurrency: string,
    toCurrency: string
  ): BridgeRouteValidation {
    return validateBridgeRouteByAddresses(fromChainId, toChainId, fromCurrency, toCurrency);
  }

  getSupportedChainsForToken(tokenSymbol: string) {
    const { getSupportedChainsForToken } = require('./bridgeConfig');
    return getSupportedChainsForToken(tokenSymbol);
  }

  getSupportedTokensForChain(chainId: number) {
    const { getSupportedTokensForChainByChainId } = require('./bridgeConfig');
    return getSupportedTokensForChainByChainId(chainId);
  }
}

const bridgeService = new BridgeService();
export default bridgeService;



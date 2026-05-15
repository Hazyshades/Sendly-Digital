import { BridgeKit } from '@circle-fin/bridge-kit';
import { createAdapterFromProvider } from '@circle-fin/adapter-viem-v2';
import {
  validateBridgeRouteByAddresses,
  validateBridgeRoute,
  getSupportedChainsForToken,
  getSupportedTokensForChainByChainId,
  type BridgeRouteValidation,
} from './bridgeConfig';
import type { BridgeResult, BridgeParams } from '@/types/bridge';
import { BridgeError } from '@/lib/bridge/bridgeErrors';
import { createDeveloperWalletEip1193Provider } from '@/lib/bridge/developerWalletEip1193Provider';
import { getBridgeHttpRpc } from '@/lib/bridge/bridgeRpc';

export type { BridgeResult, BridgeParams };
export { BridgeError };

/** CCTP v2 steps use `burn` / `mint` (see `@circle-fin/provider-cctp-v2`); older docs used `depositForBurn`. */
function stepNameLower(s: { name?: string }): string {
  return String(s.name ?? '').toLowerCase();
}

function findBridgeStepTxHash(
  steps: Array<{ name?: string; txHash?: string; state?: string }>,
  matchers: string[]
): string | undefined {
  const set = new Set(matchers.map((m) => m.toLowerCase()));
  const match = steps.find((s) => set.has(stepNameLower(s)) && s.state === 'success');
  return match?.txHash;
}

type KitStep = { name?: string; state?: string; errorMessage?: string };

function bridgeKitFailureMessage(steps: KitStep[] | undefined): string {
  const list = steps ?? [];
  const errWithMsg = [...list].reverse().find((s) => s.state === 'error' && s.errorMessage);
  if (errWithMsg?.errorMessage) {
    return errWithMsg.errorMessage;
  }
  const failed = list.filter((s) => s.state === 'error').map((s) => s.name || 'step');
  if (failed.length) {
    return `Bridge failed at: ${failed.join(', ')}`;
  }
  return 'Bridge did not complete successfully. Check your wallet or try an external wallet (MetaMask).';
}

class BridgeService {
  async bridgeArcToBase(amount: string): Promise<BridgeResult> {
    return this.bridge({
      fromChainId: 5042002,
      toChainId: 84532,
      fromCurrency: '0x3600000000000000000000000000000000000000',
      toCurrency: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
      amount,
    });
  }

  async bridge({
    fromChainId,
    toChainId,
    fromCurrency,
    toCurrency,
    amount,
    recipient,
    developerWalletSigner,
  }: BridgeParams): Promise<BridgeResult> {
    const useInternalWallet = Boolean(developerWalletSigner?.wallet?.wallet_address);

    if (!useInternalWallet && !(window as any).ethereum) {
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
      throw new BridgeError(validation.error || 'Bridge route is invalid', 'ROUTE_NOT_AVAILABLE', {
        validation,
      });
    }

    const fromChain = validation.fromChain!;
    const toChain = validation.toChain!;

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      throw new BridgeError('Invalid amount. Please enter a positive number.', 'INVALID_AMOUNT');
    }

    try {
      const kit = new BridgeKit();

      const adapter =
        useInternalWallet && developerWalletSigner
          ? await createAdapterFromProvider({
              provider: createDeveloperWalletEip1193Provider({
                wallet: developerWalletSigner.wallet,
                walletAddressLower: developerWalletSigner.wallet.wallet_address.toLowerCase(),
                initialChainId: fromChainId,
                getRpcUrl: (cid: number) => getBridgeHttpRpc(cid),
                verification: {
                  privyUserId: developerWalletSigner.privyUserId,
                  socialPlatform: developerWalletSigner.socialPlatform,
                  socialUserId: developerWalletSigner.socialUserId,
                },
              }),
              capabilities: {
                addressContext: 'user-controlled',
              },
            })
          : await createAdapterFromProvider({
              provider: (window as any).ethereum,
              capabilities: {
                addressContext: 'user-controlled',
              },
            });

      // Bridge Kit and adapter bundles ship slightly different typings (`Blockchain`, etc.).
      const result = await kit.bridge({
        from: {
          adapter: adapter as any,
          chain: fromChain.bridgeKitId as any,
        },
        to: {
          adapter: adapter as any,
          chain: toChain.bridgeKitId as any,
        },
        amount,
        ...(recipient && { recipient }),
      });

      const burnTxHash =
        findBridgeStepTxHash(result.steps, ['burn', 'depositForBurn', 'deposit_for_burn']) ??
        // если имя шага изменится в новой версии Kit, берём последний успешный on-chain шаг до mint (обычно burn)
        [...result.steps].reverse().find((s) => {
          const n = stepNameLower(s);
          return s.state === 'success' && Boolean(s.txHash) && n !== 'mint' && n !== 'fetchattestation';
        })?.txHash;

      const mintTxHash = findBridgeStepTxHash(result.steps, ['mint']);

      if (import.meta.env.DEV) {
        console.debug('[BridgeService] BridgeKit result', {
          state: (result as { state?: string }).state,
          steps: (result as { steps?: unknown[] }).steps,
        });
      }

      if ((result as { state?: string }).state !== 'success') {
        throw new BridgeError(
          bridgeKitFailureMessage((result as { steps?: KitStep[] }).steps),
          'BRIDGE_KIT_PARTIAL_OR_FAILED',
          result
        );
      }

      if (!burnTxHash || !mintTxHash) {
        throw new BridgeError(
          'Bridge reported success but transaction hashes are missing. Please try again or use an external wallet.',
          'BRIDGE_UNEXPECTED_RESULT',
          result
        );
      }

      return {
        fromTxHash: burnTxHash,
        toTxHash: mintTxHash,
        statusUrl: undefined,
      };
    } catch (error: any) {
      console.error('[BridgeService] Bridge error:', error);

      if (error instanceof BridgeError) {
        throw error;
      }

      const errorMessage = error?.message || 'Bridge operation failed';

      if (errorMessage.includes('insufficient') || errorMessage.includes('balance')) {
        throw new BridgeError('Insufficient funds to perform bridge', 'INSUFFICIENT_BALANCE', error);
      }

      if (errorMessage.includes('user rejected') || errorMessage.includes('denied')) {
        throw new BridgeError('Operation cancelled by user', 'USER_REJECTED', error);
      }

      throw new BridgeError(errorMessage, 'BRIDGE_FAILED', error);
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
    return getSupportedChainsForToken(tokenSymbol);
  }

  getSupportedTokensForChain(chainId: number) {
    return getSupportedTokensForChainByChainId(chainId);
  }
}

const bridgeService = new BridgeService();
export default bridgeService;

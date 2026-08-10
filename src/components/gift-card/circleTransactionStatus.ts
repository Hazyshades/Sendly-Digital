import { DeveloperWalletService } from '@/lib/circle/developerWalletService';
import type { GiftCardCurrency } from './types';
import { formatDeveloperWalletError } from './giftCardErrors';

export async function waitForCircleTransactionCompletion(transactionId: string) {
  await DeveloperWalletService.waitForTransaction(transactionId);
}

export async function resolveCircleTransactionHash(params: {
  transactionId?: string;
  txHash?: string;
  currency: GiftCardCurrency;
  notifyInfo: (message: string) => void;
  notifyWarning: (message: string) => void;
}) {
  const { transactionId, txHash, currency, notifyInfo, notifyWarning } = params;
  if (txHash || !transactionId) {
    return txHash;
  }

  notifyInfo('Waiting for transaction to be processed...');

  try {
    const result = await DeveloperWalletService.waitForTransaction(transactionId);
    if (result.txHash) {
      return result.txHash;
    }

    // COMPLETE/CONFIRMED without hash yet — brief retry, matching prior soft wait.
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const retry = await DeveloperWalletService.getTransactionStatus(transactionId);
    if (retry?.txHash) {
      return retry.txHash;
    }
  } catch (pollError) {
    if (pollError instanceof Error && pollError.message === 'Transaction status timeout') {
      notifyWarning('Transaction is being processed. Please check status later.');
      return transactionId || 'pending';
    }

    const message = pollError instanceof Error ? pollError.message : 'Transaction failed';
    throw new Error(formatDeveloperWalletError(message, currency, 'Transaction failed'));
  }

  notifyWarning('Transaction is being processed. Please check status later.');
  return transactionId || 'pending';
}

import { apiCall } from '@/lib/supabase/client';
import type { GiftCardCurrency } from './types';
import { formatDeveloperWalletError } from './giftCardErrors';

const MAX_STATUS_ATTEMPTS = 30;
const POLL_INTERVAL_MS = 1000;

export async function waitForCircleTransactionCompletion(transactionId: string) {
  for (let attempt = 0; attempt < MAX_STATUS_ATTEMPTS; attempt++) {
    await delay(POLL_INTERVAL_MS);
    try {
      const status = await getCircleTransactionStatus(transactionId);
      if (status?.transactionState === 'COMPLETE') {
        return;
      }
      if (status?.transactionState === 'FAILED') {
        throw new Error(status?.error || status?.transaction?.errorDetails || 'Approve transaction failed');
      }
    } catch (pollError) {
      console.warn('Error polling approve status:', pollError);
    }
  }
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

  for (let attempt = 0; attempt < MAX_STATUS_ATTEMPTS; attempt++) {
    await delay(POLL_INTERVAL_MS);

    try {
      const statusData = await getCircleTransactionStatus(transactionId);

      if (statusData?.txHash) {
        return statusData.txHash;
      }

      if (statusData?.transactionState === 'FAILED') {
        throw new Error(getCircleTransactionFailureMessage(statusData, currency));
      }

      if (statusData?.transactionState === 'COMPLETE' && !statusData.txHash) {
        await delay(2000);
        const retryStatusData = await getCircleTransactionStatus(transactionId);
        if (retryStatusData?.txHash) {
          return retryStatusData.txHash;
        }
      }
    } catch (pollError) {
      if (pollError instanceof Error && pollError.message !== 'Transaction failed') {
        throw pollError;
      }
      console.warn('Error polling transaction status:', pollError);
      if (pollError instanceof Error && pollError.message.includes('Transaction failed')) {
        throw pollError;
      }
    }
  }

  notifyWarning('Transaction is being processed. Please check status later.');
  return transactionId || 'pending';
}

async function getCircleTransactionStatus(transactionId: string) {
  return apiCall(`/wallets/transaction-status?transactionId=${encodeURIComponent(transactionId)}`, {
    method: 'GET'
  });
}

function getCircleTransactionFailureMessage(statusData: any, currency: GiftCardCurrency) {
  const errorDetails = statusData.transaction?.errorDetails ||
    statusData.transaction?.error ||
    statusData.error ||
    'Transaction failed';
  const errorMessage = typeof errorDetails === 'string'
    ? errorDetails
    : JSON.stringify(errorDetails);

  return formatDeveloperWalletError(errorMessage, currency, 'Transaction failed');
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

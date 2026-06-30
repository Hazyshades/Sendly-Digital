import type { GiftCardCurrency } from './types';

export function extractTxHashFromError(errorMessage: string) {
  return errorMessage.match(/0x[a-fA-F0-9]{64}/)?.[0] ?? null;
}

export function isUserRejectedError(error: unknown, errorMessage: string) {
  const errorCode = (error as any)?.code;
  const normalizedMessage = errorMessage.toLowerCase();

  return errorCode === 4001 ||
    normalizedMessage.includes('user rejected') ||
    normalizedMessage.includes('rejected the request') ||
    normalizedMessage.includes('user denied') ||
    normalizedMessage.includes('denied transaction');
}

export type CreateGiftCardErrorPresentation =
  | { type: 'canceled' }
  | {
      type: 'error';
      message: string;
      toastTitle: string;
      toastDescription: string;
      clearTxHash?: boolean;
    };

export function classifyCreateGiftCardError(params: {
  error: unknown;
  errorMessage: string;
  currency: GiftCardCurrency;
  txHash: string | null;
  isCoinbaseWallet: boolean;
}): CreateGiftCardErrorPresentation {
  const { error, errorMessage, currency, txHash, isCoinbaseWallet } = params;

  if (isUserRejectedError(error, errorMessage)) {
    return { type: 'canceled' };
  }

  if (errorMessage.includes('invalid chain ID') && isCoinbaseWallet) {
    return {
      type: 'error',
      message: 'Coinbase Wallet has issues with Arc Testnet. Please use MetaMask or Rainbow Wallet to work with Arc Testnet.',
      toastTitle: 'Error: use MetaMask or Rainbow Wallet',
      toastDescription: 'Coinbase Wallet is not supported for Arc Testnet',
      clearTxHash: true
    };
  }

  if (errorMessage.includes('ERC20') || errorMessage.includes('transfer amount exceeds balance') || errorMessage.includes('Insufficient') || errorMessage.includes('balance')) {
    const message = errorMessage.includes('Insufficient')
      ? errorMessage
      : `Insufficient ${currency} balance. Please ensure you have enough tokens to create this gift card.`;

    return {
      type: 'error',
      message,
      toastTitle: 'Transaction failed',
      toastDescription: txHash
        ? `${message}\nTX: ${txHash.slice(0, 10)}...${txHash.slice(-8)}`
        : message
    };
  }

  if (errorMessage.includes('Transaction failed')) {
    return {
      type: 'error',
      message: errorMessage,
      toastTitle: 'Transaction failed',
      toastDescription: errorMessage
    };
  }

  if (errorMessage.includes('Vault not configured') || errorMessage.includes('Vault contract')) {
    return {
      type: 'error',
      message: errorMessage,
      toastTitle: 'Configuration error',
      toastDescription: errorMessage
    };
  }

  if (errorMessage.includes('Invalid username') || errorMessage.includes('username')) {
    return {
      type: 'error',
      message: errorMessage,
      toastTitle: 'Invalid username',
      toastDescription: errorMessage
    };
  }

  return {
    type: 'error',
    message: errorMessage,
    toastTitle: 'Failed to create gift card',
    toastDescription: errorMessage
  };
}

export function formatDeveloperWalletError(errorMessage: string, currency: GiftCardCurrency, fallback = errorMessage) {
  if (errorMessage.includes('balance') || errorMessage.includes('insufficient') || errorMessage.includes('ERC20')) {
    return `Insufficient ${currency} balance. Please ensure you have enough tokens to create this gift card.`;
  }
  if (errorMessage.includes('allowance') || errorMessage.includes('approve')) {
    return 'Token approval failed. Please try again.';
  }
  if (errorMessage.includes('Vault not set') || errorMessage.includes('vault')) {
    return 'Vault contract not configured. Please contact support.';
  }
  if (errorMessage.includes('Username required') || errorMessage.includes('username')) {
    return 'Invalid username. Please check the username and try again.';
  }

  return fallback;
}

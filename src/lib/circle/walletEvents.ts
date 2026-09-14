import type { DeveloperWallet } from '@/lib/circle/developerWalletService';

export const INTERNAL_WALLET_UPDATED_EVENT = 'internal-wallet-updated';

export function notifyInternalWalletUpdated(wallet?: DeveloperWallet | null): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent(INTERNAL_WALLET_UPDATED_EVENT, { detail: { wallet: wallet ?? null } }),
  );
}

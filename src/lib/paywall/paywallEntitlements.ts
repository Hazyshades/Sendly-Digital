/**
 * Local (per-device) record of paid unlocks so a returning reader isn't re-locked.
 * Keyed by slug → { paymentId, txHash }. The backend still re-verifies the payment
 * on-chain (or via the recorded unlock), so this is a convenience cache, not a bypass.
 */

const STORAGE_PREFIX = 'sendly-paywall-unlock:';

export type StoredEntitlement = {
  paymentId: string;
  txHash: string | null;
};

export function getStoredEntitlement(slug: string): StoredEntitlement | null {
  if (typeof window === 'undefined' || !slug) return null;
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${slug}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredEntitlement;
    return parsed.paymentId ? parsed : null;
  } catch {
    return null;
  }
}

export function storeEntitlement(slug: string, entitlement: StoredEntitlement): void {
  if (typeof window === 'undefined' || !slug || !entitlement.paymentId) return;
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${slug}`, JSON.stringify(entitlement));
  } catch {
    // ignore quota / privacy-mode errors
  }
}

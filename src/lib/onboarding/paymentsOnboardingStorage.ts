export const PAYMENTS_ONBOARDING_STORAGE_KEY = 'sendly:onboarding:payments:v1';

export type PaymentsOnboardingState = 'completed' | 'dismissed';

function getStorage(): Storage | null {
  if (typeof window === 'undefined') return null;

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readPaymentsOnboardingState(): PaymentsOnboardingState | null {
  const storage = getStorage();
  if (!storage) return null;

  try {
    const value = storage.getItem(PAYMENTS_ONBOARDING_STORAGE_KEY);
    return value === 'completed' || value === 'dismissed' ? value : null;
  } catch {
    return null;
  }
}


export function writePaymentsOnboardingState(state: PaymentsOnboardingState): void {
  const storage = getStorage();
  if (!storage) return;

  try {
    storage.setItem(PAYMENTS_ONBOARDING_STORAGE_KEY, state);
  } catch {
    // Storage can be unavailable in private browsing or restricted contexts.
  }
}

export const PRIVY_AUTH_MODE_STORAGE_KEY = 'sendly:privy-auth-mode';
export const PRIVY_AUTH_MODE_CHANGED_EVENT = 'sendly:privy-auth-mode-changed';

export type PrivyAuthMode = 'new' | 'legacy';

export function normalizePrivyAuthMode(value: unknown): PrivyAuthMode {
  return value === 'legacy' ? 'legacy' : 'new';
}

export function getPrivyAuthMode(): PrivyAuthMode {
  if (typeof window === 'undefined') {
    return 'new';
  }

  return normalizePrivyAuthMode(window.localStorage.getItem(PRIVY_AUTH_MODE_STORAGE_KEY));
}

export function setPrivyAuthMode(mode: PrivyAuthMode): void {
  if (typeof window === 'undefined') {
    return;
  }

  const previousMode = getPrivyAuthMode();
  window.localStorage.setItem(PRIVY_AUTH_MODE_STORAGE_KEY, mode);
  console.info('[PrivyDebug] setPrivyAuthMode', {
    previousMode,
    nextMode: mode,
  });
  // Dispatch asynchronously to avoid React warnings about state updates during render.
  window.setTimeout(() => {
    window.dispatchEvent(
      new CustomEvent(PRIVY_AUTH_MODE_CHANGED_EVENT, {
        detail: mode,
      })
    );
  }, 0);
}

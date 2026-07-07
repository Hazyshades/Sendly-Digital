import { ZK_OAUTH_WALLET_PLATFORMS, type ZkOAuthPlatform } from './types';

export const PRIMARY_IDENTITY_KEY = 'sendly-primary-identity';

export function readStoredPrimaryIdentity(): ZkOAuthPlatform | null {
  try {
    const stored = localStorage.getItem(PRIMARY_IDENTITY_KEY)?.trim().toLowerCase();
    if (stored && (ZK_OAUTH_WALLET_PLATFORMS as readonly string[]).includes(stored)) {
      return stored as ZkOAuthPlatform;
    }
  } catch {
    // ignore
  }
  return null;
}

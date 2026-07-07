import { ZK_OAUTH_IDENTITY_UPDATED_EVENT } from './tokenStorage';

export function notifyZkOAuthIdentityUpdated(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(ZK_OAUTH_IDENTITY_UPDATED_EVENT));
}

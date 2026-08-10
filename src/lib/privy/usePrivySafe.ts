import { usePrivy } from '@privy-io/react-auth';
import { isZkHost } from '@/lib/runtime/zkHost';

type PrivyState = ReturnType<typeof usePrivy>;
type E2EPrivyFixture = {
  /** Set `true` to expose the supplied identity to normal main-host UI. */
  authenticated?: boolean;
  /** A Privy-shaped user object, typically with an id and linked social accounts. */
  user?: PrivyState['user'];
  /** Optional deterministic token resolver for flows that request a Privy access token. */
  getAccessToken?: PrivyState['getAccessToken'];
};

declare global {
  interface Window {
    /**
     * Browser-test-only identity contract, read only when `VITE_E2E` is enabled.
     * Install before app boot, for example:
     * `window.__SENDLY_E2E_PRIVY__ = { authenticated: true, user, getAccessToken: async () => 'e2e-token' }`.
     */
    __SENDLY_E2E_PRIVY__?: E2EPrivyFixture;
  }
}

const isE2E =
  import.meta.env.MODE === 'e2e' &&
  (import.meta.env.VITE_E2E === 'true' || import.meta.env.VITE_E2E === '1');

const notAvailableError = new Error('Privy is not available on this host.');

function getE2EFixture(): E2EPrivyFixture | undefined {
  if (!isE2E || typeof window === 'undefined') return undefined;
  return window.__SENDLY_E2E_PRIVY__;
}

function createPrivyFallback(fixture: E2EPrivyFixture | undefined = getE2EFixture()): PrivyState {
  const fallback = new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === 'authenticated') return fixture?.authenticated === true;
        if (prop === 'ready') return isE2E;
        if (prop === 'user') return fixture?.user ?? null;
        if (prop === 'getAccessToken') return fixture?.getAccessToken ?? (async () => null);
        if (prop === 'login') return async () => {
          throw notAvailableError;
        };
        if (prop === 'logout') return async () => {
          throw notAvailableError;
        };
        return undefined;
      },
    }
  );

  return fallback as PrivyState;
}

/**
 * `@privy-io/react-auth` hard-fails if the current origin is not allowed in the Privy dashboard.
 * For local zk subdomain dev (e.g. `zk.localhost`) we allow the app to run without Privy by
 * returning a safe fallback when Privy context isn't available.
 * 
 * IMPORTANT: On zk hosts Privy is completely disabled to prevent OAuth interception.
 */
export function usePrivySafe(): PrivyState {
  if (isZkHost() || isE2E) {
    return createPrivyFallback();
  }

  try {
    // `main.tsx` intentionally omits PrivyProvider on zk and deterministic
    // E2E hosts. Calling `usePrivy` there prevents the app from rendering.
    // A document cannot change origin while mounted, so this branch is stable.
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return usePrivy();
  } catch {
    return createPrivyFallback();
  }
}


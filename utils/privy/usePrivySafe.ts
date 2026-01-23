import { usePrivy } from '@privy-io/react-auth';

type PrivyState = ReturnType<typeof usePrivy>;

const notAvailableError = new Error('Privy is not available on this host.');

function createPrivyFallback(): PrivyState {
  const fallback = new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === 'authenticated') return false;
        if (prop === 'ready') return false;
        if (prop === 'user') return null;
        if (prop === 'getAccessToken') return async () => null;
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
 */
export function usePrivySafe(): PrivyState {
  try {
    return usePrivy();
  } catch {
    return createPrivyFallback();
  }
}


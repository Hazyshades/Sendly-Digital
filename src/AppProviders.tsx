import { lazy, Suspense, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { CircleWalletProvider } from '@/hooks/useCircleWallet';
import { SplashScreen } from '@/components/SplashScreen';
import { config } from '@/lib/web3/wagmiConfig';
import { isZkHost } from '@/lib/runtime/zkHost';
import {
  getPrivyAuthMode,
  normalizePrivyAuthMode,
  PRIVY_AUTH_MODE_CHANGED_EVENT,
  PRIVY_AUTH_MODE_STORAGE_KEY,
  type PrivyAuthMode,
} from '@/lib/privy/authMode';
import { getPrivyAppIdByMode } from '@/lib/privy';
import 'driver.js/dist/driver.css';
import '@/styles/driverjs.css';
import '@rainbow-me/rainbowkit/styles.css';

const queryClient = new QueryClient();

const isE2E =
  import.meta.env.MODE === 'e2e' &&
  (import.meta.env.VITE_E2E === 'true' || import.meta.env.VITE_E2E === '1');
const disablePrivy = isZkHost() || isE2E;

const PrivyProviderWrapper = disablePrivy
  ? null
  : lazy(async () => {
      // Intentional code-splitting boundary: Privy is not needed on the public landing route.
      const privyModule = await import('@privy-io/react-auth');

      return {
        default: ({ children, appId }: { children: ReactNode; appId: string }) => (
          <privyModule.PrivyProvider appId={appId}>{children}</privyModule.PrivyProvider>
        ),
      };
    });

function ProviderTree({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider locale="en">
          <CircleWalletProvider>{children}</CircleWalletProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export function AppProviders({ children }: { children: ReactNode }) {
  const [privyAuthMode, setPrivyAuthMode] = useState<PrivyAuthMode>(getPrivyAuthMode());

  useEffect(() => {
    console.info('[PrivyDebug] AppProviders mount', {
      origin: window.location.origin,
      initialMode: getPrivyAuthMode(),
    });

    const onModeChanged = (event: Event) => {
      const customEvent = event as CustomEvent<PrivyAuthMode>;
      console.info('[PrivyDebug] Auth mode changed event', {
        modeFromEvent: customEvent.detail,
      });
      setPrivyAuthMode(normalizePrivyAuthMode(customEvent.detail));
    };

    const onStorageChanged = (event: StorageEvent) => {
      if (event.key !== PRIVY_AUTH_MODE_STORAGE_KEY) return;
      console.info('[PrivyDebug] localStorage auth mode changed', {
        oldValue: event.oldValue,
        newValue: event.newValue,
      });
      setPrivyAuthMode(normalizePrivyAuthMode(event.newValue));
    };

    window.addEventListener(PRIVY_AUTH_MODE_CHANGED_EVENT, onModeChanged as EventListener);
    window.addEventListener('storage', onStorageChanged);

    return () => {
      window.removeEventListener(PRIVY_AUTH_MODE_CHANGED_EVENT, onModeChanged as EventListener);
      window.removeEventListener('storage', onStorageChanged);
    };
  }, []);

  const privyAppId = getPrivyAppIdByMode(privyAuthMode);

  useEffect(() => {
    console.info('[PrivyDebug] Privy provider config', {
      mode: privyAuthMode,
      appId: privyAppId,
      disablePrivy,
    });
  }, [privyAuthMode, privyAppId]);

  const providerTree = <ProviderTree>{children}</ProviderTree>;

  if (disablePrivy || !PrivyProviderWrapper) {
    return providerTree;
  }

  return (
    <Suspense fallback={<SplashScreen />}>
      <PrivyProviderWrapper appId={privyAppId}>{providerTree}</PrivyProviderWrapper>
    </Suspense>
  );
}

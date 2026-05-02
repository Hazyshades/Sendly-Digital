import { Buffer } from 'buffer'
;(globalThis as any).Buffer = Buffer

import React, { Suspense, lazy, useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RainbowKitProvider } from '@rainbow-me/rainbowkit'
import { Analytics } from '@vercel/analytics/react'
import App from './App.tsx'
import '@/styles/globals.css'
import '@rainbow-me/rainbowkit/styles.css'
import { config } from '@/lib/web3/wagmiConfig'
import { isZkLocalhost } from '@/lib/runtime/zkHost'
import { getPrivyAuthMode, normalizePrivyAuthMode, PRIVY_AUTH_MODE_CHANGED_EVENT, PRIVY_AUTH_MODE_STORAGE_KEY, type PrivyAuthMode } from '@/lib/privy/authMode'
import { getPrivyAppIdByMode } from '@/lib/privy'

const queryClient = new QueryClient()

const disablePrivy = isZkLocalhost()

// Lazy load PrivyProvider only when not on zk.localhost to prevent SDK initialization
// This ensures Privy SDK is never loaded for zk.localhost, preventing OAuth interception
const PrivyProviderWrapper = disablePrivy 
  ? null 
  : lazy(async () => {
      const privyModule = await import('@privy-io/react-auth');
      
      return {
        default: ({ children, appId }: { children: React.ReactNode; appId: string }) => (
          <privyModule.PrivyProvider appId={appId}>
            {children}
          </privyModule.PrivyProvider>
        )
      };
    });

const AppContent = () => (
  <WagmiProvider config={config}>
    <QueryClientProvider client={queryClient}>
      <RainbowKitProvider locale="en">
        <App />
        <Analytics />
      </RainbowKitProvider>
    </QueryClientProvider>
  </WagmiProvider>
);

const AppRoot = () => {
  const [privyAuthMode, setPrivyAuthMode] = useState<PrivyAuthMode>(getPrivyAuthMode());

  useEffect(() => {
    console.info('[PrivyDebug] AppRoot mount', {
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

  return (
    <BrowserRouter>
      {disablePrivy ? (
        <AppContent />
      ) : PrivyProviderWrapper ? (
        <Suspense fallback={<div>Loading...</div>}>
          <PrivyProviderWrapper appId={privyAppId}>
            <AppContent />
          </PrivyProviderWrapper>
        </Suspense>
      ) : (
        <AppContent />
      )}
    </BrowserRouter>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppRoot />
  </React.StrictMode>,
) 
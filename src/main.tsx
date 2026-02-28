import React, { Suspense, lazy } from 'react'
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

const queryClient = new QueryClient()

const disablePrivy = isZkLocalhost()

// Lazy load PrivyProvider only when not on zk.localhost to prevent SDK initialization
// This ensures Privy SDK is never loaded for zk.localhost, preventing OAuth interception
const PrivyProviderWrapper = disablePrivy 
  ? null 
  : lazy(async () => {
      const privyModule = await import('@privy-io/react-auth');
      const privyAppId = import.meta.env.VITE_PRIVY_APP_ID || 'cmhg42ayn00p1l40c6jsf09pw';
      
      return {
        default: ({ children }: { children: React.ReactNode }) => (
          <privyModule.PrivyProvider appId={privyAppId}>
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

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      {disablePrivy ? (
        <AppContent />
      ) : PrivyProviderWrapper ? (
        <Suspense fallback={<div>Loading...</div>}>
          <PrivyProviderWrapper>
            <AppContent />
          </PrivyProviderWrapper>
        </Suspense>
      ) : (
        <AppContent />
      )}
    </BrowserRouter>
  </React.StrictMode>,
) 
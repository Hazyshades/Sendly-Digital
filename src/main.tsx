import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RainbowKitProvider } from '@rainbow-me/rainbowkit'
import { PrivyProvider } from '@privy-io/react-auth'
import { Analytics } from '@vercel/analytics/react'
import App from './App.tsx'
import '../styles/globals.css'
import '@rainbow-me/rainbowkit/styles.css'
import { config } from '../utils/web3/wagmiConfig'
import { ChainProvider } from '../utils/chain/chainContext'

const queryClient = new QueryClient()

const privyAppId = import.meta.env.VITE_PRIVY_APP_ID || 'cmhg42ayn00p1l40c6jsf09pw'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <PrivyProvider appId={privyAppId}>
        <WagmiProvider config={config}>
          <QueryClientProvider client={queryClient}>
            <RainbowKitProvider locale="en">
              <ChainProvider>
                <App />
                <Analytics />
              </ChainProvider>
            </RainbowKitProvider>
          </QueryClientProvider>
        </WagmiProvider>
      </PrivyProvider>
    </BrowserRouter>
  </React.StrictMode>,
) 
import { Buffer } from 'buffer'
;(globalThis as any).Buffer = Buffer

import React, { Suspense, lazy } from 'react'
import ReactDOM from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import { BrowserRouter, useLocation } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import App from './App.tsx'
import { SplashScreen } from '@/components/SplashScreen'
import { ZkLoadingShell } from '@/components/ZkLoadingShell'
import { isZkHost } from '@/lib/runtime/zkHost'
import '@/styles/globals.css'


// Intentional code-splitting boundary: static provider imports would load Web3 on the landing route.
const AppProviders = lazy(async () => {
  const module = await import('./AppProviders')
  return { default: module.AppProviders }
})

function RoutedApp() {
  const location = useLocation()
  const needsProviders = isZkHost() || location.pathname !== '/'
  const providerFallback = isZkHost() ? <ZkLoadingShell /> : <SplashScreen />

  return (
    <>
      <Analytics />
      {needsProviders ? (
        <Suspense fallback={providerFallback}>
          <AppProviders>
            <App />
          </AppProviders>
        </Suspense>
      ) : (
        <App />
      )}
    </>
  )
}

const AppRoot = () => (
  <HelmetProvider>
    <BrowserRouter>
      <RoutedApp />
    </BrowserRouter>
  </HelmetProvider>
)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppRoot />
  </React.StrictMode>,
)

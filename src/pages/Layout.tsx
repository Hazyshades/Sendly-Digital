import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Link, useLocation } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Toaster } from '@/components/ui/sonner';
import { FeedbackPanel } from '@/components/FeedbackPanel';
import { ZkAppShell } from '@/components/zk-accounts/ZkAppShell';
import { useState, lazy, Suspense } from 'react';
import { isZkHost } from '@/lib/runtime/zkHost';

// Privy UI only on non-zk hosts (zk uses direct OAuth for GitHub etc.)
const PrivyAuthModal = isZkHost()
  ? null
  : lazy(() => import('@/components/PrivyAuthModal').then(m => ({ default: m.PrivyAuthModal })));

const PrivyConnectedAccounts = isZkHost()
  ? null
  : lazy(() => import('@/components/PrivyConnectedAccounts').then(m => ({ default: m.PrivyConnectedAccounts })));

interface LayoutProps {
  children: React.ReactNode;
}

/** When `VITE_MAINTENANCE_BANNER` is unset, this default applies. Set to `false` after maintenance. */
const MAINTENANCE_BANNER_FALLBACK = false;
const MAINTENANCE_BANNER_MESSAGE =
  "We're performing maintenance. Internal Wallet and Leaderboard may be temporarily unavailable.";

function readMaintenanceBannerFlag(): boolean {
  const raw = import.meta.env.VITE_MAINTENANCE_BANNER;
  if (raw === '1' || raw === 'true') return true;
  if (raw === '0' || raw === 'false') return false;
  return MAINTENANCE_BANNER_FALLBACK;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const [isPrivyModalOpen, setIsPrivyModalOpen] = useState(false);
  const [headerCollapsed, setHeaderCollapsed] = useState(false);
  const [zkAccountsSheetOpen, setZkAccountsSheetOpen] = useState(false);
  const zk = isZkHost();
  const zkNoPrivy = zk;
  const showMaintenanceBanner = readMaintenanceBannerFlag();

  const navigationItems = zk
    ? [
        { path: '/dashboard', label: 'Dashboard', icon: '🎤' },
        { path: '/payments', label: 'Payments', icon: '⚡' },
        { path: '/history', label: 'History', icon: '📜' },
        { path: '/leaderboard', label: 'Leaderboard', icon: '🏆' },
      ]
    : [
        { path: '/dashboard', label: 'Dashboard', icon: '🎤' },
        { path: '/create', label: 'Create', icon: '➕' },
        { path: '/my', label: 'My Cards', icon: '🎴' },
        { path: '/spend', label: 'Spend', icon: '💳' },
        { path: '/history', label: 'History', icon: '📜' },
        { path: '/leaderboard', label: 'Leaderboard', icon: '🏆' },
      ];

  const isActive = (path: string) => location.pathname === path;

  const mainContent = (
    <>
      <nav className="mb-4">
        <div className="flex gap-2">
          {navigationItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex-1 px-3 py-2 rounded-2xl text-center text-sm font-medium transition-[background-color,color,box-shadow] duration-200 ease-[var(--ease-out)] active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100 ${
                isActive(item.path)
                  ? 'bg-white text-blue-600 shadow-circle-card'
                  : 'bg-white/70 text-gray-700 hover:bg-white/90 backdrop-blur-sm'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </nav>

      {/* Non-zk pages still use a shared page shell; Dashboard owns its own Card. */}
      {location.pathname === '/dashboard' || location.pathname === '/agent' ? (
        children
      ) : (
        <Card className="gap-0 overflow-hidden bg-white shadow-circle-card rounded-2xl backdrop-blur-sm">
          {children}
        </Card>
      )}
    </>
  );

  return (
    <div className="min-h-screen circle-gradient-bg">
      {showMaintenanceBanner ? (
        <div
          role="status"
          className="relative z-20 border-b border-amber-200/80 bg-amber-50/95 px-4 py-2.5 text-center text-sm font-medium text-amber-950 backdrop-blur-sm"
        >
          {MAINTENANCE_BANNER_MESSAGE}
        </div>
      ) : null}
      <div className="abstract-shape"></div>
      <header className="flex items-center justify-between p-6 relative z-10 h-20">
        <Link to="/" className="flex items-center gap-3">
          <img
            src="/sendly-wordmark.svg"
            alt="Sendly"
            className="h-10 w-auto object-contain"
          />
        </Link>
        
        <div className="flex items-center">
          <button
            onClick={() => setHeaderCollapsed(c => !c)}
            className="p-1.5 rounded-xl transition-transform duration-200 ease-[var(--ease-out)] active:scale-[0.97] shrink-0 motion-reduce:transition-none motion-reduce:active:scale-100"
            aria-label={headerCollapsed ? 'Show panel' : 'Hide panel'}
          >
            <svg
              className={`w-4 h-4 text-gray-500 transition-transform duration-200 ease-[var(--ease-out)] ${headerCollapsed ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <div
            className={`flex items-center gap-4 overflow-hidden transition-[opacity,transform] duration-200 ease-[var(--ease-out)] shadow-none [box-shadow:none] motion-reduce:transition-none ${
              headerCollapsed ? 'opacity-0 -translate-x-2 pointer-events-none w-0 ml-0' : 'opacity-100 translate-x-0 ml-2'
            }`}
          >
            {zk ? (
              <button
                type="button"
                onClick={() => setZkAccountsSheetOpen(true)}
                className="lg:hidden bg-white border border-gray-200 text-gray-900 hover:bg-gray-50 px-4 py-2 rounded-2xl transition-[transform,background-color] duration-200 ease-[var(--ease-out)] active:scale-[0.97] font-medium motion-reduce:transition-none motion-reduce:active:scale-100"
              >
                Social
              </button>
            ) : null}
            {!zkNoPrivy && PrivyConnectedAccounts ? (
              <Suspense fallback={null}>
                <PrivyConnectedAccounts />
              </Suspense>
            ) : null}
            {!zkNoPrivy ? (
              <button
                type="button"
                onClick={() => setIsPrivyModalOpen(true)}
                className="bg-white border border-gray-200 text-gray-900 hover:bg-gray-50 px-4 py-2 rounded-2xl transition-[transform,background-color] duration-200 ease-[var(--ease-out)] active:scale-[0.97] flex items-center gap-2 font-medium motion-reduce:transition-none motion-reduce:active:scale-100"
              >
                Social
              </button>
            ) : null}
            {!zk ? (
              <Link
                to="/payments"
                className="bg-white border border-gray-200 text-gray-900 hover:bg-gray-50 px-4 py-2 rounded-2xl transition-[transform,background-color] duration-200 ease-[var(--ease-out)] active:scale-[0.97] flex items-center gap-2 font-medium motion-reduce:transition-none motion-reduce:active:scale-100"
              >
                Payments
              </Link>
            ) : null}
            <ConnectButton />
          </div>
        </div>
      </header>
      
      {!zkNoPrivy && PrivyAuthModal ? (
        <Suspense fallback={null}>
          <PrivyAuthModal isOpen={isPrivyModalOpen} onClose={() => setIsPrivyModalOpen(false)} />
        </Suspense>
      ) : null}

      <div className="container mx-auto px-6 pb-6 relative z-10">
        {zk ? (
          <ZkAppShell
            navigationItems={navigationItems}
            isActive={isActive}
            mobileSheetOpen={zkAccountsSheetOpen}
            onMobileSheetOpenChange={setZkAccountsSheetOpen}
          >
            {children}
          </ZkAppShell>
        ) : (
          <div className="max-w-2xl mx-auto">{mainContent}</div>
        )}
      </div>
      <Toaster />
      <FeedbackPanel />
    </div>
  );
}

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Link, useLocation } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Toaster } from '@/components/ui/sonner';
import { NewsPanel } from '@/components/NewsPanel';
import { FeedbackPanel } from '@/components/FeedbackPanel';
import { useState, lazy, Suspense } from 'react';
import { isZkHost, isZkLocalhost, toZkUrl } from '@/lib/runtime/zkHost';

// Lazy load Privy components only when not on zk.localhost to prevent SDK loading
const PrivyAuthModal = isZkLocalhost() 
  ? null 
  : lazy(() => import('@/components/PrivyAuthModal').then(m => ({ default: m.PrivyAuthModal })));

const PrivyConnectedAccounts = isZkLocalhost()
  ? null
  : lazy(() => import('@/components/PrivyConnectedAccounts').then(m => ({ default: m.PrivyConnectedAccounts })));

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const [isPrivyModalOpen, setIsPrivyModalOpen] = useState(false);
  const [headerCollapsed, setHeaderCollapsed] = useState(false);
  const zk = isZkHost();
  const zkLocal = isZkLocalhost();
  const disablePaymentsInHeader = !zk && location.pathname === '/create';

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

  return (
    <div className="min-h-screen circle-gradient-bg">
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
            className="p-1.5 rounded-xl transition-all duration-300 shrink-0"
            aria-label={headerCollapsed ? 'Show panel' : 'Hide panel'}
          >
            <svg
              className={`w-4 h-4 text-gray-500 transition-transform duration-300 ${headerCollapsed ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <div
            className={`flex items-center gap-4 overflow-hidden transition-all duration-300 ease-in-out shadow-none [box-shadow:none] ${
              headerCollapsed ? 'max-w-0 opacity-0 ml-0' : 'max-w-[800px] opacity-100 ml-2'
            }`}
          >
            {!zkLocal && PrivyConnectedAccounts ? (
              <Suspense fallback={null}>
                <PrivyConnectedAccounts />
              </Suspense>
            ) : null}
            {!zk ? (
              disablePaymentsInHeader ? (
                <button
                  type="button"
                  disabled
                  aria-disabled="true"
                  className="bg-white/70 border border-gray-200 text-gray-400 px-4 py-2 rounded-2xl transition-all duration-200 flex items-center gap-2 font-medium cursor-not-allowed"
                >
                  Payments
                </button>
              ) : (
                <a
                  href={toZkUrl(`${window.location.origin}/payments`)}
                  className="bg-white border border-gray-200 text-gray-900 hover:bg-gray-50 px-4 py-2 rounded-2xl transition-all duration-200 flex items-center gap-2 font-medium"
                >
                  Payments
                </a>
              )
            ) : null}
            <ConnectButton />
          </div>
        </div>
      </header>
      
      {!zkLocal && PrivyAuthModal ? (
        <Suspense fallback={null}>
          <PrivyAuthModal isOpen={isPrivyModalOpen} onClose={() => setIsPrivyModalOpen(false)} />
        </Suspense>
      ) : null}

      <div className="container mx-auto px-6 pb-6 relative z-10">
        <div className="max-w-2xl mx-auto">
          <nav className="mb-4">
            <div className="flex gap-2">
              {navigationItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex-1 px-3 py-2 rounded-2xl text-center text-sm font-medium transition-all duration-200 ${
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

          <Card className="bg-white shadow-circle-card rounded-2xl backdrop-blur-sm">
            {children}
          </Card>
        </div>
      </div>
      <Toaster />
      {location.pathname !== '/' && <NewsPanel />}
      <FeedbackPanel />
    </div>
  );
}

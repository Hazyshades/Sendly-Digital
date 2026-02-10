import { Gift } from 'lucide-react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Link, useLocation } from 'react-router-dom';
import { Card } from '../components/ui/card';
import { Toaster } from '../components/ui/sonner';
import { NewsPanel } from '../components/NewsPanel';
import { FeedbackPanel } from '../components/FeedbackPanel';
import { useState, lazy, Suspense } from 'react';
import { isZkHost, isZkLocalhost, toZkUrl } from '../utils/runtime/zkHost';

// Lazy load Privy components only when not on zk.localhost to prevent SDK loading
const PrivyAuthModal = isZkLocalhost() 
  ? null 
  : lazy(() => import('../components/PrivyAuthModal').then(m => ({ default: m.PrivyAuthModal })));

const PrivyConnectedAccounts = isZkLocalhost()
  ? null
  : lazy(() => import('../components/PrivyConnectedAccounts').then(m => ({ default: m.PrivyConnectedAccounts })));

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const [isPrivyModalOpen, setIsPrivyModalOpen] = useState(false);
  const zk = isZkHost();
  const zkLocal = isZkLocalhost();

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
      <header className="flex items-center justify-between p-6 relative z-10">
        <div className="flex items-center gap-3">
          <div className="relative w-12 h-12 bg-blue-400 rounded-2xl flex items-center justify-center cursor-pointer shadow-circle-card">
            <Gift className="w-7 h-7 text-white" />
          </div>
          <span className="relative text-gray-900 text-2xl font-semibold">
            Sendly
            <img 
              src="/new_year.png" 
              alt="Santa hat" 
              className="absolute -top-4 -left-2 w-8 h-10 object-contain z-10"
            />
          </span>
        </div>
        
        <div className="flex items-center gap-4">
          {!zkLocal && PrivyConnectedAccounts ? (
            <Suspense fallback={null}>
              <PrivyConnectedAccounts />
            </Suspense>
          ) : null}
          {!zkLocal ? (
            <button
              onClick={() => setIsPrivyModalOpen(true)}
              className="bg-white/90 backdrop-blur-sm border border-gray-200 text-gray-900 hover:bg-white px-4 py-2 rounded-2xl transition-all duration-200 flex items-center gap-2 shadow-circle-card font-medium"
            >
              🔐 Social login
            </button>
          ) : null}
          {!zk ? (
            <a
              href={(() => {
                const hostname = window.location.hostname.toLowerCase();
                if (hostname === 'localhost' || hostname === '127.0.0.1') {
                  return 'https://zk.localhost:3000/payments';
                }
                return toZkUrl(`${window.location.origin}/payments`);
              })()}
              className="bg-white/90 backdrop-blur-sm border border-gray-200 text-gray-900 hover:bg-white px-4 py-2 rounded-2xl transition-all duration-200 flex items-center gap-2 shadow-circle-card font-medium"
            >
              Payments
            </a>
          ) : null}
          <ConnectButton />
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

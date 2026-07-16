import { Link } from 'react-router-dom';
import { Users, LayoutDashboard } from 'lucide-react';

import { Toaster } from '@/components/ui/sonner';
import { FeedbackPanel } from '@/components/FeedbackPanel';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { ZkSocialConnectionsPanel } from '@/components/zk-accounts/ZkSocialConnectionsPanel';

interface CreatorLayoutProps {
  children: React.ReactNode;
}

export function CreatorLayout({ children }: CreatorLayoutProps) {
  return (
    <div className="min-h-screen circle-gradient-bg">
      <div className="abstract-shape" />
      <header className="flex items-center justify-between p-6 relative z-10 h-20">
        <Link to="/" className="flex items-center gap-3">
          <img src="/sendly-wordmark.svg" alt="Sendly" className="h-10 w-auto object-contain" />
        </Link>

        <div className="flex items-center gap-2">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="secondary" size="sm" className="rounded-full">
                <Users className="mr-2 h-4 w-4" />
                Accounts
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[min(100vw-2rem,22.5rem)] p-0 gap-0">
              <SheetHeader className="px-5 pt-5 pb-2">
                <SheetTitle>Payment identities</SheetTitle>
              </SheetHeader>
              <div className="overflow-y-auto px-2 pb-6">
                <ZkSocialConnectionsPanel embedded className="bg-transparent" />
              </div>
            </SheetContent>
          </Sheet>

          <Button asChild variant="secondary" size="sm" className="rounded-full">
            <Link to="/dashboard">
              <LayoutDashboard className="mr-2 h-4 w-4" />
              Dashboard
            </Link>
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-6 pb-12 relative z-10">
        <div className="max-w-3xl mx-auto">{children}</div>
      </div>

      <Toaster />
      <FeedbackPanel />
    </div>
  );
}

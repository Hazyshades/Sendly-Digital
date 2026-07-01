import { Link } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { FeedbackPanel } from '@/components/FeedbackPanel';

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
      </header>

      <div className="container mx-auto px-6 pb-12 relative z-10">
        <div className="max-w-3xl mx-auto">{children}</div>
      </div>

      <Toaster />
      <FeedbackPanel />
    </div>
  );
}

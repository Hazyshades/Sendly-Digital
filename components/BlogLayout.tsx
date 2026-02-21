import { Link } from 'react-router-dom';
import { Gift } from 'lucide-react';

export interface BlogLayoutBackLink {
  to: string;
  label: React.ReactNode;
}

interface BlogLayoutProps {
  children: React.ReactNode;
  backLink: BlogLayoutBackLink;
  /** Add blog-post-cohere for post pages that need hero/section typography */
  cohereTypography?: boolean;
}

export function BlogLayout({ children, backLink, cohereTypography = false }: BlogLayoutProps) {
  return (
    <div
      className={`min-h-screen blog-shell ${cohereTypography ? 'blog-post-cohere' : ''}`}
      style={{ background: '#fafafa' }}
    >
      <header
        className="sticky top-0 z-50 backdrop-blur-md border-b border-gray-200"
        style={{ backgroundColor: 'rgba(250, 250, 250, 0.9)' }}
      >
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-400 rounded-xl flex items-center justify-center">
                <Gift className="w-6 h-6 text-white" />
              </div>
              <span className="text-gray-900 text-xl font-semibold">Sendly</span>
            </Link>
            <Link
              to={backLink.to}
              className="text-gray-600 hover:text-gray-900 transition-colors text-sm font-medium flex items-center gap-2"
            >
              {backLink.label}
            </Link>
          </div>
        </div>
      </header>

      <main className="blog-section">{children}</main>

      <footer className="border-t border-gray-200 mt-16" style={{ backgroundColor: '#fafafa' }}>
        <div className="container mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center gap-3 mb-4 md:mb-0">
              <div className="w-8 h-8 bg-blue-400 rounded-lg flex items-center justify-center">
                <Gift className="w-5 h-5 text-white" />
              </div>
              <span className="text-gray-900 font-semibold">Sendly</span>
            </div>
            <div className="text-sm text-gray-500">
              © 2026 Sendly. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

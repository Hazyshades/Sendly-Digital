import { Link } from 'react-router-dom';
import { Lock } from 'lucide-react';
import type { CreatorArticleSummary } from '@/lib/paywall/creatorProfileAPI';
import { getCreatorPaywallPublicPath } from '@/lib/paywall/creatorPaywallAPI';

export function ArticleCard({ article }: { article: CreatorArticleSummary }) {
  return (
    <Link
      to={getCreatorPaywallPublicPath(article.slug)}
      className="block rounded-2xl border border-gray-200/70 bg-white/70 px-5 py-4 transition-[background-color,box-shadow] duration-200 ease-[var(--ease-out)] hover:bg-white hover:shadow-circle-card"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="flex items-center gap-2 text-base font-medium text-gray-900">
          <Lock className="h-4 w-4 shrink-0 text-gray-500" />
          {article.title}
        </h3>
        <span className="inline-flex shrink-0 items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
          {article.priceUsdc} USDC
        </span>
      </div>
      {article.teaser ? (
        <p className="mt-2 line-clamp-2 pl-6 text-sm text-muted-foreground">{article.teaser}</p>
      ) : null}
    </Link>
  );
}

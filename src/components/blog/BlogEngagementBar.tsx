import { useCallback, useEffect, useState } from 'react';
import { Eye, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  fetchBlogStats,
  hasRecordedViewThisSession,
  isPostLikedLocally,
  markViewRecordedThisSession,
  recordBlogView,
  toggleBlogLike,
  type BlogEngagementStats,
} from '@/lib/blog/engagement';

interface BlogEngagementBarProps {
  slug: string;
  compact?: boolean;
  /** When true, increments view count once per browser session (article page only). */
  recordViewOnMount?: boolean;
  className?: string;
}

export function BlogEngagementBar({
  slug,
  compact = false,
  recordViewOnMount = false,
  className,
}: BlogEngagementBarProps) {
  const [stats, setStats] = useState<BlogEngagementStats>({ viewCount: 0, likeCount: 0 });
  const [liked, setLiked] = useState(false);
  const [loadingLike, setLoadingLike] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLiked(isPostLikedLocally(slug));

    const load = async () => {
      if (recordViewOnMount && !hasRecordedViewThisSession(slug)) {
        const updated = await recordBlogView(slug);
        if (cancelled) return;
        markViewRecordedThisSession(slug);
        setStats(updated);
        return;
      }
      const current = await fetchBlogStats(slug);
      if (!cancelled) setStats(current);
    };

    load().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [slug, recordViewOnMount]);

  const onToggleLike = useCallback(async () => {
    if (loadingLike) return;
    setLoadingLike(true);
    try {
      const result = await toggleBlogLike(slug);
      setStats(result.stats);
      setLiked(result.liked);
    } finally {
      setLoadingLike(false);
    }
  }, [loadingLike, slug]);

  const viewsLabel = `${stats.viewCount.toLocaleString()} view${stats.viewCount === 1 ? '' : 's'}`;

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-4',
        compact ? 'text-xs text-gray-500' : 'text-sm text-gray-600',
        className,
      )}
    >
      <span className={cn('flex items-center gap-1.5', compact ? '' : 'font-medium')}>
        {!compact && <Eye className="w-4 h-4 text-gray-400" aria-hidden />}
        {viewsLabel}
      </span>
      <button
        type="button"
        onClick={onToggleLike}
        disabled={loadingLike}
        className={cn(
          'flex items-center gap-1.5 rounded-lg transition-colors',
          compact ? 'hover:text-purple-600' : 'px-2 py-1 hover:bg-gray-50',
          liked ? 'text-red-500' : 'text-gray-600 hover:text-red-500',
        )}
        aria-pressed={liked}
        aria-label={liked ? 'Unlike' : 'Like'}
      >
        <Heart className={cn('w-4 h-4', liked && 'fill-current')} aria-hidden />
        <span className={compact ? '' : 'font-medium tabular-nums'}>
          {stats.likeCount.toLocaleString()}
        </span>
      </button>
    </div>
  );
}

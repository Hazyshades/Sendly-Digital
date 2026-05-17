import { supabase } from '@/lib/supabase/client';

export interface BlogEngagementStats {
  viewCount: number;
  likeCount: number;
}

const VISITOR_ID_KEY = 'sendly:blog-visitor-id';
const LIKED_PREFIX = 'sendly:blog-liked:';
const VIEWED_PREFIX = 'sendly:blog-viewed:';

function rowToStats(row: { view_count: number; like_count: number } | null): BlogEngagementStats {
  return {
    viewCount: Number(row?.view_count ?? 0),
    likeCount: Number(row?.like_count ?? 0),
  };
}

export function getOrCreateVisitorId(): string {
  try {
    const existing = localStorage.getItem(VISITOR_ID_KEY);
    if (existing) return existing;
    const id = crypto.randomUUID();
    localStorage.setItem(VISITOR_ID_KEY, id);
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

export function isPostLikedLocally(slug: string): boolean {
  try {
    return localStorage.getItem(`${LIKED_PREFIX}${slug}`) === '1';
  } catch {
    return false;
  }
}

function setPostLikedLocally(slug: string, liked: boolean): void {
  try {
    if (liked) localStorage.setItem(`${LIKED_PREFIX}${slug}`, '1');
    else localStorage.removeItem(`${LIKED_PREFIX}${slug}`);
  } catch {
    /* ignore */
  }
}

export function hasRecordedViewThisSession(slug: string): boolean {
  try {
    return sessionStorage.getItem(`${VIEWED_PREFIX}${slug}`) === '1';
  } catch {
    return false;
  }
}

export function markViewRecordedThisSession(slug: string): void {
  try {
    sessionStorage.setItem(`${VIEWED_PREFIX}${slug}`, '1');
  } catch {
    /* ignore */
  }
}

export async function fetchBlogStats(slug: string): Promise<BlogEngagementStats> {
  const { data, error } = await supabase.rpc('blog_get_stats', { p_slug: slug });
  if (error) {
    console.warn('[blog] fetch stats failed', error.message);
    return { viewCount: 0, likeCount: 0 };
  }
  const row = Array.isArray(data) ? data[0] : data;
  return rowToStats(row as { view_count: number; like_count: number } | null);
}

export async function recordBlogView(slug: string): Promise<BlogEngagementStats> {
  const { data, error } = await supabase.rpc('blog_record_view', { p_slug: slug });
  if (error) {
    console.warn('[blog] record view failed', error.message);
    return fetchBlogStats(slug);
  }
  const row = Array.isArray(data) ? data[0] : data;
  return rowToStats(row as { view_count: number; like_count: number } | null);
}

export async function toggleBlogLike(slug: string): Promise<{ stats: BlogEngagementStats; liked: boolean }> {
  const visitorId = getOrCreateVisitorId();
  const { data, error } = await supabase.rpc('blog_toggle_like', {
    p_slug: slug,
    p_visitor_id: visitorId,
  });
  if (error) {
    console.warn('[blog] toggle like failed', error.message);
    return { stats: await fetchBlogStats(slug), liked: isPostLikedLocally(slug) };
  }
  const row = (Array.isArray(data) ? data[0] : data) as {
    liked: boolean;
    view_count: number;
    like_count: number;
  } | null;
  const liked = Boolean(row?.liked);
  setPostLikedLocally(slug, liked);
  return {
    liked,
    stats: rowToStats(row),
  };
}

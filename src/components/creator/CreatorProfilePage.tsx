import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { Card, CardContent } from '@/components/ui/card';
import { CreatorProfileHeader } from '@/components/creator/CreatorProfileHeader';
import { ArticleCard } from '@/components/creator/ArticleCard';
import {
  getCreatorProfile,
  type CreatorProfileResponse,
} from '@/lib/paywall/creatorProfileAPI';

export function CreatorProfilePage() {
  const params = useParams();
  const platform = (params.platform ?? '').toLowerCase();
  const handle = (params.handle ?? '').replace(/^@/, '').toLowerCase();

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [data, setData] = useState<CreatorProfileResponse | null>(null);

  const load = useCallback(async () => {
    if (!platform || !handle) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    setNotFound(false);
    try {
      const result = await getCreatorProfile(platform, handle);
      if ('status' in result && result.status === 'not_found') {
        setNotFound(true);
        setData(null);
        return;
      }
      setData(result as CreatorProfileResponse);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, [platform, handle]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return <p className="py-12 text-center text-muted-foreground">Loading profile…</p>;
  }

  if (notFound || !data) {
    return <p className="py-12 text-center text-muted-foreground">Creator not found.</p>;
  }

  return (
    <div className="space-y-4">
      <Card className="bg-white shadow-circle-card rounded-2xl backdrop-blur-sm border-0 overflow-hidden">
        <CardContent className="p-0">
          <CreatorProfileHeader profile={data.profile} articleCount={data.articles.length} />
        </CardContent>
      </Card>

      {data.articles.length === 0 ? (
        <Card className="bg-white shadow-circle-card rounded-2xl backdrop-blur-sm border-0">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No published articles yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {data.articles.map((article) => (
            <ArticleCard key={article.slug} article={article} />
          ))}
        </div>
      )}
    </div>
  );
}

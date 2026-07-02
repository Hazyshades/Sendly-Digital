import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreatorComposer } from '@/components/creator/CreatorComposer';
import {
  createPaywall,
  getCreatorPaywallPublicPath,
  MIN_PAYWALL_PRICE_USDC,
} from '@/lib/paywall/creatorPaywallAPI';
import { upsertCreatorProfile, getCreatorProfilePath } from '@/lib/paywall/creatorProfileAPI';
import { slugifyTitle } from '@/lib/paywall/contentTeaser';
import { getStoredGithubAccessToken } from '@/lib/paywall/githubSession';
import { useCreatorIdentity } from '@/hooks/useCreatorIdentity';

export function CreatorWritePage() {
  const navigate = useNavigate();
  const { identity, loading: identityLoading, isZkHost } = useCreatorIdentity();

  const [slug, setSlug] = useState('');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [priceUsdc, setPriceUsdc] = useState(String(MIN_PAYWALL_PRICE_USDC));
  const [title, setTitle] = useState('');
  const [contentBody, setContentBody] = useState('');
  const [loading, setLoading] = useState(false);

  const handle = identity?.handle ?? '';

  useEffect(() => {
    if (handle && !slug) setSlug(`${handle}/`);
  }, [handle, slug]);

  const handleTitleChange = useCallback(
    (value: string) => {
      setTitle(value);
      if (!slugManuallyEdited && handle) {
        const part = slugifyTitle(value);
        setSlug(part ? `${handle}/${part}` : `${handle}/`);
      }
    },
    [slugManuallyEdited, handle],
  );

  const handleSlugChange = (value: string) => {
    setSlugManuallyEdited(true);
    setSlug(value);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identity) {
      toast.error('Connect a social account first');
      return;
    }
    const price = parseFloat(priceUsdc);
    if (!Number.isFinite(price) || price < MIN_PAYWALL_PRICE_USDC) {
      toast.error(`Minimum price is ${MIN_PAYWALL_PRICE_USDC} USDC`);
      return;
    }

    const githubAccessToken =
      identity.platform === 'github' ? getStoredGithubAccessToken() ?? undefined : undefined;

    setLoading(true);
    try {
      await upsertCreatorProfile({
        platform: identity.platform,
        handle: identity.handle,
        displayName: identity.displayName,
        githubAccessToken,
      }).catch(() => undefined);

      const result = await createPaywall({
        platform: identity.platform,
        githubAccessToken,
        slug: slug.trim(),
        handle: identity.handle,
        priceUsdc: price,
        title: title.trim(),
        contentBody,
      });

      toast.success('Published', {
        description: 'View your profile',
        action: {
          label: 'Profile',
          onClick: () => navigate(getCreatorProfilePath(identity.platform, identity.handle)),
        },
      });
      navigate(getCreatorPaywallPublicPath(result.paywall.slug));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to publish';
      toast.error(
        message.includes('409') || message.toLowerCase().includes('slug')
          ? 'This link is already taken — choose another slug'
          : message,
      );
    } finally {
      setLoading(false);
    }
  };

  if (!isZkHost) {
    return (
      <Card className="bg-white shadow-circle-card rounded-2xl backdrop-blur-sm border-0">
        <CardHeader>
          <CardTitle>zk host required</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Creator Studio is available on the zk domain (e.g. zk.localhost).
          </p>
        </CardContent>
      </Card>
    );
  }

  if (identityLoading) {
    return <p className="py-12 text-center text-muted-foreground">Loading identity…</p>;
  }

  if (!identity) {
    return (
      <Card className="bg-white shadow-circle-card rounded-2xl backdrop-blur-sm border-0 max-w-lg mx-auto">
        <CardHeader>
          <CardTitle>Connect a social account to publish</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Link your social identity to write paid articles. Readers pay in USDC on Arc; funds are
            reserved to your @handle via ZkSend.
          </p>
          <Button asChild>
            <Link to="/creator">Connect identity</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <CreatorComposer
      platform={identity.platform}
      handleLabel={identity.handle}
      title={title}
      contentBody={contentBody}
      slug={slug}
      priceUsdc={priceUsdc}
      loading={loading}
      onTitleChange={handleTitleChange}
      onContentChange={setContentBody}
      onSlugChange={handleSlugChange}
      onPriceChange={setPriceUsdc}
      onSubmit={onSubmit}
    />
  );
}

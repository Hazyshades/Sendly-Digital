import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Github } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreatorComposer } from '@/components/creator/CreatorComposer';
import { connectGithub } from '@/components/zksend/Oauth/github';
import {
  createPaywall,
  getCreatorPaywallPublicPath,
  MIN_PAYWALL_PRICE_USDC,
} from '@/lib/paywall/creatorPaywallAPI';
import { slugifyTitle } from '@/lib/paywall/contentTeaser';
import {
  fetchGithubSessionUser,
  getStoredGithubAccessToken,
  type GithubSessionUser,
} from '@/lib/paywall/githubSession';
import { isZkHost } from '@/lib/runtime/zkHost';

export function CreatorWritePage() {
  const navigate = useNavigate();
  const [githubToken, setGithubToken] = useState<string | null>(() => getStoredGithubAccessToken());
  const [githubUser, setGithubUser] = useState<GithubSessionUser | null>(null);
  const [connectingGithub, setConnectingGithub] = useState(false);
  const [loadingSession, setLoadingSession] = useState(true);
  const [slug, setSlug] = useState('');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [priceUsdc, setPriceUsdc] = useState(String(MIN_PAYWALL_PRICE_USDC));
  const [title, setTitle] = useState('');
  const [contentBody, setContentBody] = useState('');
  const [loading, setLoading] = useState(false);
  const loginRef = useRef<string | null>(null);

  const refreshGithubSession = useCallback(async (token: string | null) => {
    setLoadingSession(true);
    if (!token) {
      setGithubUser(null);
      loginRef.current = null;
      setLoadingSession(false);
      return;
    }
    const user = await fetchGithubSessionUser(token);
    setGithubUser(user);
    if (user) {
      loginRef.current = user.login;
      setSlug((prev) => (prev ? prev : `${user.login}/`));
    }
    setLoadingSession(false);
  }, []);

  useEffect(() => {
    void refreshGithubSession(githubToken);
  }, [githubToken, refreshGithubSession]);

  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (!slugManuallyEdited && loginRef.current) {
      const part = slugifyTitle(value);
      setSlug(part ? `${loginRef.current}/${part}` : `${loginRef.current}/`);
    }
  };

  const handleSlugChange = (value: string) => {
    setSlugManuallyEdited(true);
    setSlug(value);
  };

  const handleConnectGithub = async () => {
    setConnectingGithub(true);
    try {
      const token = await connectGithub();
      if (token) {
        setGithubToken(token);
        await refreshGithubSession(token);
      }
    } finally {
      setConnectingGithub(false);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!githubToken || !githubUser) {
      toast.error('Connect GitHub first');
      return;
    }
    const price = parseFloat(priceUsdc);
    if (!Number.isFinite(price) || price < MIN_PAYWALL_PRICE_USDC) {
      toast.error(`Minimum price is ${MIN_PAYWALL_PRICE_USDC} USDC`);
      return;
    }

    setLoading(true);
    try {
      const result = await createPaywall({
        githubAccessToken: githubToken,
        slug: slug.trim(),
        handle: githubUser.login,
        priceUsdc: price,
        title: title.trim(),
        contentBody,
      });
      const path = getCreatorPaywallPublicPath(result.paywall.slug);
      toast.success('Published');
      navigate(path);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to publish';
      toast.error(message.includes('409') || message.toLowerCase().includes('slug') ? 'This link is already taken — choose another slug' : message);
    } finally {
      setLoading(false);
    }
  };

  if (!isZkHost()) {
    return (
      <Card className="bg-white shadow-circle-card rounded-2xl backdrop-blur-sm border-0">
        <CardHeader>
          <CardTitle>zk host required</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Creator Studio is available on the zk domain (e.g. zk.localhost) with GitHub OAuth.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (loadingSession) {
    return <p className="py-12 text-center text-muted-foreground">Loading GitHub session…</p>;
  }

  if (!githubUser) {
    return (
      <Card className="bg-white shadow-circle-card rounded-2xl backdrop-blur-sm border-0 max-w-lg mx-auto">
        <CardHeader>
          <CardTitle>Connect GitHub to publish</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Sign in with GitHub to write paid articles. Readers pay in USDC on Arc; you receive funds via ZkSend.
          </p>
          <Button onClick={handleConnectGithub} disabled={connectingGithub}>
            <Github className="mr-2 h-4 w-4" />
            {connectingGithub ? 'Connecting…' : 'Connect GitHub'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <CreatorComposer
      githubLogin={githubUser.login}
      title={title}
      contentBody={contentBody}
      slug={slug}
      priceUsdc={priceUsdc}
      loading={loading}
      connectingGithub={connectingGithub}
      onTitleChange={handleTitleChange}
      onContentChange={setContentBody}
      onSlugChange={handleSlugChange}
      onPriceChange={setPriceUsdc}
      onReconnectGithub={handleConnectGithub}
      onSubmit={onSubmit}
    />
  );
}

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Github } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { connectGithub } from '@/components/zksend/Oauth/github';
import {
  createPaywall,
  getCreatorPaywallPublicPath,
  MIN_PAYWALL_PRICE_USDC,
} from '@/lib/paywall/creatorPaywallAPI';
import {
  fetchGithubSessionUser,
  getStoredGithubAccessToken,
  type GithubSessionUser,
} from '@/lib/paywall/githubSession';
import { isZkHost } from '@/lib/runtime/zkHost';

export function CreatePaywallForm() {
  const [githubToken, setGithubToken] = useState<string | null>(() => getStoredGithubAccessToken());
  const [githubUser, setGithubUser] = useState<GithubSessionUser | null>(null);
  const [connectingGithub, setConnectingGithub] = useState(false);
  const [loadingSession, setLoadingSession] = useState(true);
  const [slug, setSlug] = useState('');
  const [priceUsdc, setPriceUsdc] = useState(String(MIN_PAYWALL_PRICE_USDC));
  const [title, setTitle] = useState('');
  const [contentBody, setContentBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [createdPath, setCreatedPath] = useState<string | null>(null);

  const refreshGithubSession = useCallback(async (token: string | null) => {
    setLoadingSession(true);
    if (!token) {
      setGithubUser(null);
      setLoadingSession(false);
      return;
    }
    const user = await fetchGithubSessionUser(token);
    setGithubUser(user);
    if (user) {
      setSlug((prev) => (prev ? prev : `${user.login}/`));
    }
    setLoadingSession(false);
  }, []);

  useEffect(() => {
    void refreshGithubSession(githubToken);
  }, [githubToken, refreshGithubSession]);

  if (!isZkHost()) {
    return (
      <Card className="max-w-lg mx-auto">
        <CardHeader>
          <CardTitle>zk host required</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Create paywall is available on the zk domain (e.g. zk.localhost) with GitHub OAuth.
          </p>
        </CardContent>
      </Card>
    );
  }

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

  const githubLogin = githubUser?.login ?? null;

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
      setCreatedPath(path);
      toast.success('Paywall created');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create paywall');
    } finally {
      setLoading(false);
    }
  };

  if (loadingSession) {
    return <p className="p-6 text-muted-foreground">Loading GitHub session…</p>;
  }

  if (createdPath) {
    return (
      <Card className="max-w-lg mx-auto">
        <CardHeader>
          <CardTitle>Paywall ready</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm">
            Public link:{' '}
            <Link className="text-primary underline" to={createdPath}>
              {createdPath}
            </Link>
          </p>
          <Button asChild>
            <Link to={createdPath}>Open paywall</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!githubUser) {
    return (
      <Card className="max-w-lg mx-auto">
        <CardHeader>
          <CardTitle>Connect GitHub</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Paywalls are created on the zk host. Connect your GitHub account (same flow as Payments → Claim).
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
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Create Social x402 Paywall</CardTitle>
        <p className="text-sm text-muted-foreground">
          Payments settle to <strong>github:{githubLogin}</strong> via ZkSend on Arc USDC (min ${MIN_PAYWALL_PRICE_USDC}).
        </p>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="flex items-center gap-2 text-sm">
            <Github className="h-4 w-4" />
            <span>@{githubLogin}</span>
            <Button type="button" variant="ghost" size="sm" onClick={handleConnectGithub} disabled={connectingGithub}>
              Reconnect
            </Button>
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">URL slug</Label>
            <Input
              id="slug"
              placeholder={`${githubLogin}/my-article`}
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="price">Price (USDC)</Label>
            <Input
              id="price"
              type="number"
              min={MIN_PAYWALL_PRICE_USDC}
              step="0.01"
              value={priceUsdc}
              onChange={(e) => setPriceUsdc(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="content">Content</Label>
            <Textarea
              id="content"
              rows={8}
              value={contentBody}
              onChange={(e) => setContentBody(e.target.value)}
              required
            />
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? 'Creating…' : 'Create paywall'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

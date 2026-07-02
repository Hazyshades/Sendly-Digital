import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useChainId } from 'wagmi';
import { PenLine } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CreatorProfileHeader } from '@/components/creator/CreatorProfileHeader';
import { ArticleCard } from '@/components/creator/ArticleCard';
import { ZkSocialConnectionsPanel } from '@/components/zk-accounts/ZkSocialConnectionsPanel';
import { PendingPayments } from '@/components/zksend/PendingPayments';
import type { SendRecipientType } from '@/components/zksend/ZkSendPanel';
import type { WalletSource } from '@/components/zksend/WalletSourceToggle';
import { useCreatorIdentity } from '@/hooks/useCreatorIdentity';
import { useCircleWallet } from '@/hooks/useCircleWallet';
import { getStoredGithubAccessToken } from '@/lib/paywall/githubSession';
import {
  getCreatorProfile,
  getCreatorProfilePath,
  upsertCreatorProfile,
  type CreatorProfileResponse,
} from '@/lib/paywall/creatorProfileAPI';
import { ARC_CHAIN_ID, BASE_SEPOLIA_CHAIN_ID, TEMPO_CHAIN_ID } from '@/lib/web3/constants';

const CLAIM_PLATFORMS = new Set<SendRecipientType>([
  'twitter',
  'twitch',
  'github',
  'telegram',
  'gmail',
  'linkedin',
  'instagram',
]);

function toClaimPlatform(platform: string): SendRecipientType | null {
  const normalized = platform.toLowerCase();
  return CLAIM_PLATFORMS.has(normalized as SendRecipientType)
    ? (normalized as SendRecipientType)
    : null;
}

export function MyCreatorPage() {
  const { identity, loading: identityLoading, isZkHost } = useCreatorIdentity();
  const { developerWallet, hasDeveloperWallet } = useCircleWallet();
  const connectedChainId = useChainId();
  const activeChainId = connectedChainId || ARC_CHAIN_ID;
  const isInternalWalletDisabled =
    activeChainId === BASE_SEPOLIA_CHAIN_ID || activeChainId === TEMPO_CHAIN_ID;
  const canUseInternalWallet = hasDeveloperWallet && !isInternalWalletDisabled;

  const [walletSource, setWalletSource] = useState<WalletSource>('external');
  const [data, setData] = useState<CreatorProfileResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const platform = identity?.platform ?? '';
  const handle = identity?.handle ?? '';
  const displayName = identity?.displayName ?? '';
  const claimPlatform = useMemo(() => toClaimPlatform(platform), [platform]);

  useEffect(() => {
    if (!platform || !handle) return;

    let cancelled = false;
    setLoading(true);

    void (async () => {
      try {
        await upsertCreatorProfile({
          platform,
          handle,
          displayName,
          githubAccessToken:
            platform === 'github' ? getStoredGithubAccessToken() ?? undefined : undefined,
        });
        const result = await getCreatorProfile(platform, handle);
        if (!cancelled && !('status' in result)) {
          setData(result as CreatorProfileResponse);
        }
      } catch {
        // Profile ensure/load is best-effort; UI still shows write CTA
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [platform, handle, displayName]);

  if (!isZkHost) {
    return (
      <Card className="bg-white shadow-circle-card rounded-2xl backdrop-blur-sm border-0">
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Creator Studio is available on the zk domain (e.g. zk.localhost).
        </CardContent>
      </Card>
    );
  }

  if (identityLoading) {
    return <p className="py-12 text-center text-muted-foreground">Loading identity…</p>;
  }

  if (!identity) {
    return (
      <div className="space-y-4">
        <Card className="bg-white shadow-circle-card rounded-2xl backdrop-blur-sm border-0">
          <CardContent className="p-6 text-center space-y-1">
            <h1 className="text-xl font-semibold text-gray-900">Start your creator profile</h1>
            <p className="text-sm text-muted-foreground">
              Create Wallet and Receive payments to your social usernames.
            </p>
          </CardContent>
        </Card>
        <ZkSocialConnectionsPanel embedded />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="bg-white shadow-circle-card rounded-2xl backdrop-blur-sm border-0 overflow-hidden">
        <CardContent className="p-0">
          {data ? (
            <CreatorProfileHeader profile={data.profile} articleCount={data.articles.length} />
          ) : (
            <div className="p-6">
              <h1 className="text-2xl font-semibold text-gray-900">@{identity.handle}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{identity.platform}</p>
            </div>
          )}
          <div className="flex flex-wrap gap-2 px-6 pb-6">
            <Button asChild>
              <Link to="/creator/write">
                <PenLine className="mr-2 h-4 w-4" />
                Write article
              </Link>
            </Button>
            <Button asChild variant="ghost">
              <Link to={getCreatorProfilePath(identity.platform, identity.handle)}>
                View public profile
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {claimPlatform ? (
        <PendingPayments
          platform={claimPlatform}
          username={identity.handle}
          isActive
          isIdentityValid
          title="Earnings"
          walletSource={walletSource}
          onWalletSourceChange={setWalletSource}
          developerWallet={developerWallet}
          hasDeveloperWallet={canUseInternalWallet}
        />
      ) : null}

      {loading ? (
        <p className="py-6 text-center text-muted-foreground">Loading articles…</p>
      ) : data && data.articles.length > 0 ? (
        <div className="space-y-3">
          {data.articles.map((article) => (
            <ArticleCard key={article.slug} article={article} />
          ))}
        </div>
      ) : (
        <Card className="bg-white shadow-circle-card rounded-2xl backdrop-blur-sm border-0">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No published articles yet. Write your first one.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

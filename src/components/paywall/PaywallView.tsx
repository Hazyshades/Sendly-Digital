import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { toast } from 'sonner';

import { PaywallArticleView } from '@/components/paywall/PaywallArticleView';
import { useCircleWallet } from '@/hooks/useCircleWallet';
import { usePrivySafe } from '@/lib/privy/usePrivySafe';
import { useZkOAuthIdentity, buildZkOAuthPrivyUserId } from '@/lib/zk-oauth';
import {
  fetchPaywall,
  type PaywallPaymentInstructions,
  type PaywallUnlockedResponse,
} from '@/lib/paywall/creatorPaywallAPI';
import { payPaywallViaDeveloperWallet } from '@/lib/paywall/paywallPayment';
import { getStoredEntitlement, storeEntitlement } from '@/lib/paywall/paywallEntitlements';
import { getStoredGithubAccessToken } from '@/lib/paywall/githubSession';
import { buildOwnerOAuthProof } from '@/lib/paywall/ownerOAuthProof';

export function PaywallView() {
  const params = useParams();
  const slug = (params['*'] ?? params.slug ?? '').replace(/^\/+/, '');
  const { address } = useAccount();
  const { user: privyUser } = usePrivySafe();
  const { identity: zkOAuthIdentity } = useZkOAuthIdentity();
  const { developerWallet, hasDeveloperWallet, checkingWallet } = useCircleWallet();

  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [instructions, setInstructions] = useState<PaywallPaymentInstructions | null>(null);
  const [unlocked, setUnlocked] = useState<PaywallUnlockedResponse | null>(null);
  const [notFound, setNotFound] = useState(false);

  const loadPaywall = useCallback(
    async (proof?: { paymentId: string; txHash: string }) => {
      if (!slug) return;
      setLoading(true);
      setNotFound(false);
      try {
        const stored = proof ?? getStoredEntitlement(slug) ?? undefined;
        const githubAccessToken = getStoredGithubAccessToken() ?? undefined;
        const ownerProof = buildOwnerOAuthProof(zkOAuthIdentity);
        const result = await fetchPaywall(slug, {
          ...stored,
          githubAccessToken,
          ...ownerProof,
        });
        if (result.status === 'not_found') {
          setNotFound(true);
          setInstructions(null);
          setUnlocked(null);
          return;
        }
        if (result.status === 'unlocked') {
          setUnlocked(result.data);
          setInstructions(null);
          return;
        }
        setInstructions(result.instructions);
        setUnlocked(null);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to load paywall');
      } finally {
        setLoading(false);
      }
    },
    [slug, zkOAuthIdentity],
  );

  useEffect(() => {
    void loadPaywall();
  }, [loadPaywall]);

  const onPay = async () => {
    if (!instructions) return;
    if (!hasDeveloperWallet || !developerWallet) {
      toast.error('Internal Circle wallet required. Open Dashboard to create one.');
      return;
    }
    setPaying(true);
    try {
      const { paymentId, txHash } = await payPaywallViaDeveloperWallet({
        instructions,
        developerWallet,
        connectedAddress: address,
        privyUserId:
          privyUser?.id ??
          (zkOAuthIdentity
            ? buildZkOAuthPrivyUserId(zkOAuthIdentity.platform, zkOAuthIdentity.socialUserId)
            : undefined),
      });
      const result = await fetchPaywall(slug, { paymentId, txHash, source: 'human' });
      if (result.status === 'unlocked') {
        storeEntitlement(slug, { paymentId, txHash });
        setUnlocked(result.data);
        setInstructions(null);
        toast.success('Content unlocked');
      } else {
        toast.error('Payment sent but unlock failed - retry with payment proof');
        await loadPaywall({ paymentId, txHash });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Payment failed');
    } finally {
      setPaying(false);
    }
  };

  if (!slug) {
    return <p className="py-12 text-center text-muted-foreground">Missing article link.</p>;
  }

  return (
    <PaywallArticleView
      loading={loading}
      notFound={notFound}
      paying={paying}
      checkingWallet={checkingWallet}
      hasDeveloperWallet={hasDeveloperWallet}
      instructions={instructions}
      unlocked={unlocked}
      onPay={onPay}
    />
  );
}

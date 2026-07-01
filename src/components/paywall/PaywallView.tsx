import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { toast } from 'sonner';
import { Lock, Unlock } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCircleWallet } from '@/hooks/useCircleWallet';
import { usePrivySafe } from '@/lib/privy/usePrivySafe';
import {
  fetchPaywall,
  type PaywallPaymentInstructions,
  type PaywallUnlockedResponse,
} from '@/lib/paywall/creatorPaywallAPI';
import { payPaywallViaDeveloperWallet } from '@/lib/paywall/paywallPayment';
import { ARC_CHAIN_ID, getExplorerTxUrl } from '@/lib/web3/constants';

export function PaywallView() {
  const params = useParams();
  const slug = (params['*'] ?? params.slug ?? '').replace(/^\/+/, '');
  const { address } = useAccount();
  const { user: privyUser } = usePrivySafe();
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
        const result = await fetchPaywall(slug, proof);
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
    [slug],
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
        privyUserId: privyUser?.id,
      });
      const result = await fetchPaywall(slug, { paymentId, txHash, source: 'human' });
      if (result.status === 'unlocked') {
        setUnlocked(result.data);
        setInstructions(null);
        toast.success('Content unlocked');
      } else {
        toast.error('Payment sent but unlock failed — retry with payment proof');
        await loadPaywall({ paymentId, txHash });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Payment failed');
    } finally {
      setPaying(false);
    }
  };

  if (!slug) {
    return <p className="p-6 text-muted-foreground">Missing paywall slug.</p>;
  }

  if (loading) {
    return <p className="p-6 text-muted-foreground">Loading paywall…</p>;
  }

  if (notFound) {
    return <p className="p-6 text-muted-foreground">Paywall not found.</p>;
  }

  if (unlocked) {
    return (
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Unlock className="h-5 w-5 text-green-600" />
            {unlocked.title}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Paid to github:{unlocked.recipient.handle} · payment #{unlocked.paymentId}
            {unlocked.txHash ? (
              <>
                {' '}
                ·{' '}
                <a
                  href={getExplorerTxUrl(ARC_CHAIN_ID, unlocked.txHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  tx
                </a>
              </>
            ) : null}
          </p>
        </CardHeader>
        <CardContent>
          <pre className="whitespace-pre-wrap text-sm font-sans">{unlocked.contentBody}</pre>
        </CardContent>
      </Card>
    );
  }

  if (!instructions) {
    return <p className="p-6 text-muted-foreground">Unable to load paywall.</p>;
  }

  return (
    <Card className="max-w-lg mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="h-5 w-5" />
          {instructions.title}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Pay <strong>{instructions.priceUsdc} USDC</strong> on Arc to{' '}
          <strong>github:{instructions.recipient.handle}</strong>
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Settlement via ZkSend — creator receives funds after social claim. HTTP 402 social paywall.
        </p>
        <Button
          onClick={onPay}
          disabled={paying || checkingWallet || !hasDeveloperWallet}
          className="w-full"
        >
          {paying ? 'Paying…' : `Pay ${instructions.priceUsdc} USDC & unlock`}
        </Button>
        {!hasDeveloperWallet && !checkingWallet ? (
          <p className="text-xs text-amber-700">
            Create an Internal Wallet on Dashboard to pay on Arc testnet.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

import { useMemo, useState } from 'react';
import { useAccount, useWalletClient } from 'wagmi';
import { toast } from 'sonner';

import { ReclaimProofRequest, type Proof } from '@reclaimprotocol/js-sdk';

import web3Service from '../../utils/web3/web3Service';
import { generateSocialIdentityHash } from '../../utils/reclaim/identity';
import { fetchReclaimProofRequestConfig, verifyReclaimProofs } from '../../utils/reclaim/api';
import { toOnchainReclaimProof } from '../../utils/reclaim/onchain';
import type { ReclaimProof } from '../../utils/reclaim/types';

import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

type PaymentRow = {
  paymentId: string;
  sender: string;
  platform: string;
  amount: string;
  token: string;
  claimed: boolean;
  createdAt: number;
};

export function PendingPayments() {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();

  const [platform, setPlatform] = useState<'twitter' | 'telegram' | 'instagram' | 'tiktok'>('twitter');
  const [username, setUsername] = useState('');

  const identityHash = useMemo(() => {
    const u = username.replace(/^@/, '').trim();
    if (!u) return null;
    return generateSocialIdentityHash(platform, u);
  }, [platform, username]);

  const [loadingList, setLoadingList] = useState(false);
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const loadPending = async () => {
    try {
      if (!identityHash) throw new Error('Enter username');
      setLoadingList(true);

      const ids = await web3Service.getZkSendPendingPayments(identityHash);
      const payments = await Promise.all(ids.map((id) => web3Service.getZkSendPayment(id)));
      setRows(
        payments.map((p) => ({
          paymentId: p.paymentId,
          sender: p.sender,
          platform: p.platform,
          amount: p.amount,
          token: p.token,
          claimed: p.claimed,
          createdAt: p.createdAt,
        }))
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load pending payments';
      console.error('[zkSEND] loadPending error:', e);
      toast.error(msg);
    } finally {
      setLoadingList(false);
    }
  };

  const claim = async (paymentId: string) => {
    try {
      if (!isConnected || !address || !walletClient) {
        throw new Error('Connect wallet to claim payment');
      }
      const u = username.replace(/^@/, '').trim();
      if (!u) throw new Error('Enter username');

      setClaimingId(paymentId);
      await web3Service.initialize(walletClient, address);

      // Build proof request config on backend (keeps appSecret safe)
      const reclaimProofRequestConfig = await fetchReclaimProofRequestConfig({
        platform,
        username: u,
        paymentId,
        recipient: address,
        // Optional: if you want mobile redirect flow, set a redirect url here:
        // redirectUrl: `${window.location.origin}/reclaim/callback?paymentId=${paymentId}`,
      });

      const reclaimProofRequest = await ReclaimProofRequest.fromJsonString(reclaimProofRequestConfig);

      // Trigger UI (QR / extension / app clip)
      await reclaimProofRequest.triggerReclaimFlow();

      await reclaimProofRequest.startSession({
        onSuccess: async (proof: string | Proof | Proof[] | undefined) => {
          try {
            if (!proof) {
              throw new Error('No proof received from Reclaim');
            }

            // Normalize proof to array format and convert to ReclaimProof
            const normalizeProof = (p: string | Proof | Proof[]): ReclaimProof[] => {
              if (Array.isArray(p)) {
                return p as ReclaimProof[];
              }
              if (typeof p === 'string') {
                const parsed = JSON.parse(p);
                return Array.isArray(parsed) ? parsed : [parsed];
              }
              return [p as ReclaimProof];
            };

            const proofsArray = normalizeProof(proof);

            console.log('[zkSEND] Received proofs:', JSON.stringify(proofsArray, null, 2));
            console.log('[zkSEND] First proof structure:', JSON.stringify(proofsArray[0], null, 2));
            
            const verify = await verifyReclaimProofs(proofsArray);
            if (!verify.isValid) {
              throw new Error('Reclaim proof verification failed (backend)');
            }

            const onchainProof = toOnchainReclaimProof(proofsArray[0]);
            const txHash = await web3Service.claimZkSendPayment({
              paymentId,
              proof: onchainProof,
              recipient: address as `0x${string}`,
            });

            toast.success(`Payment claimed. TX: ${txHash.slice(0, 10)}...`);
            await loadPending();
          } catch (err) {
            console.error('[zkSEND] claim onSuccess error:', err);
            toast.error(err instanceof Error ? err.message : 'Claim failed');
          } finally {
            setClaimingId(null);
          }
        },
        onError: (err: any) => {
          console.error('[zkSEND] reclaim startSession error:', err);
          toast.error(err?.message || 'Reclaim flow error');
          setClaimingId(null);
        },
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to claim payment';
      console.error('[zkSEND] claim error:', e);
      toast.error(msg);
      setClaimingId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pending payments</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Platform</Label>
            <Select value={platform} onValueChange={(v) => setPlatform(v as any)}>
              <SelectTrigger>
                <SelectValue placeholder="Select platform" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="twitter">Twitter / X</SelectItem>
                <SelectItem value="telegram">Telegram</SelectItem>
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="tiktok">TikTok</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Username</Label>
            <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="@username" />
          </div>
        </div>

        <Button onClick={loadPending} disabled={loadingList}>
          {loadingList ? 'Loading...' : 'Show Pending Payments'}
        </Button>

        {rows.length === 0 ? (
          <div className="text-sm text-muted-foreground">No pending payments (or not loaded yet).</div>
        ) : (
          <div className="space-y-2">
            {rows.map((p) => (
              <div
                key={p.paymentId}
                className="flex flex-col gap-2 rounded-lg border p-3 md:flex-row md:items-center md:justify-between"
              >
                <div className="space-y-1">
                  <div className="text-sm font-medium">paymentId: {p.paymentId}</div>
                  <div className="text-xs text-muted-foreground">
                    from: {p.sender} · amount: {p.amount} · token: {p.token}
                  </div>
                </div>
                <Button
                  variant="secondary"
                  onClick={() => claim(p.paymentId)}
                  disabled={claimingId === p.paymentId}
                >
                  {claimingId === p.paymentId ? 'Claiming...' : 'Claim via Reclaim'}
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}


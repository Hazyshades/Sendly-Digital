import { useMemo, useState } from 'react';
import { useAccount, useWalletClient } from 'wagmi';
import { toast } from 'sonner';

import web3Service from '../../utils/web3/web3Service';
import {
  generateSocialIdentityHash,
  normalizeSocialPlatform,
  normalizeSocialUsername,
} from '../../utils/reclaim/identity';
import { createZkSendPaymentRecord } from '../../utils/zksend/zksendPaymentsAPI';

import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { ToggleGroup, ToggleGroupItem } from '../ui/toggle-group';

import type { ZkSendPlatform } from './ZkSendPanel';

type Props = {
  platform: ZkSendPlatform;
  onPlatformChange: (platform: ZkSendPlatform) => void;
  username: string;
  onUsernameChange: (username: string) => void;
  onGoToPending?: () => void;
};

export function SendPaymentForm({ platform, onPlatformChange, username, onUsernameChange, onGoToPending }: Props) {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();

  const [amount, setAmount] = useState('');
  const [tokenType, setTokenType] = useState<'USDC' | 'EURC'>('USDC');
  const [loading, setLoading] = useState(false);

  const normalizedUsername = useMemo(() => normalizeSocialUsername(username.replace(/^@/, '')), [username]);
  const normalizedPlatform = useMemo(() => normalizeSocialPlatform(platform), [platform]);

  const onSubmit = async () => {
    try {
      if (!isConnected || !address || !walletClient) {
        throw new Error('Connect wallet to create payment');
      }
      if (!normalizedUsername) throw new Error('Enter username');
      if (!amount || Number(amount) <= 0) throw new Error('Enter amount > 0');

      setLoading(true);
      await web3Service.initialize(walletClient, address);

      if (!normalizedPlatform) throw new Error('Unsupported platform');
      const socialIdentityHash = generateSocialIdentityHash(normalizedPlatform, normalizedUsername);
      if (!socialIdentityHash) throw new Error('Invalid social identity');
      const { paymentId, txHash } = await web3Service.createZkSendPayment({
        socialIdentityHash,
        platform: normalizedPlatform,
        amount,
        tokenType,
      });

      if (paymentId) {
        try {
          await createZkSendPaymentRecord({
            paymentId,
            senderAddress: address,
            recipientIdentityHash: socialIdentityHash,
            platform: normalizedPlatform,
            amount,
            currency: tokenType,
            txHash,
          });
        } catch (dbError) {
          console.warn('[zkSEND] Failed to store payment in DB:', dbError);
        }
      } else {
        console.warn('[zkSEND] Payment created without paymentId; DB record was not stored.');
      }

      toast.success(
        paymentId ? `Payment created. paymentId=${paymentId}` : `Payment created. TX: ${txHash.slice(0, 10)}...`
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to create payment';
      console.error('[zkSEND] createPayment error:', e);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create payment</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label>Amount</Label>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                inputMode="decimal"
                placeholder="0.00"
                aria-label="Amount"
                className="sm:flex-1"
              />
              <ToggleGroup
                type="single"
                value={tokenType}
                onValueChange={(v) => (v ? setTokenType(v as 'USDC' | 'EURC') : null)}
                variant="outline"
                className="w-full sm:w-[220px]"
                aria-label="Token"
              >
                <ToggleGroupItem value="USDC" aria-label="USDC">
                  USDC
                </ToggleGroupItem>
                <ToggleGroupItem value="EURC" aria-label="EURC">
                  EURC
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
            <div className="text-xs text-muted-foreground">Example: 10 {tokenType}</div>
          </div>

          <div className="space-y-2">
            <Label>Platform</Label>
            <Select value={platform} onValueChange={(v) => onPlatformChange(v as ZkSendPlatform)}>
              <SelectTrigger aria-label="Platform">
                <SelectValue placeholder="Select platform" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="twitter">Twitter / X</SelectItem>
                <SelectItem value="twitch">Twitch</SelectItem>
                <SelectItem value="github">GitHub</SelectItem>
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="tiktok">TikTok</SelectItem>
                <SelectItem value="gmail">Gmail</SelectItem>
                <SelectItem value="linkedin">LinkedIn</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Username</Label>
            <Input
              value={username}
              onChange={(e) => onUsernameChange(e.target.value)}
              placeholder="@username"
              aria-label="Username"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Button
            onClick={onSubmit}
            disabled={loading}
            size="lg"
            className="w-full sm:w-auto bg-emerald-600 text-white hover:bg-emerald-600/90"
          >
            {loading ? 'Creating...' : 'Create payment'}
          </Button>

          {onGoToPending ? (
            <Button type="button" variant="ghost" onClick={onGoToPending} className="w-full sm:w-auto">
              View pending payments
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}


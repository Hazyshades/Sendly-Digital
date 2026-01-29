import { useMemo, useState } from 'react';
import { useAccount, useWalletClient, useBalance } from 'wagmi';
import { toast } from 'sonner';
import { Wallet } from 'lucide-react';

import web3Service from '../../utils/web3/web3Service';
import {
  generateSocialIdentityHash,
  normalizeSocialPlatform,
  normalizeSocialUsername,
} from '../../utils/reclaim/identity';
import { createZkSendPaymentRecord } from '../../utils/zksend/zksendPaymentsAPI';
import { USDC_ADDRESS, EURC_ADDRESS } from '../../utils/web3/constants';

import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { PlatformUsernameInput } from './PlatformUsernameInput';

import type { ZkSendPlatform } from './ZkSendPanel';

type Props = {
  platform: ZkSendPlatform;
  onPlatformChange: (platform: ZkSendPlatform) => void;
  username: string;
  onUsernameChange: (username: string) => void;
  isIdentityValid: boolean;
  onGoToPending?: () => void;
};

const TOKEN_OPTIONS = [
  { value: 'USDC' as const, label: 'USDC', address: USDC_ADDRESS },
  { value: 'EURC' as const, label: 'EURC', address: EURC_ADDRESS },
] as const;

export function SendPaymentForm({
  platform,
  onPlatformChange,
  username,
  onUsernameChange,
  isIdentityValid,
  onGoToPending,
}: Props) {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();

  const [amount, setAmount] = useState('');
  const [tokenType, setTokenType] = useState<'USDC' | 'EURC'>('USDC');
  const [loading, setLoading] = useState(false);

  const tokenConfig = TOKEN_OPTIONS.find((t) => t.value === tokenType) ?? TOKEN_OPTIONS[0];
  const { data: balance } = useBalance({
    address: address ?? undefined,
    token: tokenConfig.address as `0x${string}`,
  });

  const normalizedUsername = useMemo(() => normalizeSocialUsername(username.replace(/^@/, '')), [username]);
  const normalizedPlatform = useMemo(() => normalizeSocialPlatform(platform), [platform]);

  const balanceFormatted = balance?.formatted ?? '0.00';

  const onSubmit = async () => {
    try {
      if (!isConnected || !address || !walletClient) {
        throw new Error('Connect wallet to send');
      }
      if (!normalizedUsername) throw new Error('Enter recipient');
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
      let msg = 'Failed to send payment';

      if (e instanceof Error) {
        if (e.message.includes('User rejected the request')) {
          msg = 'User rejected the request';
        } else {
          msg = e.message;
        }
      }

      console.error('[zkSEND] createPayment error:', e);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = isIdentityValid && amount && Number(amount) > 0 && isConnected && !!address && !!walletClient;

  return (
    <Card>
      <CardContent className="pt-6 space-y-6">
        {/* Amount */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="amount-input">Amount</Label>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Wallet className="h-4 w-4" aria-hidden />
              <span>{balanceFormatted}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Input
              id="amount-input"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="decimal"
              placeholder="0.00"
              aria-label="Amount"
              className="flex-1"
            />
            <Select
              value={tokenType}
              onValueChange={(v) => setTokenType(v as 'USDC' | 'EURC')}
            >
              <SelectTrigger className="w-[120px] gap-2" aria-label="Token">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TOKEN_OPTIONS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* To */}
        <PlatformUsernameInput
          platform={platform}
          onPlatformChange={onPlatformChange}
          username={username}
          onUsernameChange={onUsernameChange}
          label="To"
          inputId="to-input"
          ariaLabel="Recipient"
        />

        {!isIdentityValid && username.length > 0 && (
          <p className="text-sm text-amber-600 dark:text-amber-500">
            Select a platform above and enter a valid username to send.
          </p>
        )}

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pt-2">
          <Button
            onClick={onSubmit}
            disabled={!canSubmit || loading}
            size="lg"
            className="w-full sm:w-auto bg-emerald-600 text-white hover:bg-emerald-600/90 disabled:opacity-50"
          >
            {loading ? 'Sending...' : 'Send'}
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

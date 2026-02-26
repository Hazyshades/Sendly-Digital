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

const ARC_EXPLORER_URL = import.meta.env.VITE_ARC_BLOCK_EXPLORER_URL || 'https://testnet.arcscan.app';

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

import type { SendRecipientType } from './ZkSendPanel';

type Props = {
  platform: SendRecipientType;
  onPlatformChange: (platform: SendRecipientType) => void;
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
  const normalizedPlatform = useMemo(() => (platform === 'address' ? null : normalizeSocialPlatform(platform)), [platform]);

  const balanceFormatted = balance?.formatted ?? '0.00';

  const onSubmit = async () => {
    try {
      if (!isConnected || !address || !walletClient) {
        throw new Error('Connect wallet to send');
      }
      if (!amount || Number(amount) <= 0) throw new Error('Enter amount > 0');

      setLoading(true);
      await web3Service.initialize(walletClient, address);

      if (platform === 'address') {
        const recipientTrimmed = username.trim();
        if (!/^0x[a-fA-F0-9]{40}$/.test(recipientTrimmed)) throw new Error('Enter a valid recipient address (0x...)');
        const { txHash } = await web3Service.sendDirectToAddress({
          recipient: recipientTrimmed as `0x${string}`,
          amount,
          tokenType,
        });
        if (txHash) {
          toast.success(
            <span>
              Sent successfully.{' '}
              <a
                href={`${ARC_EXPLORER_URL}/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-medium"
              >
                TX: {txHash.slice(0, 10)}...
              </a>
            </span>
          );
        } else {
          toast.success('Sent successfully.');
        }
        return;
      }

      if (!normalizedUsername) throw new Error('Enter recipient');
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
            recipientUsername: username,
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

      if (txHash) {
        toast.success(
          <span>
            Payment created successfully.{' '}
            <a
              href={`${ARC_EXPLORER_URL}/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-medium"
            >
              TX: {txHash.slice(0, 10)}...
            </a>
          </span>
        );
      } else {
        toast.success('Payment created successfully.');
      }
    } catch (e) {
      let msg = 'Failed to send payment';
      let txHash: string | null = null;

      if (e instanceof Error) {
        if (e.message.includes('User rejected the request')) {
          msg = 'User rejected the request';
        } else {
          msg = e.message;
          // Extract transaction hash from error message if present
          const txHashMatch = msg.match(/Transaction hash: (0x[a-fA-F0-9]{64})/i) || 
                              msg.match(/Tx hash: (0x[a-fA-F0-9]{64})/i) ||
                              msg.match(/(0x[a-fA-F0-9]{64})/);
          if (txHashMatch) {
            txHash = txHashMatch[1];
          }
        }
      }

      console.error('[zkSEND] createPayment error:', e);
      
      if (txHash) {
        // Clean up the message by removing the transaction hash part
        const cleanMsg = msg
          .replace(new RegExp(`Transaction hash:?\\s*${txHash}`, 'gi'), '')
          .replace(new RegExp(`Tx hash:?\\s*${txHash}`, 'gi'), '')
          .replace(new RegExp(txHash, 'g'), '')
          .replace(/\s+/g, ' ')
          .trim();
        
        toast.error(
          <span>
            {cleanMsg}{' '}
            <a
              href={`${ARC_EXPLORER_URL}/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-medium"
            >
              TX: {txHash.slice(0, 10)}...
            </a>
          </span>
        );
      } else {
        toast.error(msg);
      }
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
            {platform === 'address'
              ? 'Enter a valid wallet address (0x followed by 40 hex characters).'
              : 'Select a platform above and enter a valid username to send.'}
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

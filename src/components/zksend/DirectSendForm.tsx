import { useState } from 'react';
import { useAccount, useWalletClient, useBalance } from 'wagmi';
import { toast } from 'sonner';
import { Wallet } from 'lucide-react';

import web3Service from '@/lib/web3/web3Service';
import { getExplorerTxUrl } from '@/lib/web3/constants';
import { useChain } from '@/contexts/ChainContext';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';


function isValidAddress(value: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(value.trim());
}

export function DirectSendForm() {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { activeChainId, contracts } = useChain();
  const TOKEN_OPTIONS = [
    { value: 'USDC' as const, label: 'USDC', address: contracts.usdc },
    { value: 'EURC' as const, label: 'EURC', address: contracts.eurc ?? contracts.usdc },
  ] as const;

  const [recipientAddress, setRecipientAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [tokenType, setTokenType] = useState<'USDC' | 'EURC'>('USDC');
  const [loading, setLoading] = useState(false);

  const tokenConfig = TOKEN_OPTIONS.find((t) => t.value === tokenType) ?? TOKEN_OPTIONS[0];
  const { data: balance } = useBalance({
    address: address ?? undefined,
    token: tokenConfig.address as `0x${string}`,
  });

  const balanceFormatted = balance?.formatted ?? '0.00';
  const recipientTrimmed = recipientAddress.trim();
  const isRecipientValid = isValidAddress(recipientTrimmed);

  const onSubmit = async () => {
    try {
      if (!isConnected || !address || !walletClient) {
        throw new Error('Connect wallet to send');
      }
      if (!isRecipientValid) throw new Error('Enter a valid recipient address (0x...)');
      if (!amount || Number(amount) <= 0) throw new Error('Enter amount > 0');

      setLoading(true);
      await web3Service.initialize(walletClient, address, activeChainId);

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
              href={getExplorerTxUrl(activeChainId, txHash)}
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-medium"
            >
              TX: {txHash.slice(0, 10)}...
            </a>
          </span>
        );
        setAmount('');
        setRecipientAddress('');
      } else {
        toast.success('Sent successfully.');
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to send';
      console.error('[DirectSend] sendToAddress error:', e);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const isDirectSendConfigured =
    DIRECT_SEND_CONTRACT_ADDRESS && DIRECT_SEND_CONTRACT_ADDRESS !== '0x0000000000000000000000000000000000000000';
  const canSubmit =
    isDirectSendConfigured &&
    isRecipientValid &&
    amount &&
    Number(amount) > 0 &&
    isConnected &&
    !!address &&
    !!walletClient;

  return (
    <Card>
      <CardContent className="pt-6 space-y-6">
        {!isDirectSendConfigured && (
          <p className="text-sm text-amber-600 dark:text-amber-500">
            DirectSend is not configured. Set VITE_ARC_DIRECT_SEND_CONTRACT_ADDRESS and deploy the DirectSend contract.
          </p>
        )}

        <div className="space-y-2">
          <Label htmlFor="direct-recipient">Recipient address</Label>
          <Input
            id="direct-recipient"
            value={recipientAddress}
            onChange={(e) => setRecipientAddress(e.target.value)}
            placeholder="0x..."
            aria-label="Recipient wallet address"
            className="font-mono"
          />
          {recipientAddress.length > 0 && !isRecipientValid && (
            <p className="text-sm text-amber-600 dark:text-amber-500">Enter a valid 0x address (40 hex characters).</p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="direct-amount">Amount</Label>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Wallet className="h-4 w-4" aria-hidden />
              <span>{balanceFormatted}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Input
              id="direct-amount"
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

        <p className="text-xs text-muted-foreground">
          A 0.1% fee is charged; the recipient receives the amount you enter.
        </p>

        <Button
          onClick={onSubmit}
          disabled={!canSubmit || loading}
          size="lg"
          className="w-full sm:w-auto bg-emerald-600 text-white hover:bg-emerald-600/90 disabled:opacity-50"
        >
          {loading ? 'Sending...' : 'Send to address'}
        </Button>
      </CardContent>
    </Card>
  );
}

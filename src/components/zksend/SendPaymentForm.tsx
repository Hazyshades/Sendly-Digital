import { useMemo, useState, useEffect } from 'react';
import { useAccount, useWalletClient, useBalance, useChainId } from 'wagmi';
import { toast } from 'sonner';
import { Wallet } from 'lucide-react';
import { createPublicClient, http, parseEventLogs } from 'viem';

import web3Service from '@/lib/web3/web3Service';
import {
  generateSocialIdentityHash,
  normalizeSocialPlatform,
  normalizeSocialUsername,
} from '@/lib/reclaim/identity';
import { createZkSendPaymentRecord } from '@/lib/zksend/zksendPaymentsAPI';
import {
  getExplorerTxUrl,
  getContractsForChain,
  ARC_CHAIN_ID,
  ERC20ABI,
  ZkSendABI,
} from '@/lib/web3/constants';
import { arcTestnet, tempoTestnet } from '@/lib/web3/wagmiConfig';
import { DeveloperWalletService } from '@/lib/circle/developerWalletService';
import { apiCall } from '@/lib/supabase/client';
import { getCircleWalletPrivyUserIdForTx } from '@/hooks/useCircleWallet';
import { usePrivySafe } from '@/lib/privy/usePrivySafe';

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
import { PlatformUsernameInput } from './PlatformUsernameInput';
import { WalletSourceToggle } from './WalletSourceToggle';

import type { SendRecipientType } from './ZkSendPanel';
import type { WalletSource } from './WalletSourceToggle';
import type { DeveloperWallet } from '@/lib/circle/developerWalletService';

export type SendPaymentPreviewValues = {
  amount: string;
  token: SupportedSendToken;
  platform: SendRecipientType;
  username: string;
  balance?: string;
  suggestionLabel?: string;
  profileImageUrl?: string | null;
};

type Props = {
  platform: SendRecipientType;
  onPlatformChange: (platform: SendRecipientType) => void;
  username: string;
  onUsernameChange: (username: string) => void;
  isIdentityValid: boolean;
  onGoToPending?: () => void;
  /** Read-only preview with fixed values (e.g. blog embed). Same look, no disabled styling. */
  preview?: boolean;
  previewValues?: SendPaymentPreviewValues;
  walletSource?: WalletSource;
  onWalletSourceChange?: (value: WalletSource) => void;
  developerWallet?: DeveloperWallet | null;
  hasDeveloperWallet?: boolean;
};

const FEE_BPS = 10n;
const BPS_DENOMINATOR = 10000n;
const DECIMALS = 1_000_000;
type SupportedSendToken = 'USDC' | 'EURC' | 'PATHUSD' | 'ALPHAUSD' | 'BETAUSD' | 'THETAUSD';

function parseAmountToWei(amount: string): bigint {
  return BigInt(Math.floor(parseFloat(amount) * DECIMALS));
}

export function SendPaymentForm({
  platform,
  onPlatformChange,
  username,
  onUsernameChange,
  isIdentityValid,
  onGoToPending,
  preview = false,
  previewValues,
  walletSource = 'external',
  onWalletSourceChange,
  developerWallet = null,
  hasDeveloperWallet = false,
}: Props) {
  const { address, isConnected } = useAccount();
  const connectedChainId = useChainId();
  const { data: walletClient } = useWalletClient();
  const { user: privyUser } = usePrivySafe();
  const activeChainId = connectedChainId || ARC_CHAIN_ID;
  const contracts = getContractsForChain(activeChainId);
  const isTempoNetwork = activeChainId === tempoTestnet.id;
  const TOKEN_OPTIONS = isTempoNetwork
    ? ([
        { value: 'PATHUSD' as const, label: 'pathUSD', address: contracts.pathusd ?? '0x20c0000000000000000000000000000000000000' },
        { value: 'ALPHAUSD' as const, label: 'AlphaUSD', address: contracts.alphausd ?? '0x20c0000000000000000000000000000000000001' },
        { value: 'BETAUSD' as const, label: 'BetaUSD', address: contracts.betausd ?? '0x20c0000000000000000000000000000000000002' },
        { value: 'THETAUSD' as const, label: 'ThetaUSD', address: contracts.thetausd ?? '0x20c0000000000000000000000000000000000003' },
      ] as const)
    : ([
        { value: 'USDC' as const, label: 'USDC', address: contracts.usdc },
        { value: 'EURC' as const, label: 'EURC', address: contracts.eurc ?? contracts.usdc },
      ] as const);

  const [amount, setAmount] = useState(preview && previewValues ? previewValues.amount : '');
  const [tokenType, setTokenType] = useState<SupportedSendToken>(
    preview && previewValues ? previewValues.token : TOKEN_OPTIONS[0].value
  );
  const [loading, setLoading] = useState(false);
  const [circleBalance, setCircleBalance] = useState<string | null>(null);

  const tokenConfig = TOKEN_OPTIONS.find((t) => t.value === tokenType) ?? TOKEN_OPTIONS[0];
  const { data: balance } = useBalance({
    address: address ?? undefined,
    token: tokenConfig.address as `0x${string}`,
  });

  useEffect(() => {
    if (walletSource !== 'circle') return;
    if (!hasDeveloperWallet && onWalletSourceChange) onWalletSourceChange('external');
  }, [walletSource, hasDeveloperWallet, onWalletSourceChange]);

  useEffect(() => {
    if (preview) return;
    if (!TOKEN_OPTIONS.some((t) => t.value === tokenType)) {
      setTokenType(TOKEN_OPTIONS[0].value);
    }
  }, [preview, tokenType, TOKEN_OPTIONS]);

  useEffect(() => {
    if (preview || walletSource !== 'circle' || !developerWallet?.wallet_address) {
      setCircleBalance(null);
      return;
    }
    const tokenAddress = tokenConfig.address as `0x${string}`;
    const publicClient = createPublicClient({
      chain: arcTestnet,
      transport: http(),
    });
    let cancelled = false;
    publicClient
      .readContract({
        address: tokenAddress,
        abi: ERC20ABI,
        functionName: 'balanceOf',
        args: [developerWallet.wallet_address as `0x${string}`],
      })
      .then((b) => {
        if (!cancelled) setCircleBalance((Number(b) / DECIMALS).toFixed(6));
      })
      .catch(() => {
        if (!cancelled) setCircleBalance('0.00');
      });
    return () => {
      cancelled = true;
    };
  }, [walletSource, developerWallet?.wallet_address, tokenConfig.address, preview, contracts.rpcUrls]);

  const normalizedUsername = useMemo(() => normalizeSocialUsername(username.replace(/^@/, '')), [username]);
  const normalizedPlatform = useMemo(() => (platform === 'address' ? null : normalizeSocialPlatform(platform)), [platform]);

  const balanceFormatted =
    preview && previewValues?.balance != null
      ? previewValues.balance
      : walletSource === 'circle'
        ? circleBalance ?? '0.00'
        : (balance?.formatted ?? '0.00');
  const effectiveAmount = preview && previewValues ? previewValues.amount : amount;
  const effectiveTokenType = preview && previewValues ? previewValues.token : tokenType;
  const effectivePlatform = preview && previewValues ? previewValues.platform : platform;
  const effectiveUsername = preview && previewValues ? previewValues.username : username;

  const pollTransactionStatus = async (transactionId: string): Promise<string> => {
    const maxAttempts = 30;
    const pollInterval = 1000;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise((r) => setTimeout(r, pollInterval));
      const status = await apiCall(`/wallets/transaction-status?transactionId=${encodeURIComponent(transactionId)}`, {
        method: 'GET',
      }) as { transactionState?: string; txHash?: string; error?: string };
      if (status?.transactionState === 'FAILED') {
        throw new Error(status?.error ?? status?.transactionState ?? 'Transaction failed');
      }
      if (status?.txHash) return status.txHash;
      if (status?.transactionState === 'COMPLETE' && status?.txHash) return status.txHash;
    }
    throw new Error('Transaction status timeout');
  };

  const onSubmit = async () => {
    try {
      const useCircle = walletSource === 'circle' && hasDeveloperWallet && developerWallet;
      if (useCircle) {
        if (!developerWallet || !amount || Number(amount) <= 0) throw new Error('Enter amount > 0');
        setLoading(true);
        const tokenAddress = tokenConfig.address;
        const amountWei = parseAmountToWei(amount);
        const feeWei = (amountWei * FEE_BPS) / BPS_DENOMINATOR;
        const totalWei = amountWei + feeWei;
        const privyUserIdForTx = getCircleWalletPrivyUserIdForTx(
          developerWallet,
          address ?? undefined,
          privyUser?.id
        );

        // Balance check (amount + fee)
        try {
          const publicClient = createPublicClient({
            chain: arcTestnet,
            transport: http(),
          });
          const bal = (await publicClient.readContract({
            address: tokenAddress as `0x${string}`,
            abi: ERC20ABI,
            functionName: 'balanceOf',
            args: [developerWallet.wallet_address as `0x${string}`],
          })) as bigint;
          if (bal < totalWei) {
            throw new Error(
              `Insufficient ${tokenType} balance. Required: ${(Number(totalWei) / DECIMALS).toFixed(6)}, Available: ${(Number(bal) / DECIMALS).toFixed(6)}`
            );
          }
        } catch (balanceErr) {
          if (balanceErr instanceof Error) throw balanceErr;
          throw new Error('Failed to check balance');
        }

        if (platform === 'address') {
          const recipientTrimmed = username.trim();
          if (!/^0x[a-fA-F0-9]{40}$/.test(recipientTrimmed)) throw new Error('Enter a valid recipient address (0x...)');
          if (!contracts.directSend) throw new Error('DirectSend contract not configured');
          const approveRes = await DeveloperWalletService.sendTransaction({
            walletId: developerWallet.circle_wallet_id,
            walletAddress: developerWallet.wallet_address,
            contractAddress: tokenAddress,
            functionName: 'approve',
            args: [contracts.directSend, totalWei],
            blockchain: 'ARC-TESTNET',
            privyUserId: privyUserIdForTx,
            socialPlatform: developerWallet.social_platform ?? undefined,
            socialUserId: developerWallet.social_user_id ?? undefined,
          });
          if (!approveRes.success) throw new Error(approveRes.error ?? 'Approve failed');
          if (approveRes.transactionId) await pollTransactionStatus(approveRes.transactionId);
          const sendRes = await DeveloperWalletService.sendTransaction({
            walletId: developerWallet.circle_wallet_id,
            walletAddress: developerWallet.wallet_address,
            contractAddress: contracts.directSend,
            functionName: 'sendToAddress',
            args: [recipientTrimmed, amountWei, tokenAddress],
            blockchain: 'ARC-TESTNET',
            privyUserId: privyUserIdForTx,
            socialPlatform: developerWallet.social_platform ?? undefined,
            socialUserId: developerWallet.social_user_id ?? undefined,
          });
          if (!sendRes.success) throw new Error(sendRes.error ?? 'Send failed');
          let txHash = sendRes.txHash ?? '';
          if (!txHash && sendRes.transactionId) {
            toast.info('Waiting for transaction to be processed...');
            txHash = await pollTransactionStatus(sendRes.transactionId);
          }
          toast.success('Payment sent successfully!');
          if (txHash) {
            toast.success(
              <span>
                Payment sent successfully!{' '}
                <a href={getExplorerTxUrl(activeChainId, txHash)} target="_blank" rel="noopener noreferrer" className="underline font-medium">
                  TX: {txHash.slice(0, 10)}...{txHash.slice(-8)}
                </a>
              </span>
            );
          }
          return;
        }

        if (!normalizedUsername) throw new Error('Enter recipient');
        if (!normalizedPlatform) throw new Error('Unsupported platform');
        const socialIdentityHash = generateSocialIdentityHash(normalizedPlatform, normalizedUsername);
        if (!socialIdentityHash) throw new Error('Invalid social identity');
        const approveRes = await DeveloperWalletService.sendTransaction({
          walletId: developerWallet.circle_wallet_id,
          walletAddress: developerWallet.wallet_address,
          contractAddress: tokenAddress,
          functionName: 'approve',
          args: [contracts.zksend, totalWei],
          blockchain: 'ARC-TESTNET',
          privyUserId: privyUserIdForTx,
          socialPlatform: developerWallet.social_platform ?? undefined,
          socialUserId: developerWallet.social_user_id ?? undefined,
        });
        if (!approveRes.success) throw new Error(approveRes.error ?? 'Approve failed');
        if (approveRes.transactionId) await pollTransactionStatus(approveRes.transactionId);
        const createRes = await DeveloperWalletService.sendTransaction({
          walletId: developerWallet.circle_wallet_id,
          walletAddress: developerWallet.wallet_address,
          contractAddress: contracts.zksend,
          functionName: 'createPayment',
          args: [socialIdentityHash, normalizedPlatform, amountWei, tokenAddress],
          blockchain: 'ARC-TESTNET',
          privyUserId: privyUserIdForTx,
          socialPlatform: developerWallet.social_platform ?? undefined,
          socialUserId: developerWallet.social_user_id ?? undefined,
        });
        if (!createRes.success) throw new Error(createRes.error ?? 'Create payment failed');
        let txHash = createRes.txHash ?? '';
        if (!txHash && createRes.transactionId) {
          toast.info('Waiting for transaction to be processed...');
          txHash = await pollTransactionStatus(createRes.transactionId);
        }
        let paymentId: string | null = null;
        if (txHash) {
          try {
            const publicClient = createPublicClient({
              chain: arcTestnet,
              transport: http(),
            });
            const receipt = await publicClient.getTransactionReceipt({ hash: txHash as `0x${string}` });
            if (receipt?.logs) {
              const parsed = parseEventLogs({
                abi: ZkSendABI,
                logs: receipt.logs,
                eventName: 'PaymentCreated',
              });
              const ev = parsed?.[0] as { args?: { paymentId?: bigint } } | undefined;
              if (ev?.args?.paymentId != null) paymentId = ev.args.paymentId.toString();
            }
          } catch (_) {
            // ignore
          }
        }
        if (paymentId) {
          try {
            await createZkSendPaymentRecord({
              paymentId,
              senderAddress: developerWallet.wallet_address,
              recipientIdentityHash: socialIdentityHash,
              platform: normalizedPlatform,
              recipientUsername: username,
              amount,
              currency: tokenType,
              txHash: txHash || undefined,
              chainId: activeChainId,
              contractAddress: contracts.zksend,
            });
          } catch (dbError) {
            console.warn('[zkSEND] Failed to store payment in DB:', dbError);
          }
        }
        if (paymentId && txHash) {
          toast.success(`Payment created successfully! Payment ID: ${paymentId}`, {
            description: (
              <a
                href={getExplorerTxUrl(activeChainId, txHash)}
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-medium"
              >
                TX: {txHash.slice(0, 10)}...{txHash.slice(-8)}
              </a>
            ),
          });
        } else if (paymentId) {
          toast.success(`Payment created successfully! Payment ID: ${paymentId}`);
        } else if (txHash) {
          toast.success('Payment created successfully!', {
            description: (
              <a
                href={getExplorerTxUrl(activeChainId, txHash)}
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-medium"
              >
                TX: {txHash.slice(0, 10)}...{txHash.slice(-8)}
              </a>
            ),
          });
        } else {
          toast.success('Payment created successfully.');
        }
        return;
      }

      if (!isConnected || !address || !walletClient) {
        throw new Error('Connect wallet to send');
      }
      if (!amount || Number(amount) <= 0) throw new Error('Enter amount > 0');

      setLoading(true);
      await web3Service.initialize(walletClient, address, activeChainId);

      if (platform === 'address') {
        const recipientTrimmed = username.trim();
        if (!/^0x[a-fA-F0-9]{40}$/.test(recipientTrimmed)) throw new Error('Enter a valid recipient address (0x...)');
        const { txHash } = await web3Service.sendDirectToAddress({
          recipient: recipientTrimmed as `0x${string}`,
          amount,
          tokenType,
        });
        toast.success('Payment sent successfully!');
        if (txHash) {
          toast.success(
            <span>
              Payment sent successfully!{' '}
              <a
                href={getExplorerTxUrl(activeChainId, txHash)}
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-medium"
              >
                TX: {txHash.slice(0, 10)}...{txHash.slice(-8)}
              </a>
            </span>
          );
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
            chainId: activeChainId,
            contractAddress: contracts.zksend,
          });
        } catch (dbError) {
          console.warn('[zkSEND] Failed to store payment in DB:', dbError);
        }
      } else {
        console.warn('[zkSEND] Payment created without paymentId; DB record was not stored.');
      }

      if (paymentId && txHash) {
        toast.success(`Payment created successfully! Payment ID: ${paymentId}`, {
          description: (
            <a
              href={getExplorerTxUrl(activeChainId, txHash)}
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-medium"
            >
              TX: {txHash.slice(0, 10)}...{txHash.slice(-8)}
            </a>
          ),
        });
      } else if (paymentId) {
        toast.success(`Payment created successfully! Payment ID: ${paymentId}`);
      } else if (txHash) {
        toast.success('Payment created successfully!', {
          description: (
            <a
              href={getExplorerTxUrl(activeChainId, txHash)}
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-medium"
            >
              TX: {txHash.slice(0, 10)}...{txHash.slice(-8)}
            </a>
          ),
        });
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
              href={getExplorerTxUrl(activeChainId, txHash)}
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

  const canSubmitExternal =
    !preview && isIdentityValid && amount && Number(amount) > 0 && isConnected && !!address && !!walletClient;
  const canSubmitCircle =
    !preview && isIdentityValid && amount && Number(amount) > 0 && hasDeveloperWallet && !!developerWallet;
  const canSubmit = walletSource === 'circle' ? canSubmitCircle : canSubmitExternal;

  return (
    <Card>
      <CardContent className="pt-6 space-y-6">
        {/* Amount */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="amount-input">Amount</Label>
            <div className="flex items-center gap-2">
              {!preview && onWalletSourceChange ? (
                <WalletSourceToggle
                  value={walletSource}
                  onChange={onWalletSourceChange}
                  hasCircleWallet={hasDeveloperWallet}
                  compact
                />
              ) : null}
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Wallet className="h-4 w-4" aria-hidden />
                <span>{balanceFormatted}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Input
              id="amount-input"
              value={effectiveAmount}
              onChange={preview ? undefined : (e) => setAmount(e.target.value)}
              readOnly={preview}
              inputMode="decimal"
              placeholder="0.00"
              aria-label="Amount"
              className={`flex-1 ${preview ? 'cursor-default' : ''}`}
            />
            {preview ? (
              <div
                className="w-[120px] gap-2 flex h-9 items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                aria-label="Token"
              >
                <span>{effectiveTokenType}</span>
              </div>
            ) : (
              <Select
                value={tokenType}
                onValueChange={(v) => setTokenType(v as SupportedSendToken)}
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
            )}
          </div>
        </div>

        {/* To */}
        <PlatformUsernameInput
          platform={effectivePlatform}
          onPlatformChange={onPlatformChange}
          username={effectiveUsername}
          onUsernameChange={onUsernameChange}
          label="To"
          inputId="to-input"
          ariaLabel="Recipient"
          readOnly={preview}
          previewSuggestionLabel={preview ? previewValues?.suggestionLabel : undefined}
          previewProfileImageUrl={preview ? previewValues?.profileImageUrl : undefined}
        />

        {!preview && !isIdentityValid && username.length > 0 && (
          <p className="text-sm text-amber-600 dark:text-amber-500">
            {platform === 'address'
              ? 'Enter a valid wallet address (0x followed by 40 hex characters).'
              : 'Select a platform above and enter a valid username to send.'}
          </p>
        )}

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pt-2">
          <Button
            type="button"
            onClick={preview ? (e) => e.preventDefault() : onSubmit}
            disabled={!preview && (!canSubmit || loading)}
            size="lg"
            className="w-full sm:w-auto bg-emerald-600 text-white hover:bg-emerald-600/90 disabled:opacity-50"
          >
            {loading ? 'Sending...' : 'Send'}
          </Button>
          {!preview && onGoToPending ? (
            <Button type="button" variant="ghost" onClick={onGoToPending} className="w-full sm:w-auto">
              View pending payments
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

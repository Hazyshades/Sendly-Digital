import { createPublicClient, http, parseEventLogs } from 'viem';
import { apiCall } from '@/lib/supabase/client';
import { DeveloperWalletService } from '@/lib/circle/developerWalletService';
import { getCircleWalletPrivyUserIdForTx } from '@/hooks/useCircleWallet';
import {
  ARC_CHAIN_ID,
  ERC20ABI,
  ZkSendABI,
  getContractsForChain,
} from '@/lib/web3/constants';
import { arcTestnet } from '@/lib/web3/wagmiConfig';
import { createZkSendPaymentRecord } from '@/lib/zksend/zksendPaymentsAPI';
import type { PaywallPaymentInstructions } from '@/lib/paywall/creatorPaywallAPI';
import type { DeveloperWallet } from '@/lib/circle/developerWalletService';

const FEE_BPS = 10n;
const BPS_DENOMINATOR = 10000n;
const DECIMALS = 1_000_000;

function parseAmountToWei(amount: string): bigint {
  return BigInt(Math.floor(parseFloat(amount) * DECIMALS));
}

/** Total USDC charged at checkout (list price + platform fee). */
export function formatPaywallChargeUsdc(priceUsdc: string): string {
  const amountWei = parseAmountToWei(priceUsdc);
  const feeWei = (amountWei * FEE_BPS) / BPS_DENOMINATOR;
  const totalWei = amountWei + feeWei;
  return (Number(totalWei) / DECIMALS).toFixed(2);
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function resolvePaymentIdFromChain(params: {
  publicClient: ReturnType<typeof createPublicClient>;
  txHash: string;
  zksendAddress: `0x${string}`;
  identityHash: `0x${string}`;
  senderAddress: `0x${string}`;
  amountWei: bigint;
}): Promise<string | null> {
  const { publicClient, txHash, zksendAddress, identityHash, senderAddress, amountWei } = params;

  for (let attempt = 0; attempt < 8; attempt++) {
    try {
      const receipt = await publicClient.getTransactionReceipt({ hash: txHash as `0x${string}` });
      if (receipt?.logs?.length) {
        const parsed = parseEventLogs({
          abi: ZkSendABI,
          logs: receipt.logs,
          eventName: 'PaymentCreated',
        });
        const ev = parsed?.[0] as { args?: { paymentId?: bigint } } | undefined;
        if (ev?.args?.paymentId != null) return ev.args.paymentId.toString();
      }
    } catch {
      // receipt may not be indexed yet
    }
    if (attempt < 7) await sleep(750);
  }

  try {
    const pendingIds = (await publicClient.readContract({
      address: zksendAddress,
      abi: ZkSendABI,
      functionName: 'getPendingPayments',
      args: [identityHash],
    })) as bigint[];

    const normalizedSender = senderAddress.toLowerCase();
    for (const id of pendingIds) {
      const payment = (await publicClient.readContract({
        address: zksendAddress,
        abi: ZkSendABI,
        functionName: 'getPayment',
        args: [id],
      })) as {
        paymentId?: bigint;
        sender?: string;
        amount?: bigint;
        claimed?: boolean;
      };

      if (payment.claimed) continue;
      if (payment.sender?.toLowerCase() !== normalizedSender) continue;
      if (payment.amount !== amountWei) continue;
      return BigInt(payment.paymentId ?? id).toString();
    }
  } catch (err) {
    console.warn('[paywall] paymentId fallback lookup failed:', err);
  }

  return null;
}

async function pollTransactionStatus(transactionId: string): Promise<string> {
  const maxAttempts = 30;
  const pollInterval = 1000;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise((r) => setTimeout(r, pollInterval));
    const status = (await apiCall(
      `/wallets/transaction-status?transactionId=${encodeURIComponent(transactionId)}`,
      { method: 'GET' },
    )) as { transactionState?: string; txHash?: string; error?: string };
    if (status?.transactionState === 'FAILED') {
      throw new Error(status?.error ?? status?.transactionState ?? 'Transaction failed');
    }
    if (status?.txHash) return status.txHash;
    if (status?.transactionState === 'COMPLETE' && status?.txHash) return status.txHash;
  }
  throw new Error('Transaction status timeout');
}

export type PaywallPaymentResult = {
  paymentId: string;
  txHash: string;
};

export async function payPaywallViaDeveloperWallet(params: {
  instructions: PaywallPaymentInstructions;
  developerWallet: DeveloperWallet;
  connectedAddress?: string;
  privyUserId?: string;
}): Promise<PaywallPaymentResult> {
  const { instructions, developerWallet } = params;
  const contracts = getContractsForChain(ARC_CHAIN_ID);
  if (!contracts.zksend) throw new Error('ZkSend contract not configured');

  const tokenAddress = instructions.usdcAddress as `0x${string}`;
  const amountWei = parseAmountToWei(instructions.priceUsdc);
  const feeWei = (amountWei * FEE_BPS) / BPS_DENOMINATOR;
  const totalWei = amountWei + feeWei;
  const identityHash = instructions.identityHash as `0x${string}`;
  const platform = instructions.recipient.platform;
  const privyUserIdForTx = getCircleWalletPrivyUserIdForTx(
    developerWallet,
    params.connectedAddress,
    params.privyUserId,
  );

  const publicClient = createPublicClient({ chain: arcTestnet, transport: http() });
  const bal = (await publicClient.readContract({
    address: tokenAddress,
    abi: ERC20ABI,
    functionName: 'balanceOf',
    args: [developerWallet.wallet_address as `0x${string}`],
  })) as bigint;
  if (bal < totalWei) {
    throw new Error(
      `Insufficient USDC. Required: ${(Number(totalWei) / DECIMALS).toFixed(2)}, available: ${(Number(bal) / DECIMALS).toFixed(2)}`,
    );
  }

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
    args: [identityHash, platform, amountWei, tokenAddress],
    blockchain: 'ARC-TESTNET',
    privyUserId: privyUserIdForTx,
    socialPlatform: developerWallet.social_platform ?? undefined,
    socialUserId: developerWallet.social_user_id ?? undefined,
  });
  if (!createRes.success) throw new Error(createRes.error ?? 'Create payment failed');

  let txHash = createRes.txHash ?? '';
  if (!txHash && createRes.transactionId) {
    txHash = await pollTransactionStatus(createRes.transactionId);
  }
  if (!txHash) throw new Error('Missing transaction hash');

  const paymentId = await resolvePaymentIdFromChain({
    publicClient,
    txHash,
    zksendAddress: contracts.zksend as `0x${string}`,
    identityHash,
    senderAddress: developerWallet.wallet_address as `0x${string}`,
    amountWei,
  });
  if (!paymentId) {
    throw new Error(
      'Payment was sent on Arc, but paymentId could not be read yet. Try unlocking again with your transaction hash.',
    );
  }

  try {
    await createZkSendPaymentRecord({
      paymentId,
      senderAddress: developerWallet.wallet_address,
      recipientIdentityHash: identityHash,
      platform,
      recipientUsername: instructions.recipient.handle,
      amount: instructions.priceUsdc,
      currency: 'USDC',
      txHash,
      chainId: ARC_CHAIN_ID,
      contractAddress: contracts.zksend,
    });
  } catch (dbError) {
    console.warn('[paywall] zksend DB record failed:', dbError);
  }

  return { paymentId, txHash };
}

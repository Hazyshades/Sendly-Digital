import { createPublicClient, http, parseEventLogs } from 'viem';
import { DeveloperWalletService } from '@/lib/circle/developerWalletService';
import {
  ARC_CHAIN_ID,
  ERC20ABI,
  ZkSendABI,
  getContractsForChain,
} from '@/lib/web3/constants';
import { arcTestnet } from '@/lib/web3/wagmiConfig';
import { createZkSendPaymentRecord } from '@/lib/zksend/zksendPaymentsAPI';
import { toMicro } from '@/lib/tokenAmount';
import type { PaywallPaymentInstructions } from '@/lib/paywall/creatorPaywallAPI';
import type { DeveloperWallet } from '@/lib/circle/developerWalletService';

const FEE_BPS = 10n;
const BPS_DENOMINATOR = 10000n;
const DECIMALS = 1_000_000;

/** Total USDC charged at checkout (list price + platform fee). */
export function formatPaywallChargeUsdc(priceUsdc: string): string {
  const amountWei = toMicro(priceUsdc);
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

export type PaywallPaymentResult = {
  paymentId: string;
  txHash: string;
};

/**
 * Pay a paywall via Internal Wallet.
 * `privyUserId` must already be resolved at the callsite
 * (e.g. via getCircleWalletPrivyUserIdForTx) — this lib must not import hooks.
 */
export async function payPaywallViaDeveloperWallet(params: {
  instructions: PaywallPaymentInstructions;
  developerWallet: DeveloperWallet;
  /** Already-resolved attribution id from getCircleWalletPrivyUserIdForTx at the callsite. */
  privyUserId?: string;
}): Promise<PaywallPaymentResult> {
  const { instructions, developerWallet, privyUserId } = params;
  const contracts = getContractsForChain(ARC_CHAIN_ID);
  if (!contracts.zksend) throw new Error('ZkSend contract not configured');

  const tokenAddress = instructions.usdcAddress as `0x${string}`;
  const amountWei = toMicro(instructions.priceUsdc);
  const feeWei = (amountWei * FEE_BPS) / BPS_DENOMINATOR;
  const totalWei = amountWei + feeWei;
  const identityHash = instructions.identityHash as `0x${string}`;
  const platform = instructions.recipient.platform;

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

  const executed = await DeveloperWalletService.executeContractCall({
    walletId: developerWallet.circle_wallet_id,
    walletAddress: developerWallet.wallet_address,
    contractAddress: contracts.zksend,
    abiFunctionSignature: 'createPayment',
    abiParameters: [identityHash, platform, amountWei, tokenAddress],
    ensureAllowance: {
      tokenAddress,
      spenderAddress: contracts.zksend,
      amountMicro: totalWei,
    },
    attribution: {
      privyUserId,
      socialPlatform: developerWallet.social_platform ?? undefined,
      socialUserId: developerWallet.social_user_id ?? undefined,
    },
  });

  const txHash = executed.txHash;
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

import { createPublicClient, http, parseEventLogs } from 'viem';

import web3Service from '@/lib/web3/web3Service';
import {
  generateSocialIdentityHash,
  normalizeGmailAddress,
  normalizeSocialPlatform,
  normalizeSocialUsername,
} from '@/lib/reclaim/identity';
import { createZkSendPaymentRecord } from '@/lib/zksend/zksendPaymentsAPI';
import { ARC_CHAIN_ID, ERC20ABI, getContractsForChain, ZkSendABI } from '@/lib/web3/constants';
import { arcTestnet } from '@/lib/web3/wagmiConfig';
import { DeveloperWalletService, type DeveloperWallet } from '@/lib/circle/developerWalletService';
import { apiCall } from '@/lib/supabase/client';
import { getCircleWalletPrivyUserIdForTx } from '@/hooks/useCircleWallet';

import type { WalletSource } from './WalletSourceToggle';

export type ZkSendSettlementToken = 'USDC' | 'EURC' | 'PATHUSD' | 'ALPHAUSD' | 'BETAUSD' | 'THETAUSD';

const DECIMALS = 1_000_000n;
const FEE_BPS = 10n;
const BPS_DENOMINATOR = 10_000n;

export type ZkSendFeeBreakdown = {
  amountWei: bigint;
  protocolFeeWei: bigint;
  totalDebitWei: bigint;
  protocolFeeUsdc: string;
  totalDebitUsdc: string;
};

export type SocialPaymentOutcome = {
  paymentId: string | null;
  txHash: string | null;
  chainId: number;
  platform: string;
  normalizedUsername: string;
  recipientIdentityHash: `0x${string}`;
  protocolFeeUsdc: string;
  totalDebitUsdc: string;
};

type SubmitSocialPaymentInput = {
  amount: string;
  tokenType: ZkSendSettlementToken;
  platform: string;
  username: string;
  walletSource: WalletSource;
  chainId: number;
  isConnected: boolean;
  address?: string;
  walletClient?: any;
  developerWallet?: DeveloperWallet | null;
  hasDeveloperWallet: boolean;
  privyUserId?: string;
  /** Remit uses Arc only; generic payments preserve their current selected-chain behaviour. */
  requireArc?: boolean;
};

function parseUsdcAmount(amount: string): bigint {
  const value = amount.trim();
  if (!/^\d+(?:\.\d{0,6})?$/.test(value)) throw new Error('Enter a valid amount with up to 6 decimals');
  const [whole, fraction = ''] = value.split('.');
  return BigInt(whole) * DECIMALS + BigInt(fraction.padEnd(6, '0'));
}

export function formatUsdcAmount(value: bigint): string {
  const whole = value / DECIMALS;
  const fraction = (value % DECIMALS).toString().padStart(6, '0').replace(/0+$/, '');
  return fraction ? `${whole}.${fraction}` : whole.toString();
}

export function getZkSendFeeBreakdown(amount: string): ZkSendFeeBreakdown {
  const amountWei = parseUsdcAmount(amount);
  const protocolFeeWei = (amountWei * FEE_BPS) / BPS_DENOMINATOR;
  const totalDebitWei = amountWei + protocolFeeWei;
  return {
    amountWei,
    protocolFeeWei,
    totalDebitWei,
    protocolFeeUsdc: formatUsdcAmount(protocolFeeWei),
    totalDebitUsdc: formatUsdcAmount(totalDebitWei),
  };
}

function normalizeRecipient(platform: string, username: string) {
  const normalizedPlatform = normalizeSocialPlatform(platform);
  const normalizedUsername = normalizedPlatform === 'gmail'
    ? normalizeGmailAddress(username)
    : normalizeSocialUsername(username.replace(/^@/, ''));
  if (!normalizedPlatform) throw new Error('Unsupported platform');
  if (!normalizedUsername) throw new Error('Enter recipient');
  const recipientIdentityHash = generateSocialIdentityHash(normalizedPlatform, normalizedUsername);
  if (!recipientIdentityHash) throw new Error('Invalid social identity');
  return { normalizedPlatform, normalizedUsername, recipientIdentityHash };
}

async function pollTransactionStatus(transactionId: string): Promise<string> {
  for (let attempt = 0; attempt < 30; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const status = await apiCall(`/wallets/transaction-status?transactionId=${encodeURIComponent(transactionId)}`, {
      method: 'GET',
    }) as { transactionState?: string; txHash?: string; error?: string };
    if (status.transactionState === 'FAILED') throw new Error(status.error ?? 'Transaction failed');
    if (status.txHash) return status.txHash;
  }
  throw new Error('Transaction status timeout');
}

export async function submitSocialZkSendPayment(input: SubmitSocialPaymentInput): Promise<SocialPaymentOutcome> {
  if (!input.amount || Number(input.amount) <= 0) throw new Error('Enter amount > 0');
  if (input.requireArc && input.chainId !== ARC_CHAIN_ID) {
    throw new Error('Switch your wallet to Arc Testnet to send this remittance');
  }

  const { normalizedPlatform, normalizedUsername, recipientIdentityHash } = normalizeRecipient(input.platform, input.username);
  const fees = getZkSendFeeBreakdown(input.amount);
  const contracts = getContractsForChain(input.chainId);
  const useCircle = input.walletSource === 'circle' && input.hasDeveloperWallet && input.developerWallet;
  let paymentId: string | null = null;
  let txHash: string | null = null;

  if (useCircle) {
    const wallet = input.developerWallet!;
    const tokenAddress = {
      USDC: contracts.usdc,
      EURC: contracts.eurc,
      PATHUSD: contracts.pathusd,
      ALPHAUSD: contracts.alphausd,
      BETAUSD: contracts.betausd,
      THETAUSD: contracts.thetausd,
    }[input.tokenType];
    if (!tokenAddress || !contracts.zksend) throw new Error('Arc USDC settlement is not configured');
    const publicClient = createPublicClient({ chain: arcTestnet, transport: http() });
    const balance = await publicClient.readContract({
      address: tokenAddress as `0x${string}`,
      abi: ERC20ABI,
      functionName: 'balanceOf',
      args: [wallet.wallet_address as `0x${string}`],
    }) as bigint;
    if (balance < fees.totalDebitWei) {
      throw new Error(`Insufficient ${input.tokenType} balance. Required: ${fees.totalDebitUsdc}`);
    }

    const privyUserId = getCircleWalletPrivyUserIdForTx(wallet, input.address, input.privyUserId);
    const approve = await DeveloperWalletService.sendTransaction({
      walletId: wallet.circle_wallet_id,
      walletAddress: wallet.wallet_address,
      contractAddress: tokenAddress,
      functionName: 'approve',
      args: [contracts.zksend, fees.totalDebitWei],
      blockchain: 'ARC-TESTNET',
      privyUserId,
      socialPlatform: wallet.social_platform ?? undefined,
      socialUserId: wallet.social_user_id ?? undefined,
    });
    if (!approve.success) throw new Error(approve.error ?? 'Approve failed');
    if (approve.transactionId) await pollTransactionStatus(approve.transactionId);

    const create = await DeveloperWalletService.sendTransaction({
      walletId: wallet.circle_wallet_id,
      walletAddress: wallet.wallet_address,
      contractAddress: contracts.zksend,
      functionName: 'createPayment',
      args: [recipientIdentityHash, normalizedPlatform, fees.amountWei, tokenAddress],
      blockchain: 'ARC-TESTNET',
      privyUserId,
      socialPlatform: wallet.social_platform ?? undefined,
      socialUserId: wallet.social_user_id ?? undefined,
    });
    if (!create.success) throw new Error(create.error ?? 'Create payment failed');
    txHash = create.txHash ?? null;
    if (!txHash && create.transactionId) txHash = await pollTransactionStatus(create.transactionId);

    if (txHash) {
      try {
        const receipt = await publicClient.getTransactionReceipt({ hash: txHash as `0x${string}` });
        const event = parseEventLogs({ abi: ZkSendABI, logs: receipt.logs, eventName: 'PaymentCreated' })[0] as {
          args?: { paymentId?: bigint };
        } | undefined;
        paymentId = event?.args?.paymentId?.toString() ?? null;
      } catch {
        // A successful Circle transaction can be indexed later if receipt parsing is delayed.
      }
    }

    if (paymentId) {
      await createZkSendPaymentRecord({
        paymentId,
        senderAddress: wallet.wallet_address,
        recipientIdentityHash,
        platform: normalizedPlatform,
        recipientUsername: input.username,
        amount: input.amount,
        currency: input.tokenType,
        txHash: txHash ?? undefined,
        chainId: ARC_CHAIN_ID,
        contractAddress: contracts.zksend,
      }).catch((error) => console.warn('[zkSEND] Failed to store payment in DB:', error));
    }
  } else {
    if (!input.isConnected || !input.address || !input.walletClient) throw new Error('Connect wallet to send');
    await web3Service.initialize(input.walletClient, input.address, input.chainId);
    const result = await web3Service.createZkSendPayment({
      socialIdentityHash: recipientIdentityHash,
      platform: normalizedPlatform,
      amount: input.amount,
      tokenType: input.tokenType,
    });
    paymentId = result.paymentId;
    txHash = result.txHash;
    if (paymentId) {
      await createZkSendPaymentRecord({
        paymentId,
        senderAddress: input.address,
        recipientIdentityHash,
        platform: normalizedPlatform,
        recipientUsername: input.username,
        amount: input.amount,
        currency: input.tokenType,
        txHash: txHash ?? undefined,
        chainId: input.chainId,
        contractAddress: contracts.zksend,
      }).catch((error) => console.warn('[zkSEND] Failed to store payment in DB:', error));
    }
  }

  return {
    paymentId,
    txHash,
    chainId: input.requireArc ? ARC_CHAIN_ID : input.chainId,
    platform: normalizedPlatform,
    normalizedUsername,
    recipientIdentityHash,
    protocolFeeUsdc: fees.protocolFeeUsdc,
    totalDebitUsdc: fees.totalDebitUsdc,
  };
}

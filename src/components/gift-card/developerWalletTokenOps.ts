import { ERC20ABI } from '@/lib/web3/constants';
import { DeveloperWalletService } from '@/lib/circle/developerWalletService';
import type { GiftCardCurrency } from './types';
import { waitForCircleTransactionCompletion } from './circleTransactionStatus';

export async function assertDeveloperWalletBalance(params: {
  publicClient: any;
  tokenAddress: string;
  createAddress: string;
  amountWei: string;
  currency: GiftCardCurrency;
  amount: string;
}) {
  const { publicClient, tokenAddress, createAddress, amountWei, currency, amount } = params;
  const balance = await publicClient.readContract({
    address: tokenAddress as `0x${string}`,
    abi: ERC20ABI,
    functionName: 'balanceOf',
    args: [createAddress as `0x${string}`]
  }) as bigint;
  const balanceFormatted = (Number(balance) / 1000000).toFixed(6);

  if (BigInt(balance) < BigInt(amountWei)) {
    throw new Error(`Insufficient ${currency} balance. You have ${balanceFormatted} ${currency}, but need ${amount} ${currency}. Wallet: ${createAddress.slice(0, 6)}...${createAddress.slice(-4)}`);
  }
}

export async function approveDeveloperWalletIfNeeded(params: {
  publicClient: any;
  contracts: any;
  tokenAddress: string;
  createAddress: string;
  amountWei: string;
  currency: GiftCardCurrency;
  developerWallet: any;
  privyUserIdForTx?: string;
  notifyInfo: (message: string) => void;
}) {
  const {
    publicClient,
    contracts,
    tokenAddress,
    createAddress,
    amountWei,
    currency,
    developerWallet,
    privyUserIdForTx,
    notifyInfo
  } = params;
  const spenderAddress = contracts.contractAddress!;
  const currentAllowance = await publicClient.readContract({
    address: tokenAddress as `0x${string}`,
    abi: ERC20ABI,
    functionName: 'allowance',
    args: [createAddress as `0x${string}`, spenderAddress as `0x${string}`]
  }) as bigint;

  if (currentAllowance >= BigInt(amountWei)) {
    return;
  }

  notifyInfo(`Approving ${currency} for contract...`);

  const approveTx = await DeveloperWalletService.sendTransaction({
    walletId: developerWallet.circle_wallet_id,
    walletAddress: developerWallet.wallet_address,
    contractAddress: tokenAddress,
    functionName: 'approve',
    args: [spenderAddress, BigInt(amountWei)],
    blockchain: 'ARC-TESTNET',
    privyUserId: privyUserIdForTx,
    socialPlatform: developerWallet.social_platform || undefined,
    socialUserId: developerWallet.social_user_id || undefined
  });

  if (!approveTx.success) {
    throw new Error(approveTx.error || 'Approve failed');
  }

  if (approveTx.transactionId) {
    await waitForCircleTransactionCompletion(approveTx.transactionId);
  }
}

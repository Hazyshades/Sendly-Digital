import { ERC20ABI } from '@/lib/web3/constants';
import { DeveloperWalletService } from '@/lib/circle/developerWalletService';
import { fromMicro } from '@/lib/tokenAmount';
import type { GiftCardCurrency } from './types';

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
  const balanceFormatted = fromMicro(balance);

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

  // Delegate approve + wait to executeContractCall's ensureAllowance path
  // (main call is the same approve — service short-circuits the redundant second send).
  await DeveloperWalletService.executeContractCall({
    walletId: developerWallet.circle_wallet_id,
    walletAddress: developerWallet.wallet_address,
    contractAddress: tokenAddress,
    abiFunctionSignature: 'approve',
    abiParameters: [spenderAddress, BigInt(amountWei)],
    ensureAllowance: {
      tokenAddress,
      spenderAddress,
      amountMicro: amountWei,
    },
    attribution: {
      privyUserId: privyUserIdForTx,
      socialPlatform: developerWallet.social_platform || undefined,
      socialUserId: developerWallet.social_user_id || undefined,
    },
  });
}

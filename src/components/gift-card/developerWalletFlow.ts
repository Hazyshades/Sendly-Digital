import { createPublicClient, http } from 'viem';
import { DeveloperWalletService } from '@/lib/circle/developerWalletService';
import type { GiftCardData } from './types';
import type { GiftCardCreationResult } from './flowTypes';
import { formatDeveloperWalletError } from './giftCardErrors';
import { resolveCircleTransactionHash } from './circleTransactionStatus';
import { approveDeveloperWalletIfNeeded, assertDeveloperWalletBalance } from './developerWalletTokenOps';
import { extractTokenIdFromReceipt } from './giftCardReceipt';
import { getDeveloperWalletCall } from './developerWalletCall';
import { getPrivyUserIdForDeveloperWallet } from './developerWalletIdentity';

export async function createGiftCardWithDeveloperWallet(params: {
  activeChain: any;
  contracts: any;
  formData: GiftCardData;
  metadataUri: string;
  amountWei: string;
  tokenAddress: string;
  createAddress: string;
  developerWallet: any;
  isConnected: boolean;
  address?: string;
  privyUserId?: string;
  notifyInfo: (message: string) => void;
  notifyWarning: (message: string) => void;
}): Promise<GiftCardCreationResult> {
  const {
    activeChain,
    contracts,
    formData,
    metadataUri,
    amountWei,
    tokenAddress,
    createAddress,
    developerWallet,
    isConnected,
    address,
    privyUserId,
    notifyInfo,
    notifyWarning
  } = params;

  const publicClient = createPublicClient({
    chain: activeChain,
    transport: http()
  });

  await assertDeveloperWalletBalance({
    publicClient,
    tokenAddress,
    createAddress,
    amountWei,
    currency: formData.currency,
    amount: formData.amount
  });

  const privyUserIdForTx = getPrivyUserIdForDeveloperWallet({
    developerWallet,
    isConnected,
    address,
    privyUserId
  });

  await approveDeveloperWalletIfNeeded({
    publicClient,
    contracts,
    tokenAddress,
    createAddress,
    amountWei,
    currency: formData.currency,
    developerWallet,
    privyUserIdForTx,
    notifyInfo
  });

  const txResult = await DeveloperWalletService.sendTransaction({
    walletId: developerWallet.circle_wallet_id,
    walletAddress: developerWallet.wallet_address,
    contractAddress: contracts.contractAddress!,
    ...getDeveloperWalletCall({ formData, amountWei, tokenAddress, metadataUri }),
    blockchain: 'ARC-TESTNET',
    privyUserId: privyUserIdForTx,
    socialPlatform: developerWallet.social_platform || undefined,
    socialUserId: developerWallet.social_user_id || undefined
  });

  if (!txResult.success) {
    throw new Error(formatDeveloperWalletError(txResult.error || 'Failed to create gift card', formData.currency));
  }

  const finalTxHash = await resolveCircleTransactionHash({
    transactionId: txResult.transactionId,
    txHash: txResult.txHash,
    currency: formData.currency,
    notifyInfo,
    notifyWarning
  });

  if (!finalTxHash) {
    throw new Error('Failed to get transaction hash');
  }

  if (finalTxHash === 'pending' || finalTxHash === txResult.transactionId) {
    return {
      tokenId: 'pending',
      txHash: txResult.transactionId || 'pending'
    };
  }

  const receipt = await publicClient.waitForTransactionReceipt({
    hash: finalTxHash as `0x${string}`
  }) as any;

  if (receipt.status === 'reverted' || (typeof receipt.status === 'number' && receipt.status === 0)) {
    throw new Error(`Transaction failed: ERC20 transfer amount exceeds balance or other contract error. Transaction hash: ${finalTxHash}`);
  }

  return {
    tokenId: extractTokenIdFromReceipt(receipt, contracts, formData.recipientType),
    txHash: finalTxHash
  };
}

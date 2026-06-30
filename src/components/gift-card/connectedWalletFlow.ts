import { createWalletClient, custom } from 'viem';
import web3Service from '@/lib/web3/web3Service';
import type { GiftCardData } from './types';
import type { GiftCardCreationResult } from './flowTypes';
import { normalizeRecipientUsername } from './giftCardRequest';
import { createSocialGiftCard, saveSocialCardMapping } from './socialGiftCardAdapters';

export async function createGiftCardWithConnectedWallet(params: {
  walletClient: any;
  activeChain: any;
  activeChainId: number;
  createAddress: string;
  formData: GiftCardData;
  metadataUri: string;
}): Promise<GiftCardCreationResult> {
  const { activeChain, activeChainId, createAddress, formData, metadataUri } = params;
  let clientToUse = params.walletClient;
  if (!clientToUse) {
    clientToUse = createWalletClient({
      chain: activeChain,
      transport: custom((window as any).ethereum)
    });
  }

  await web3Service.initialize(clientToUse, createAddress, activeChainId);

  if (formData.recipientType === 'address') {
    return web3Service.createGiftCard(
      formData.recipientAddress,
      formData.amount,
      formData.currency,
      metadataUri,
      formData.message
    );
  }

  const normalizedUsername = normalizeConnectedWalletRecipientUsername(formData);
  const result = await createSocialGiftCard({ formData, normalizedUsername, metadataUri });
  await saveSocialCardMapping({
    formData,
    result,
    normalizedUsername,
    createAddress,
    metadataUri
  });

  return result;
}

function normalizeConnectedWalletRecipientUsername(formData: GiftCardData) {
  if (formData.recipientType === 'twitch') {
    return formData.recipientUsername.toLowerCase().trim();
  }

  return normalizeRecipientUsername(formData);
}

import type { GiftCardData } from './types';
import type { GiftCardCreationResult } from './flowTypes';

export function buildCreatedCardData(params: {
  result: GiftCardCreationResult;
  formData: GiftCardData;
  metadataUri: string;
}) {
  const { result, formData, metadataUri } = params;

  return {
    id: result.tokenId,
    recipientAddress: formData.recipientAddress,
    amount: formData.amount,
    currency: formData.currency,
    design: formData.design,
    message: formData.message,
    secretMessage: formData.secretMessage,
    hasTimer: formData.hasTimer,
    timerHours: formData.timerHours,
    hasPassword: formData.hasPassword,
    expiryDays: formData.expiryDays,
    customImage: formData.customImage,
    nftCover: formData.nftCover,
    status: 'active',
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + formData.expiryDays * 24 * 60 * 60 * 1000).toISOString(),
    qr_code: `/spend?tokenId=${result.tokenId}`,
    tx_hash: result.txHash,
    metadata_uri: metadataUri
  };
}

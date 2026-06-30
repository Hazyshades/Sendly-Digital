import type { RecipientType } from './types';

export function extractTokenIdFromReceipt(receipt: any, contracts: any, recipientType: RecipientType) {
  const transferEventSignature = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
  const zeroAddress = '0x0000000000000000000000000000000000000000';
  const zeroAddressTopic = `0x${zeroAddress.slice(2).padStart(64, '0')}`;
  const expectedAddress = getMintingContractAddress(contracts, recipientType);
  const transferEvent = receipt.logs.find((log: any) =>
    log.topics[0] === transferEventSignature &&
    log.topics[1]?.toLowerCase() === zeroAddressTopic.toLowerCase() &&
    (log.address.toLowerCase() === contracts.contractAddress!.toLowerCase() ||
      log.address.toLowerCase() === expectedAddress.toLowerCase())
  );

  if (transferEvent?.topics[3]) {
    return BigInt(transferEvent.topics[3]).toString();
  }

  return '1';
}

function getMintingContractAddress(contracts: any, recipientType: RecipientType) {
  switch (recipientType) {
    case 'twitter':
      return contracts.vaultContract!;
    case 'twitch':
      return contracts.twitchVault!;
    case 'telegram':
      return contracts.telegramVault!;
    case 'tiktok':
      return contracts.tiktokVault!;
    case 'instagram':
      return contracts.instagramVault!;
    case 'address':
      return contracts.contractAddress!;
  }
}

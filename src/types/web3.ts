export interface GiftCardInfo {
  tokenId: string;
  recipient: string;
  sender: string;
  amount: string;
  token: 'USDC' | 'EURC' | 'USYC' | 'PATHUSD' | 'ALPHAUSD' | 'BETAUSD' | 'THETAUSD';
  message: string;
  redeemed: boolean;
  type: 'sent' | 'received';
}

export interface BlockchainGiftCardInfo {
  amount: bigint;
  token: string;
  redeemed: boolean;
  message: string;
}






import type { GiftCardData } from './types';

export const INITIAL_GIFT_CARD_DATA: GiftCardData = {
  recipientType: 'address',
  recipientAddress: '',
  recipientUsername: '',
  amount: '1',
  currency: 'USDC',
  design: 'pink',
  message: '',
  secretMessage: '',
  hasTimer: false,
  timerHours: 24,
  hasPassword: false,
  password: '',
  expiryDays: 365,
  customImage: '',
  nftCover: ''
};

export const RESET_GIFT_CARD_DATA: GiftCardData = {
  ...INITIAL_GIFT_CARD_DATA,
  expiryDays: 7
};

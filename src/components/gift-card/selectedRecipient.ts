import type { GiftCardData, RecipientType, SocialRecipientType } from './types';

type StoredRecipient = {
  type?: unknown;
  username?: unknown;
  address?: unknown;
  displayName?: unknown;
};

export interface SelectedRecipientApplication {
  patch: Pick<GiftCardData, 'recipientType'> & Partial<Pick<GiftCardData, 'recipientAddress' | 'recipientUsername'>>;
  highlightField: SocialRecipientType | null;
  toastLabel: string;
}

const SOCIAL_RECIPIENT_TYPES = new Set<SocialRecipientType>([
  'twitter',
  'twitch',
  'telegram',
  'tiktok',
  'instagram'
]);

function isRecipientType(value: unknown): value is RecipientType {
  return value === 'address' || SOCIAL_RECIPIENT_TYPES.has(value as SocialRecipientType);
}

function formatAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function parseSelectedGiftCardRecipient(rawRecipient: string): SelectedRecipientApplication | null {
  const recipient = JSON.parse(rawRecipient) as StoredRecipient;

  if (!isRecipientType(recipient.type)) {
    return null;
  }

  if (recipient.type === 'address') {
    if (typeof recipient.address !== 'string') {
      return null;
    }

    return {
      patch: {
        recipientType: 'address',
        recipientAddress: recipient.address
      },
      highlightField: null,
      toastLabel: typeof recipient.displayName === 'string'
        ? recipient.displayName
        : formatAddress(recipient.address)
    };
  }

  if (typeof recipient.username !== 'string') {
    return null;
  }

  const username = ['telegram', 'tiktok', 'instagram'].includes(recipient.type)
    ? recipient.username.replace(/^@/, '')
    : recipient.username;

  return {
    patch: {
      recipientType: recipient.type,
      recipientUsername: username
    },
    highlightField: recipient.type,
    toastLabel: typeof recipient.displayName === 'string'
      ? recipient.displayName
      : recipient.username
  };
}

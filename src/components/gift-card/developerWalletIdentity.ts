import { normalizePrivyUserId } from '@/lib/circle/walletResolution';

export function getPrivyUserIdForDeveloperWallet(params: {
  developerWallet: any;
  isConnected: boolean;
  address?: string;
  privyUserId?: string;
}) {
  const { developerWallet, isConnected, address, privyUserId } = params;
  const walletCreatedWithAddress =
    developerWallet &&
    developerWallet.user_id &&
    developerWallet.user_id.startsWith('0x') &&
    !developerWallet.privy_user_id &&
    isConnected &&
    address &&
    developerWallet.user_id.toLowerCase() === address.toLowerCase();

  if (walletCreatedWithAddress) {
    return address!.toLowerCase();
  }

  if (privyUserId) {
    return normalizePrivyUserId(privyUserId);
  }

  if (isConnected && address) {
    return address.toLowerCase();
  }

  return undefined;
}

import { useEffect, useState } from 'react';
import { DeveloperWalletService } from '@/lib/circle/developerWalletService';
import type { SocialRecipientType, WalletSource } from './types';

const BLOCKCHAIN = 'ARC-TESTNET';
const SOCIAL_PLATFORMS: SocialRecipientType[] = ['twitter', 'twitch', 'telegram', 'tiktok', 'instagram'];

interface UseDeveloperWalletLookupParams {
  isConnected: boolean;
  authenticated: boolean;
  address?: string;
  privyUser: any;
}

export function useDeveloperWalletLookup({
  isConnected,
  authenticated,
  address,
  privyUser
}: UseDeveloperWalletLookupParams) {
  const [hasDeveloperWallet, setHasDeveloperWallet] = useState(false);
  const [developerWallet, setDeveloperWallet] = useState<any>(null);
  const [checkingWallet, setCheckingWallet] = useState(true);
  const [walletSource, setWalletSource] = useState<WalletSource>('metamask');

  useEffect(() => {
    let canceled = false;

    async function checkDeveloperWallet() {
      if (!isConnected && (!authenticated || !privyUser)) {
        if (!canceled) {
          setHasDeveloperWallet(false);
          setDeveloperWallet(null);
          setCheckingWallet(false);
        }
        return;
      }

      try {
        setCheckingWallet(true);
        const foundWallet =
          await findWalletByConnectedAddress(isConnected, address) ??
          await findWalletBySocialAccounts(privyUser) ??
          await findWalletByPrivyUserId(privyUser?.id);

        if (canceled) {
          return;
        }

        setHasDeveloperWallet(Boolean(foundWallet));
        setDeveloperWallet(foundWallet);

        if (foundWallet) {
          setWalletSource(isConnected ? 'metamask' : 'developer');
        } else if (isConnected) {
          setWalletSource('metamask');
        }
      } catch (error) {
        console.error('Error checking social wallet:', error);
        if (!canceled) {
          setHasDeveloperWallet(false);
          setDeveloperWallet(null);
          if (isConnected) {
            setWalletSource('metamask');
          }
        }
      } finally {
        if (!canceled) {
          setCheckingWallet(false);
        }
      }
    }

    checkDeveloperWallet();

    return () => {
      canceled = true;
    };
  }, [isConnected, authenticated, privyUser, address]);

  return {
    hasDeveloperWallet,
    developerWallet,
    checkingWallet,
    walletSource,
    setWalletSource
  };
}

async function findWalletByConnectedAddress(isConnected: boolean, address?: string) {
  if (!isConnected || !address) {
    return null;
  }

  try {
    return findArcWallet(await DeveloperWalletService.getWallets(address.toLowerCase().trim()));
  } catch (error) {
    return null;
  }
}

async function findWalletBySocialAccounts(privyUser: any) {
  if (!privyUser) {
    return null;
  }

  for (const platform of SOCIAL_PLATFORMS) {
    const socialUserId = getSocialUserId(privyUser, platform);
    if (!socialUserId) {
      continue;
    }

    const wallet = await DeveloperWalletService.getWalletBySocial(platform, socialUserId, BLOCKCHAIN);
    if (wallet) {
      return wallet;
    }
  }

  return null;
}

async function findWalletByPrivyUserId(privyUserId?: string) {
  if (!privyUserId) {
    return null;
  }

  try {
    const normalizedPrivyUserId = privyUserId.startsWith('did:privy:')
      ? privyUserId.replace('did:privy:', '')
      : privyUserId;
    return findArcWallet(await DeveloperWalletService.getWallets(normalizedPrivyUserId));
  } catch (error) {
    return null;
  }
}

function findArcWallet(wallets: any[]) {
  return wallets.find((wallet: any) => wallet.blockchain === BLOCKCHAIN) ?? wallets[0] ?? null;
}

function getSocialUserId(privyUser: any, platform: SocialRecipientType) {
  if (platform === 'twitter' && privyUser.twitter) {
    return privyUser.twitter.subject;
  }
  if (platform === 'twitch' && privyUser.twitch) {
    return privyUser.twitch.subject;
  }
  if (platform === 'telegram' && privyUser.telegram) {
    return privyUser.telegram.telegramUserId || privyUser.telegram.subject;
  }
  if (platform === 'tiktok' && privyUser.tiktok) {
    return privyUser.tiktok.subject;
  }
  if (platform === 'instagram' && privyUser.instagram) {
    return privyUser.instagram.subject;
  }

  return null;
}

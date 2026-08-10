import { useEffect, useState } from 'react';
import { useZkOAuthIdentity } from '@/lib/zk-oauth';
import { resolveInternalWallet } from '@/lib/circle/walletResolution';
import type { WalletSource } from './types';

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
  const { identity: zkOAuthIdentity, loading: zkOAuthLoading, isZkHost: zk } = useZkOAuthIdentity();
  const [hasDeveloperWallet, setHasDeveloperWallet] = useState(false);
  const [developerWallet, setDeveloperWallet] = useState<any>(null);
  const [checkingWallet, setCheckingWallet] = useState(true);
  const [walletSource, setWalletSource] = useState<WalletSource>('external');

  useEffect(() => {
    let canceled = false;

    async function checkDeveloperWallet() {
      if (zk && zkOAuthLoading) {
        return;
      }

      const hasZkSocial = zk && !!zkOAuthIdentity;
      const hasPrivySocial = authenticated && !!privyUser;

      if (!isConnected && !hasZkSocial && !hasPrivySocial) {
        if (!canceled) {
          setHasDeveloperWallet(false);
          setDeveloperWallet(null);
          setCheckingWallet(false);
        }
        return;
      }

      try {
        setCheckingWallet(true);
        const foundWallet = await resolveInternalWallet({
          address: isConnected && address ? address : undefined,
          zkIdentity: zkOAuthIdentity,
          privyUser: hasPrivySocial ? privyUser : undefined,
          privyUserId: hasPrivySocial ? privyUser?.id : undefined,
        });

        if (canceled) {
          return;
        }

        setHasDeveloperWallet(Boolean(foundWallet));
        setDeveloperWallet(foundWallet);

        if (foundWallet) {
          setWalletSource(isConnected ? 'external' : 'circle');
        } else if (isConnected) {
          setWalletSource('external');
        }
      } catch (error) {
        console.error('Error checking social wallet:', error);
        if (!canceled) {
          setHasDeveloperWallet(false);
          setDeveloperWallet(null);
          if (isConnected) {
            setWalletSource('external');
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
  }, [isConnected, authenticated, privyUser, address, zk, zkOAuthIdentity, zkOAuthLoading]);

  return {
    hasDeveloperWallet,
    developerWallet,
    checkingWallet,
    walletSource,
    setWalletSource
  };
}

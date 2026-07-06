import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAccount } from 'wagmi';

import type { WalletSource } from '@/components/zksend/WalletSourceToggle';
import { useCircleWallet } from '@/hooks/useCircleWallet';
import { usePrivySafe } from '@/lib/privy/usePrivySafe';
import { isZkHost } from '@/lib/runtime/zkHost';
import { useZkOAuthIdentity } from '@/lib/zk-oauth/useZkOAuthIdentity';

export type { WalletSource };

const STORAGE_KEY = 'sendly:wallet-source';

function readStoredWalletSource(): WalletSource {
  if (typeof sessionStorage === 'undefined') return 'external';
  const stored = sessionStorage.getItem(STORAGE_KEY);
  if (stored === 'circle' || stored === 'external') return stored;
  return 'external';
}

export function useWalletSourcePreference() {
  const { address, isConnected } = useAccount();
  const { developerWallet, hasDeveloperWallet, checkingWallet } = useCircleWallet();
  const { authenticated } = usePrivySafe();
  const { identity: zkOAuthIdentity, loading: zkOAuthLoading } = useZkOAuthIdentity();
  const zk = isZkHost();

  const hasExternalWallet = Boolean(isConnected && address);
  const hasInternalWallet = Boolean(hasDeveloperWallet && developerWallet?.wallet_address);
  const externalAddress = address ?? null;
  const internalAddress = developerWallet?.wallet_address ?? null;
  const hasSocialIdentity = (zk && !!zkOAuthIdentity) || authenticated;

  const [walletSource, setWalletSourceState] = useState<WalletSource>(readStoredWalletSource);

  const setWalletSource = useCallback((value: WalletSource) => {
    setWalletSourceState(value);
    try {
      sessionStorage.setItem(STORAGE_KEY, value);
    } catch {
      // ignore quota / private mode
    }
  }, []);

  useEffect(() => {
    if (!hasExternalWallet && walletSource === 'external' && hasInternalWallet) {
      setWalletSource('circle');
    } else if (!hasInternalWallet && walletSource === 'circle' && hasExternalWallet) {
      setWalletSource('external');
    }
  }, [hasExternalWallet, hasInternalWallet, walletSource, setWalletSource]);

  const activeAddress = useMemo(() => {
    if (walletSource === 'external' && hasExternalWallet && externalAddress) {
      return externalAddress;
    }
    if (walletSource === 'circle' && hasInternalWallet && internalAddress) {
      return internalAddress;
    }
    if (hasExternalWallet && externalAddress) return externalAddress;
    if (hasInternalWallet && internalAddress) return internalAddress;
    return null;
  }, [walletSource, hasExternalWallet, hasInternalWallet, externalAddress, internalAddress]);

  const isChecking = checkingWallet || (zk && zkOAuthLoading);

  return {
    walletSource,
    setWalletSource,
    activeAddress,
    hasExternalWallet,
    hasInternalWallet,
    hasSocialIdentity,
    checkingWallet: isChecking,
  };
}

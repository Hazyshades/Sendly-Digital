import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useAccount } from 'wagmi';
import { usePrivySafe } from '@/lib/privy/usePrivySafe';
import { type DeveloperWallet } from '@/lib/circle/developerWalletService';
import { useZkOAuthIdentity } from '@/lib/zk-oauth';
import {
  resolveInternalWallet,
  resolvePrivyUserIdForTx,
} from '@/lib/circle/walletResolution';

/**
 * Resolves privyUserId (or equivalent) for Circle wallet transaction verification.
 * Matches the logic used in CreateGiftCard.
 * Delegates to walletResolution.resolvePrivyUserIdForTx — keep this export path stable.
 */
export function getCircleWalletPrivyUserIdForTx(
  developerWallet: DeveloperWallet | null,
  connectedAddress: string | undefined,
  privyUserId: string | undefined
): string | undefined {
  return resolvePrivyUserIdForTx(developerWallet, connectedAddress, privyUserId);
}

export type UseCircleWalletResult = {
  developerWallet: DeveloperWallet | null;
  hasDeveloperWallet: boolean;
  checkingWallet: boolean;
};

const CircleWalletContext = createContext<UseCircleWalletResult | null>(null);

/**
 * Session-scoped Circle (Internal) wallet lookup for the app shell.
 * Mount once under Wagmi/Privy so tab switches do not remount the check.
 */
export function CircleWalletProvider({ children }: { children: ReactNode }) {
  const { address, isConnected } = useAccount();
  const { authenticated, user: privyUser } = usePrivySafe();
  const { identity: zkOAuthIdentity, loading: zkOAuthLoading, isZkHost: zk } = useZkOAuthIdentity();
  const [developerWallet, setDeveloperWallet] = useState<DeveloperWallet | null>(null);
  const [checkingWallet, setCheckingWallet] = useState(true);

  useEffect(() => {
    const check = async () => {
      if (zk && zkOAuthLoading) {
        return;
      }

      const hasZkSocial = zk && !!zkOAuthIdentity;
      const hasPrivySocial = authenticated && !!privyUser;

      if (!isConnected && !hasZkSocial && !hasPrivySocial) {
        setDeveloperWallet(null);
        setCheckingWallet(false);
        return;
      }

      try {
        setCheckingWallet(true);
        const found = await resolveInternalWallet({
          address: isConnected && address ? address : undefined,
          zkIdentity: zkOAuthIdentity,
          privyUser: hasPrivySocial ? privyUser : undefined,
          privyUserId: hasPrivySocial ? privyUser?.id : undefined,
        });
        setDeveloperWallet(found);
      } catch (err) {
        console.error('[useCircleWallet] Error checking Circle wallet:', err);
        setDeveloperWallet(null);
      } finally {
        setCheckingWallet(false);
      }
    };

    void check();
  }, [isConnected, address, authenticated, privyUser, zk, zkOAuthIdentity, zkOAuthLoading]);

  const value = useMemo<UseCircleWalletResult>(
    () => ({
      developerWallet,
      hasDeveloperWallet: developerWallet != null,
      checkingWallet,
    }),
    [developerWallet, checkingWallet],
  );

  return <CircleWalletContext.Provider value={value}>{children}</CircleWalletContext.Provider>;
}

/**
 * Looks up Circle (Internal) wallet for the current user from the shared session context.
 * Requires `CircleWalletProvider` above (mounted in AppContent).
 */
export function useCircleWallet(): UseCircleWalletResult {
  const ctx = useContext(CircleWalletContext);
  if (!ctx) {
    throw new Error('useCircleWallet must be used within CircleWalletProvider');
  }
  return ctx;
}

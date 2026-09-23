import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useAccount, useChainId } from 'wagmi';
import { usePrivySafe } from '@/lib/privy/usePrivySafe';
import { type DeveloperWallet } from '@/lib/circle/developerWalletService';
import { INTERNAL_WALLET_UPDATED_EVENT } from '@/lib/circle/walletEvents';
import {
  circleBlockchainForChainId,
  supportsInternalWalletForChain,
} from '@/lib/circle/blockchain';
import { ARC_CHAIN_ID } from '@/lib/web3/constants';
import { useZkOAuthIdentity } from '@/lib/zk-oauth';
import { ZK_OAUTH_IDENTITY_UPDATED_EVENT } from '@/lib/zk-oauth/tokenStorage';
import { readPersistedTelegramIdentity } from '@/lib/zk-oauth/telegramSession';
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

function telegramZkIdentityFromPersist(): { platform: string; socialUserId: string } | null {
  const persisted = readPersistedTelegramIdentity();
  if (!persisted) return null;
  return { platform: 'telegram', socialUserId: persisted.socialUserId };
}

/**
 * Session-scoped Circle (Internal) wallet lookup for the app shell.
 * Mount once under Wagmi/Privy so tab switches do not remount the check.
 */
export function CircleWalletProvider({ children }: { children: ReactNode }) {
  const { address, isConnected } = useAccount();
  const connectedChainId = useChainId();
  const activeChainId = connectedChainId || ARC_CHAIN_ID;
  const { authenticated, user: privyUser } = usePrivySafe();
  const { identity: zkOAuthIdentity, loading: zkOAuthLoading, isZkHost: zk } = useZkOAuthIdentity();
  const [developerWallet, setDeveloperWallet] = useState<DeveloperWallet | null>(null);
  const [checkingWallet, setCheckingWallet] = useState(true);
  const [lookupEpoch, setLookupEpoch] = useState(0);

  useEffect(() => {
    const onIdentityUpdated = () => setLookupEpoch((n) => n + 1);
    const onWalletUpdated = (event: Event) => {
      const wallet = (event as CustomEvent<{ wallet?: DeveloperWallet | null }>).detail?.wallet;
      if (wallet) {
        setDeveloperWallet(wallet);
        setCheckingWallet(false);
        return;
      }
      setLookupEpoch((n) => n + 1);
    };
    window.addEventListener(ZK_OAUTH_IDENTITY_UPDATED_EVENT, onIdentityUpdated);
    window.addEventListener(INTERNAL_WALLET_UPDATED_EVENT, onWalletUpdated);
    return () => {
      window.removeEventListener(ZK_OAUTH_IDENTITY_UPDATED_EVENT, onIdentityUpdated);
      window.removeEventListener(INTERNAL_WALLET_UPDATED_EVENT, onWalletUpdated);
    };
  }, []);

  useEffect(() => {
    const check = async () => {
      if (!supportsInternalWalletForChain(activeChainId)) {
        setDeveloperWallet(null);
        setCheckingWallet(false);
        return;
      }

      const blockchain = circleBlockchainForChainId(activeChainId);
      if (!blockchain) {
        setDeveloperWallet(null);
        setCheckingWallet(false);
        return;
      }

      if (zk && zkOAuthLoading) {
        return;
      }

      const persistedTelegram = zk ? telegramZkIdentityFromPersist() : null;
      const zkIdentity = zkOAuthIdentity ?? persistedTelegram;
      const hasZkSocial = zk && !!zkIdentity;
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
          zkIdentity,
          privyUser: hasPrivySocial ? privyUser : undefined,
          privyUserId: hasPrivySocial ? privyUser?.id : undefined,
          blockchain,
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
  }, [
    isConnected,
    address,
    authenticated,
    privyUser,
    zk,
    zkOAuthIdentity,
    zkOAuthLoading,
    lookupEpoch,
    activeChainId,
  ]);

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

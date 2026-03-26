import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { usePrivySafe } from '@/lib/privy/usePrivySafe';
import { DeveloperWalletService, type DeveloperWallet } from '@/lib/circle/developerWalletService';

const BLOCKCHAIN = 'ARC-TESTNET';
const SOCIAL_PLATFORMS = ['twitter', 'twitch', 'telegram', 'tiktok', 'instagram'] as const;

/**
 * Resolves privyUserId (or equivalent) for Circle wallet transaction verification.
 * Matches the logic used in CreateGiftCard.
 */
export function getCircleWalletPrivyUserIdForTx(
  developerWallet: DeveloperWallet | null,
  connectedAddress: string | undefined,
  privyUserId: string | undefined
): string | undefined {
  if (!developerWallet) return undefined;

  const walletCreatedWithAddress =
    developerWallet.user_id?.startsWith('0x') &&
    !developerWallet.privy_user_id &&
    connectedAddress &&
    developerWallet.user_id.toLowerCase() === connectedAddress.toLowerCase();

  if (walletCreatedWithAddress && connectedAddress) {
    return connectedAddress.toLowerCase();
  }
  if (privyUserId) {
    return privyUserId.startsWith('did:privy:') ? privyUserId.replace('did:privy:', '') : privyUserId;
  }
  if (connectedAddress) {
    return connectedAddress.toLowerCase();
  }
  return undefined;
}

export type UseCircleWalletResult = {
  developerWallet: DeveloperWallet | null;
  hasDeveloperWallet: boolean;
  checkingWallet: boolean;
};

/**
 * Looks up Circle (Internal) wallet for the current user:
 * 1. By connected wallet address (MetaMask/Rabby)
 * 2. By linked social platforms (Privy user)
 * 3. By Privy User ID
 */
export function useCircleWallet(): UseCircleWalletResult {
  const { address, isConnected } = useAccount();
  const { authenticated, user: privyUser } = usePrivySafe();
  const [developerWallet, setDeveloperWallet] = useState<DeveloperWallet | null>(null);
  const [checkingWallet, setCheckingWallet] = useState(true);

  useEffect(() => {
    const check = async () => {
      if (!isConnected && (!authenticated || !privyUser)) {
        setDeveloperWallet(null);
        setCheckingWallet(false);
        return;
      }

      try {
        setCheckingWallet(true);
        let found: DeveloperWallet | null = null;

        if (isConnected && address) {
          const normalized = address.toLowerCase().trim();
          try {
            const wallets = await DeveloperWalletService.getWallets(normalized);
            found = wallets.find((w) => w.blockchain === BLOCKCHAIN) ?? wallets[0] ?? null;
          } catch {
            // ignore
          }
        }

        if (!found && privyUser) {
          for (const platform of SOCIAL_PLATFORMS) {
            let socialUserId: string | null = null;
            if (platform === 'twitter' && privyUser.twitter) {
              socialUserId = (privyUser.twitter as { subject?: string }).subject ?? null;
            } else if (platform === 'twitch' && privyUser.twitch) {
              socialUserId = (privyUser.twitch as { subject?: string }).subject ?? null;
            } else if (platform === 'telegram' && privyUser.telegram) {
              const t = privyUser.telegram as { telegramUserId?: string; subject?: string };
              socialUserId = t.telegramUserId ?? t.subject ?? null;
            } else if (platform === 'tiktok' && (privyUser as { tiktok?: { subject?: string } }).tiktok) {
              socialUserId = (privyUser as { tiktok: { subject?: string } }).tiktok.subject ?? null;
            } else if (platform === 'instagram' && (privyUser as { instagram?: { subject?: string } }).instagram) {
              socialUserId = (privyUser as { instagram: { subject?: string } }).instagram.subject ?? null;
            }
            if (socialUserId) {
              try {
                const w = await DeveloperWalletService.getWalletBySocial(platform, socialUserId, BLOCKCHAIN);
                if (w) {
                  found = w;
                  break;
                }
              } catch {
                // continue
              }
            }
          }
        }

        if (!found && privyUser?.id) {
          try {
            const normalizedPrivy = privyUser.id.startsWith('did:privy:')
              ? privyUser.id.replace('did:privy:', '')
              : privyUser.id;
            const wallets = await DeveloperWalletService.getWallets(normalizedPrivy);
            found = wallets.find((w) => w.blockchain === BLOCKCHAIN) ?? wallets[0] ?? null;
          } catch {
            // ignore
          }
        }

        setDeveloperWallet(found);
      } catch (err) {
        console.error('[useCircleWallet] Error checking Circle wallet:', err);
        setDeveloperWallet(null);
      } finally {
        setCheckingWallet(false);
      }
    };

    void check();
  }, [isConnected, address, authenticated, privyUser]);

  return {
    developerWallet,
    hasDeveloperWallet: developerWallet != null,
    checkingWallet,
  };
}

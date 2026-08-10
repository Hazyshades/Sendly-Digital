import { useState, useEffect, useCallback } from 'react';
import { Gift, Clock, CheckCircle, AlertCircle, Send, Music, Instagram as InstagramIcon, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from '@/components/ui/empty';
import { Spinner } from '@/components/ui/spinner';
import { toast } from 'sonner';
import { usePrivySafe } from '@/lib/privy/usePrivySafe';
import { useAccount } from 'wagmi';
import { PrivyAuthModal } from './PrivyAuthModal';
import { WalletChoiceModal } from './WalletChoiceModal';
import {
  GIFT_CARD_PLATFORMS,
  getGiftCardPlatform,
  type GiftCardPlatform,
} from '@/lib/giftCards/registry';
import {
  claimCard,
  fetchPendingCards,
  identitiesFromPrivyUser,
  type PendingCard,
} from '@/lib/giftCards/claimService';

interface ClaimCardsProps {
  onCardClaimed?: () => void;
  onPendingCountChange?: (count: number) => void;
  autoLoad?: boolean;
  /** Optional platform filter (used by ClaimTwitchCards wrapper). */
  platforms?: readonly GiftCardPlatform[];
}

function toastClaimSuccess(result: { txHash?: string; transactionId?: string }) {
  if (!result.txHash && result.transactionId) {
    toast.info('Transaction submitted. Waiting for confirmation...');
    toast.success(`Card claimed successfully! Transaction ID: ${result.transactionId.slice(0, 8)}...`);
  } else if (result.txHash) {
    toast.success(`Card claimed successfully! TX: ${result.txHash.slice(0, 10)}...`);
  } else {
    toast.success('Card claimed successfully!');
  }
}

export function ClaimCards({
  onCardClaimed,
  onPendingCountChange,
  autoLoad = false,
  platforms,
}: ClaimCardsProps) {
  const { authenticated, user } = usePrivySafe();
  const { address, isConnected } = useAccount();
  const [pendingCards, setPendingCards] = useState<PendingCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimingTokenId, setClaimingTokenId] = useState<string | null>(null);
  const [isPrivyModalOpen, setIsPrivyModalOpen] = useState(false);
  const [isWalletChoiceModalOpen, setIsWalletChoiceModalOpen] = useState(false);
  const [selectedCardForClaim, setSelectedCardForClaim] = useState<PendingCard | null>(null);

  const allowedPlatforms = platforms ?? GIFT_CARD_PLATFORMS;
  const allowedKey = allowedPlatforms.join(',');

  const loadPending = useCallback(async () => {
    if (!authenticated || !user) {
      setPendingCards([]);
      setLoading(false);
      onPendingCountChange?.(0);
      return;
    }

    try {
      setLoading(true);
      const allowed = allowedKey.split(',') as GiftCardPlatform[];
      const identities = identitiesFromPrivyUser(user).filter((id) =>
        allowed.includes(id.platform),
      );
      if (identities.length === 0) {
        setPendingCards([]);
        onPendingCountChange?.(0);
        return;
      }

      const cards = await fetchPendingCards(identities);
      setPendingCards(cards);
      onPendingCountChange?.(cards.length);
    } catch (error) {
      console.error('Error fetching pending cards:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (!errorMessage.includes('No pending cards') && !errorMessage.includes('not found')) {
        toast.error(`Failed to load pending cards: ${errorMessage}`);
      }
      setPendingCards([]);
      onPendingCountChange?.(0);
    } finally {
      setLoading(false);
    }
  }, [authenticated, user, allowedKey, onPendingCountChange]);

  useEffect(() => {
    if (authenticated) {
      void loadPending();
    } else {
      setPendingCards([]);
      setLoading(false);
      onPendingCountChange?.(0);
    }
  }, [authenticated, loadPending, onPendingCountChange]);

  useEffect(() => {
    if (autoLoad && authenticated) {
      void loadPending();
    }
  }, [autoLoad, authenticated, loadPending]);

  const runClaim = async (card: PendingCard, walletSource: 'internal' | 'browser') => {
    if (!user?.id) {
      toast.error('Privy user ID not found. Please ensure you are logged in.');
      return;
    }

    try {
      setClaimingTokenId(card.tokenId);
      if (walletSource === 'internal') {
        toast.info('Claiming card via Internal Wallet...');
      } else {
        toast.info('Claiming card from vault...');
      }

      const result = await claimCard({
        card,
        walletSource,
        session: {
          privyUser: user,
          privyUserId: user.id,
          address,
          isConnected,
          requestTestnetFaucet: true,
          onProgress: (message, kind = 'info') => {
            if (kind === 'success') toast.success(message);
            else if (kind === 'warn') toast.message(message);
            else toast.info(message);
          },
        },
      });

      toastClaimSuccess(result);
      await loadPending();
      setSelectedCardForClaim(null);
      onCardClaimed?.();
    } catch (error) {
      console.error('Error claiming card:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to claim card');
    } finally {
      setClaimingTokenId(null);
    }
  };

  const handleCreateWalletAndClaim = async () => {
    if (!selectedCardForClaim) return;
    setIsWalletChoiceModalOpen(false);
    await runClaim(selectedCardForClaim, 'internal');
  };

  const handleClaim = async (card: PendingCard, useDeveloperWallet: boolean = false) => {
    if (!authenticated) {
      setIsPrivyModalOpen(true);
      toast.info(
        `Please login with ${getGiftCardPlatform(card.cardType).displayName} via Privy to claim this card`,
      );
      return;
    }

    if (!useDeveloperWallet && (!isConnected || !address)) {
      setSelectedCardForClaim(card);
      setIsWalletChoiceModalOpen(true);
      return;
    }

    await runClaim(card, useDeveloperWallet || !isConnected || !address ? 'internal' : 'browser');
  };

  const identities = authenticated && user ? identitiesFromPrivyUser(user) : [];
  const visibleIdentities = identities.filter((id) => allowedPlatforms.includes(id.platform));

  if (!authenticated || visibleIdentities.length === 0) {
    const labels = allowedPlatforms.map((p) => getGiftCardPlatform(p).displayName).join(', ');
    return (
      <div className="p-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please login with {labels} via Privy to see and claim gift cards sent to your username.
          </AlertDescription>
        </Alert>
        <div className="mt-4">
          <Button onClick={() => setIsPrivyModalOpen(true)}>Login with Privy</Button>
        </div>
        <PrivyAuthModal isOpen={isPrivyModalOpen} onClose={() => setIsPrivyModalOpen(false)} />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center gap-2">
        <Spinner className="w-6 h-6 text-gray-400" />
        <span className="text-gray-600">Loading pending cards...</span>
      </div>
    );
  }

  if (pendingCards.length === 0) {
    return (
      <div className="p-6">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Gift className="w-16 h-16 text-gray-400" />
            </EmptyMedia>
            <EmptyTitle>No Pending Cards</EmptyTitle>
            <EmptyDescription>
              You don&apos;t have any gift cards waiting to be claimed.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  const usernames = visibleIdentities.map((id) => {
    const name = getGiftCardPlatform(id.platform).normalizeHandle(String(id.username));
    if (id.platform === 'twitter') return `@${name}`;
    if (id.platform === 'twitch') return `${name} (Twitch)`;
    return `@${name} (${getGiftCardPlatform(id.platform).displayName})`;
  });

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Pending Gift Cards ({pendingCards.length})</h2>
          <p className="text-sm text-gray-600 mt-1">
            Gift cards sent to {usernames.join(' and ')}
          </p>
        </div>
      </div>

      <div className="grid gap-4">
        {pendingCards.map((card) => (
          <Card key={`${card.cardType}-${card.tokenId}`} className="relative">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                      <Clock className="w-3 h-3 mr-1" />
                      Pending
                    </Badge>
                    <Badge
                      variant="outline"
                      className={
                        card.cardType === 'twitter'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : card.cardType === 'twitch'
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : card.cardType === 'telegram'
                              ? 'bg-sky-50 text-sky-700 border-sky-200'
                              : card.cardType === 'tiktok'
                                ? 'bg-black text-white border-black'
                                : 'bg-pink-50 text-pink-600 border-pink-200'
                      }
                    >
                      {card.cardType === 'twitter' ? (
                        <>
                          <svg viewBox="0 0 24 24" fill="currentColor" className="size-3">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                          </svg>
                          X.com
                        </>
                      ) : card.cardType === 'twitch' ? (
                        <>
                          <svg viewBox="0 0 24 24" fill="currentColor" className="size-3">
                            <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z" />
                          </svg>
                          Twitch
                        </>
                      ) : card.cardType === 'telegram' ? (
                        <>
                          <Send className="w-3 h-3" />
                          Telegram
                        </>
                      ) : card.cardType === 'tiktok' ? (
                        <>
                          <Music className="w-3 h-3" />
                          TikTok
                        </>
                      ) : (
                        <>
                          <InstagramIcon className="w-3 h-3" />
                          Instagram
                        </>
                      )}
                    </Badge>
                    <span className="text-sm text-gray-500">Card #{card.tokenId}</span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold">${card.amount}</span>
                      <span className="text-sm text-gray-500">{card.currency}</span>
                    </div>

                    {card.message && <p className="text-gray-700 italic">&quot;{card.message}&quot;</p>}

                    <div className="text-sm text-gray-500">
                      From:{' '}
                      {card.senderAddress
                        ? `${card.senderAddress.slice(0, 6)}...${card.senderAddress.slice(-4)}`
                        : 'Unknown'}
                    </div>

                    <div className="text-xs text-gray-400">
                      Created: {new Date(card.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  {isConnected && address ? (
                    <div className="flex flex-col gap-2">
                      <Button
                        onClick={() => handleClaim(card, false)}
                        disabled={claimingTokenId === card.tokenId}
                        className="min-w-[120px]"
                      >
                        {claimingTokenId === card.tokenId ? (
                          <>
                            <Spinner className="w-4 h-4 mr-2" />
                            Claiming...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Claim with MetaMask
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={() => handleClaim(card, true)}
                        disabled={claimingTokenId === card.tokenId}
                        variant="outline"
                        className="min-w-[120px]"
                      >
                        <Wallet className="w-4 h-4 mr-2" />
                        Use Internal Wallet
                      </Button>
                    </div>
                  ) : (
                    <Button
                      onClick={() => handleClaim(card, true)}
                      disabled={claimingTokenId === card.tokenId}
                      className="min-w-[120px]"
                    >
                      {claimingTokenId === card.tokenId ? (
                        <>
                          <Spinner className="w-4 h-4 mr-2" />
                          Claiming...
                        </>
                      ) : (
                        <>
                          <Wallet className="w-4 h-4 mr-2" />
                          Claim with Internal Wallet
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <PrivyAuthModal isOpen={isPrivyModalOpen} onClose={() => setIsPrivyModalOpen(false)} />

      <WalletChoiceModal
        isOpen={isWalletChoiceModalOpen}
        onClose={() => {
          setIsWalletChoiceModalOpen(false);
          setSelectedCardForClaim(null);
        }}
        onCreateWallet={handleCreateWalletAndClaim}
      />
    </div>
  );
}

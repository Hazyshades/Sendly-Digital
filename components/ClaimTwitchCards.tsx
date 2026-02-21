import { useState, useEffect } from 'react';
import { Gift, Clock, CheckCircle, AlertCircle, Wallet } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from './ui/empty';
import { Spinner } from './ui/spinner';
import { toast } from 'sonner';
import { usePrivySafe } from '../utils/privy/usePrivySafe';
import { useAccount } from 'wagmi';
import { createWalletClient, custom } from 'viem';
import { arcTestnet } from '../utils/web3/wagmiConfig';
import web3Service from '../utils/web3/web3Service';
import { getTwitchCardMapping, type TwitchCardMapping } from '../utils/twitch';
import { PrivyAuthModal } from './PrivyAuthModal';
import { DeveloperWalletService } from '../utils/circle/developerWalletService';
import { TWITCH_VAULT_CONTRACT_ADDRESS } from '../utils/web3/constants';
import { WalletChoiceModal } from './WalletChoiceModal';

export function ClaimTwitchCards() {
  const { authenticated, user } = usePrivySafe();
  const { address, isConnected } = useAccount();
  const [pendingCards, setPendingCards] = useState<TwitchCardMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimingTokenId, setClaimingTokenId] = useState<string | null>(null);
  const [isPrivyModalOpen, setIsPrivyModalOpen] = useState(false);
  const [isWalletChoiceModalOpen, setIsWalletChoiceModalOpen] = useState(false);
  const [selectedCardForClaim, setSelectedCardForClaim] = useState<TwitchCardMapping | null>(null);

  useEffect(() => {
    if (authenticated && user?.twitch?.username) {
      fetchPendingCards();
    } else {
      setPendingCards([]);
      setLoading(false);
    }
  }, [authenticated, user?.twitch?.username]);

  const fetchPendingCards = async () => {
    if (!user?.twitch?.username) return;

    try {
      setLoading(true);
      const username = user.twitch.username;
      console.log('[ClaimTwitchCards] Fetching pending cards for username:', username);
      
      // publicClient should work without wallet connection (it's created in constructor)
      // But ensure it's available
      if (!web3Service) {
        throw new Error('Web3Service not initialized');
      }
      
      const tokenIds = await web3Service.getPendingTwitchCards(username);
      console.log('[ClaimTwitchCards] Received token IDs from Vault:', tokenIds);
      
      const cardsWithMetadata = await Promise.all(
        tokenIds.map(async (tokenId) => {
          const metadata = await getTwitchCardMapping(tokenId);
          if (metadata) {
            return metadata;
          }
          return {
            tokenId,
            username,
            temporaryOwner: '',
            senderAddress: '',
            amount: '0',
            currency: 'USDC',
            message: '',
            metadataUri: '',
            status: 'pending' as const,
            createdAt: new Date().toISOString(),
            claimedAt: null,
            realOwner: null
          };
        })
      );
      
      setPendingCards(cardsWithMetadata);
    } catch (error) {
      console.error('Error fetching pending Twitch cards:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[ClaimTwitchCards] Error details:', errorMessage);
      
      // Don't show error toast if it's just that there are no cards
      // Only show error if it's a real problem
      if (!errorMessage.includes('No pending cards') && !errorMessage.includes('not found')) {
        toast.error(`Failed to load pending cards: ${errorMessage}`);
      }
      
      // Set empty array on error so UI shows "No Pending Cards" instead of error
      setPendingCards([]);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to get Twitch ID from Privy user
  const getTwitchUserId = (): string | null => {
    if (!user?.linkedAccounts) return null;
    
    const twitchAccount = user.linkedAccounts.find(
      (account: any) => 
        account.type === 'twitch' || 
        account.type === 'twitch_oauth' ||
        account.provider === 'twitch'
    );
    
    // Safely access subject or id properties
    if (!twitchAccount) return null;
    return (twitchAccount as any)?.subject || (twitchAccount as any)?.id || null;
  };

  // Handle creating Internal wallet and claiming card
  const handleCreateWalletAndClaim = async () => {
    if (!selectedCardForClaim) return;

    try {
      setClaimingTokenId(selectedCardForClaim.tokenId);
      
      if (!user?.twitch) {
        toast.error('Twitch account not found');
        setClaimingTokenId(null);
        return;
      }

      const twitchUsername = user.twitch.username;
      if (!twitchUsername) {
        toast.error('Twitch username not found');
        setClaimingTokenId(null);
        return;
      }

      const normalizedLoggedIn = twitchUsername.toLowerCase().trim();
      const normalizedCard = selectedCardForClaim.username.toLowerCase().trim();
      
      if (normalizedLoggedIn !== normalizedCard) {
        toast.error('This card is not for your Twitch account');
        setClaimingTokenId(null);
        return;
      }

      const privyUserId = user.id;
      const twitchUserId = getTwitchUserId();

      if (!privyUserId || !twitchUserId) {
        toast.error('Privy user ID or Twitch ID not found. Please ensure you are logged in with Twitch.');
        setClaimingTokenId(null);
        return;
      }

      // Check if Internal wallet exists
      let devWallet = await DeveloperWalletService.getWalletBySocial('twitch', twitchUserId);
      
      if (!devWallet) {
        // Create Internal wallet automatically
        toast.info('Creating internal wallet for receiving donations...');
        const createResult = await DeveloperWalletService.createWalletForSocial(
          'twitch',
          twitchUserId,
          normalizedLoggedIn,
          privyUserId
        );
        
        if (!createResult.success || !createResult.wallet) {
          throw new Error('Failed to create Internal wallet');
        }
        
        devWallet = createResult.wallet;
        toast.success('Internal wallet created successfully!');
        
        // Request testnet tokens for the new wallet
        try {
          toast.info('Requesting testnet tokens for the wallet...');
          const tokenResult = await DeveloperWalletService.requestTestnetTokens(
            devWallet.wallet_address,
            'ARC-TESTNET'
          );
          
          if (tokenResult.success) {
            toast.success('Testnet tokens requested successfully!');
          } else {
            console.warn('Failed to request testnet tokens (non-critical):', tokenResult);
            // Don't block the process if the token request fails
          }
        } catch (tokenError) {
          console.warn('Error requesting testnet tokens (non-critical):', tokenError);
          // Don't block the process if the token request fails
        }
      }

      // Claim via Internal wallet
      toast.info('Claiming card via internal wallet...');
      
      const txResult = await DeveloperWalletService.sendTransaction({
        walletId: devWallet.circle_wallet_id,
        walletAddress: devWallet.wallet_address,
        contractAddress: TWITCH_VAULT_CONTRACT_ADDRESS,
        functionName: 'claimCard',
        args: [BigInt(selectedCardForClaim.tokenId), normalizedLoggedIn, devWallet.wallet_address],
        blockchain: 'ARC-TESTNET',
        privyUserId: privyUserId,
        socialPlatform: 'twitch',
        socialUserId: twitchUserId
      });

      if (!txResult.success) {
        throw new Error(txResult.error || 'Failed to claim card via Internal wallet');
      }

      // If there is no txHash yet but there is a transactionId - that's normal, the transaction is queued
      if (!txResult.txHash && txResult.transactionId) {
        toast.info('Transaction submitted. Waiting for confirmation...');
        console.log('Transaction ID:', txResult.transactionId, 'State:', txResult.transactionState);
        toast.success(`Transaction submitted! ID: ${txResult.transactionId.slice(0, 8)}...`);
      } else if (txResult.txHash) {
        toast.success(`Card claimed successfully! TX: ${txResult.txHash.slice(0, 10)}...`);
      } else {
        toast.success('Transaction submitted successfully!');
      }
      await fetchPendingCards();
      setClaimingTokenId(null);
      setSelectedCardForClaim(null);
    } catch (error) {
      console.error('Error creating wallet and claiming card:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create wallet and claim card';
      toast.error(errorMessage);
      setClaimingTokenId(null);
      setSelectedCardForClaim(null);
    }
  };

  const handleClaim = async (card: TwitchCardMapping, useDeveloperWallet: boolean = false) => {
    if (!authenticated || !user?.twitch) {
      setIsPrivyModalOpen(true);
      toast.info('Please login with Twitch via Privy to claim this card');
      return;
    }

    const twitchUsername = user.twitch.username;
    if (!twitchUsername) {
      toast.error('Twitch username not found');
      return;
    }

    const normalizedLoggedIn = twitchUsername.toLowerCase().trim();
    const normalizedCard = card.username.toLowerCase().trim();
    
    if (normalizedLoggedIn !== normalizedCard) {
      toast.error('This card is not for your Twitch account');
      return;
    }

    // If no wallet and not using Internal wallet, show wallet choice modal
    if (!useDeveloperWallet && (!isConnected || !address)) {
      setSelectedCardForClaim(card);
      setIsWalletChoiceModalOpen(true);
      return;
    }

    try {
      setClaimingTokenId(card.tokenId);
      
      const privyUserId = user.id;
      const twitchUserId = getTwitchUserId();

      // If there is no MetaMask or a social Internal wallet is selected
      if (useDeveloperWallet || !isConnected || !address) {
        if (!privyUserId || !twitchUserId) {
          throw new Error('Privy user ID or Twitch ID not found. Please ensure you are logged in with Twitch.');
        }

        // Check if Internal wallet exists
        let devWallet = await DeveloperWalletService.getWalletBySocial('twitch', twitchUserId);
        
        if (!devWallet) {
          // Create Internal wallet automatically
          toast.info('Creating internal wallet for receiving donations...');
          const createResult = await DeveloperWalletService.createWalletForSocial(
            'twitch',
            twitchUserId,
            normalizedLoggedIn,
            privyUserId
          );
          
          if (!createResult.success || !createResult.wallet) {
            throw new Error('Failed to create Internal wallet');
          }
          
          devWallet = createResult.wallet;
          toast.success('Internal wallet created successfully!');
        }

        // Claim via Internal wallet
        toast.info('Claiming card via internal wallet...');
        
        const txResult = await DeveloperWalletService.sendTransaction({
          walletId: devWallet.circle_wallet_id,
          walletAddress: devWallet.wallet_address,
          contractAddress: TWITCH_VAULT_CONTRACT_ADDRESS,
          functionName: 'claimCard',
          args: [BigInt(card.tokenId), normalizedLoggedIn, devWallet.wallet_address],
          blockchain: 'ARC-TESTNET',
          privyUserId: privyUserId,
          socialPlatform: 'twitch',
          socialUserId: twitchUserId
        });

        if (!txResult.success || !txResult.txHash) {
          throw new Error(txResult.error || 'Failed to claim card via Internal wallet');
        }

        toast.success(`Card claimed successfully! TX: ${txResult.txHash.slice(0, 10)}...`);
        await fetchPendingCards();
        setClaimingTokenId(null);
        return;
      }

      // Use MetaMask (current logic)
      if (!address) {
        throw new Error('No wallet address found. Please connect your wallet.');
      }

      const walletClient = createWalletClient({
        chain: arcTestnet,
        transport: custom(window.ethereum)
      });

      await web3Service.initialize(walletClient, address);
      
      toast.info('Claiming card from vault...');
      
      const txHash = await web3Service.claimTwitchCard(
        card.tokenId,
        twitchUsername
      );

      toast.success(`Card claimed successfully! TX: ${txHash.slice(0, 10)}...`);
      
      await fetchPendingCards();
      setClaimingTokenId(null);
    } catch (error) {
      console.error('Error claiming Twitch card:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to claim card';
      toast.error(errorMessage);
      setClaimingTokenId(null);
    }
  };

  if (!authenticated || !user?.twitch) {
    return (
      <div className="p-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please login with Twitch via Privy to see and claim gift cards sent to your Twitch username.
          </AlertDescription>
        </Alert>
        <div className="mt-4">
          <Button onClick={() => setIsPrivyModalOpen(true)}>
            Login with Privy
          </Button>
        </div>
        <PrivyAuthModal 
          isOpen={isPrivyModalOpen} 
          onClose={() => setIsPrivyModalOpen(false)} 
        />
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
              You don't have any gift cards waiting to be claimed.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Pending Gift Cards ({pendingCards.length})</h2>
          <p className="text-sm text-gray-600 mt-1">
            Gift cards sent to <strong>{user.twitch.username}</strong>
          </p>
        </div>
      </div>

      <div className="grid gap-4">
        {pendingCards.map((card) => (
          <Card key={card.tokenId} className="relative">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                      <Clock className="w-3 h-3 mr-1" />
                      Pending
                    </Badge>
                    <span className="text-sm text-gray-500">Card #{card.tokenId}</span>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold">${card.amount}</span>
                      <span className="text-sm text-gray-500">{card.currency}</span>
                    </div>
                    
                    {card.message && (
                      <p className="text-gray-700 italic">"{card.message}"</p>
                    )}
                    
                    <div className="text-sm text-gray-500">
                      From: {card.senderAddress.slice(0, 6)}...{card.senderAddress.slice(-4)}
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
                  
                  {!isConnected && (
                    <span className="text-xs text-gray-500 text-center">
                      No MetaMask? Use internal wallet
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <PrivyAuthModal 
        isOpen={isPrivyModalOpen} 
        onClose={() => setIsPrivyModalOpen(false)} 
      />
      
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





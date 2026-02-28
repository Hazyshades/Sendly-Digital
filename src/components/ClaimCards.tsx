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
import { createWalletClient, custom, createPublicClient, http } from 'viem';
import { arcTestnet } from '@/lib/web3/wagmiConfig';
import web3Service from '@/lib/web3/web3Service';
import { getTwitterCardMapping, claimTwitterCard, type TwitterCardMapping } from '@/lib/twitter';
import { getTwitchCardMapping, claimTwitchCard, type TwitchCardMapping } from '@/lib/twitch';
import { getTelegramCardMapping, claimTelegramCard, type TelegramCardMapping } from '@/lib/telegram';
import { getTikTokCardMapping, claimTikTokCard, type TikTokCardMapping } from '@/lib/tiktok';
import { getInstagramCardMapping, claimInstagramCard, type InstagramCardMapping } from '@/lib/instagram';
import { PrivyAuthModal } from './PrivyAuthModal';
import { DeveloperWalletService } from '@/lib/circle/developerWalletService';
import { TWITCH_VAULT_CONTRACT_ADDRESS, VAULT_CONTRACT_ADDRESS, TELEGRAM_VAULT_CONTRACT_ADDRESS, TIKTOK_VAULT_CONTRACT_ADDRESS, INSTAGRAM_VAULT_CONTRACT_ADDRESS, CONTRACT_ADDRESS, GiftCardABI, USDC_ADDRESS, EURC_ADDRESS, USYC_ADDRESS, ARC_RPC_URLS } from '@/lib/web3/constants';
import { WalletChoiceModal } from './WalletChoiceModal';

type PendingCard = (TwitterCardMapping | TwitchCardMapping | TelegramCardMapping | TikTokCardMapping | InstagramCardMapping) & {
  cardType: 'twitter' | 'twitch' | 'telegram' | 'tiktok' | 'instagram';
};

interface ClaimCardsProps {
  onCardClaimed?: () => void;
  onPendingCountChange?: (count: number) => void;
  autoLoad?: boolean;
}

export function ClaimCards({ onCardClaimed, onPendingCountChange, autoLoad = false }: ClaimCardsProps) {
  const { authenticated, user } = usePrivySafe();
  const { address, isConnected } = useAccount();
  const [pendingCards, setPendingCards] = useState<PendingCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimingTokenId, setClaimingTokenId] = useState<string | null>(null);
  const [isPrivyModalOpen, setIsPrivyModalOpen] = useState(false);
  const [isWalletChoiceModalOpen, setIsWalletChoiceModalOpen] = useState(false);
  const [selectedCardForClaim, setSelectedCardForClaim] = useState<PendingCard | null>(null);
  const telegramAccount = (user as any)?.telegram;
  const telegramIdentifier = telegramAccount?.username || telegramAccount?.telegramUserId || telegramAccount?.id;

  // Helper function to get card info from blockchain contract
  const getCardInfoFromContract = async (tokenId: string): Promise<{ amount: string; currency: string; message: string } | null> => {
    try {
      const publicClient = createPublicClient({
        chain: arcTestnet,
        transport: http(ARC_RPC_URLS[0] || 'https://rpc.testnet.arc.network'),
      });

      const giftCardInfo = await publicClient.readContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: GiftCardABI,
        functionName: 'getGiftCardInfo',
        args: [BigInt(tokenId)],
      }) as {
        amount: bigint;
        token: `0x${string}`;
        redeemed: boolean;
        message: string;
      };

      // Format amount (6 decimals for stablecoins)
      const amount = (Number(giftCardInfo.amount) / 1000000).toString();
      
      // Get token symbol from address
      const tokenAddress = giftCardInfo.token.toLowerCase();
      let currency = 'USDC'; // Default
      if (tokenAddress === USDC_ADDRESS.toLowerCase()) {
        currency = 'USDC';
      } else if (tokenAddress === EURC_ADDRESS.toLowerCase()) {
        currency = 'EURC';
      } else if (tokenAddress === USYC_ADDRESS.toLowerCase()) {
        currency = 'USYC';
      }

      return {
        amount,
        currency,
        message: giftCardInfo.message || '',
      };
    } catch (error) {
      console.warn(`[ClaimCards] Failed to get card info from contract for tokenId ${tokenId}:`, error);
      return null;
    }
  };

  const fetchPendingCards = useCallback(async () => {
    const hasTwitter = authenticated && user?.twitter?.username;
    const hasTwitch = authenticated && user?.twitch?.username;
    const hasTelegram = authenticated && Boolean(telegramIdentifier);
    const hasTikTok = authenticated && user?.tiktok?.username;
    const hasInstagram = authenticated && user?.instagram?.username;

    try {
      setLoading(true);
      const allCards: PendingCard[] = [];

      if (hasTwitter) {
        const twitterUsername = user!.twitter!.username;
        if (!twitterUsername) {
          console.warn('[ClaimCards] Twitter username not found');
          return;
        }
        const tokenIds = await web3Service.getPendingTwitterCards(twitterUsername);
        
        const twitterCards = await Promise.all(
          tokenIds.map(async (tokenId) => {
            try {
              const metadata = await getTwitterCardMapping(tokenId);
              if (metadata) {
                // If amount is 0 or missing, try to get it from contract
                if (!metadata.amount || metadata.amount === '0') {
                  const contractInfo = await getCardInfoFromContract(tokenId);
                  if (contractInfo) {
                    return { 
                      ...metadata, 
                      amount: contractInfo.amount,
                      currency: contractInfo.currency,
                      message: contractInfo.message || metadata.message,
                      cardType: 'twitter' as const 
                    };
                  }
                }
                return { ...metadata, cardType: 'twitter' as const };
              }
            } catch (error) {
              console.warn(`[ClaimCards] Failed to fetch metadata for Twitter card ${tokenId}:`, error);
            }
            
            // Fallback: try to get info from contract
            const contractInfo = await getCardInfoFromContract(tokenId);
            if (contractInfo) {
              return {
                tokenId,
                username: twitterUsername,
                temporaryOwner: '',
                senderAddress: '',
                amount: contractInfo.amount,
                currency: contractInfo.currency,
                message: contractInfo.message,
                metadataUri: '',
                status: 'pending' as const,
                createdAt: new Date().toISOString(),
                claimedAt: null,
                realOwner: null,
                cardType: 'twitter' as const
              };
            }
            
            // Last resort fallback
            return {
              tokenId,
              username: twitterUsername,
              temporaryOwner: '',
              senderAddress: '',
              amount: '0',
              currency: 'USDC',
              message: '',
              metadataUri: '',
              status: 'pending' as const,
              createdAt: new Date().toISOString(),
              claimedAt: null,
              realOwner: null,
              cardType: 'twitter' as const
            };
          })
        );
        allCards.push(...twitterCards);
      }

      if (hasTwitch) {
        const twitchUsername = user!.twitch!.username;
        if (!twitchUsername) {
          console.warn('[ClaimCards] Twitch username not found');
          return;
        }
        const tokenIds = await web3Service.getPendingTwitchCards(twitchUsername);
        
        const twitchCards = await Promise.all(
          tokenIds.map(async (tokenId) => {
            try {
              const metadata = await getTwitchCardMapping(tokenId);
              if (metadata) {
                // If amount is 0 or missing, try to get it from contract
                if (!metadata.amount || metadata.amount === '0') {
                  const contractInfo = await getCardInfoFromContract(tokenId);
                  if (contractInfo) {
                    return { 
                      ...metadata, 
                      amount: contractInfo.amount,
                      currency: contractInfo.currency,
                      message: contractInfo.message || metadata.message,
                      cardType: 'twitch' as const 
                    };
                  }
                }
                return { ...metadata, cardType: 'twitch' as const };
              }
            } catch (error) {
              console.warn(`[ClaimCards] Failed to fetch metadata for Twitch card ${tokenId}:`, error);
            }
            
            // Fallback: try to get info from contract
            const contractInfo = await getCardInfoFromContract(tokenId);
            if (contractInfo) {
              return {
                tokenId,
                username: twitchUsername,
                temporaryOwner: '',
                senderAddress: '',
                amount: contractInfo.amount,
                currency: contractInfo.currency,
                message: contractInfo.message,
                metadataUri: '',
                status: 'pending' as const,
                createdAt: new Date().toISOString(),
                claimedAt: null,
                realOwner: null,
                cardType: 'twitch' as const
              };
            }
            
            // Last resort fallback
            return {
              tokenId,
              username: twitchUsername,
              temporaryOwner: '',
              senderAddress: '',
              amount: '0',
              currency: 'USDC',
              message: '',
              metadataUri: '',
              status: 'pending' as const,
              createdAt: new Date().toISOString(),
              claimedAt: null,
              realOwner: null,
              cardType: 'twitch' as const
            };
          })
        );
        allCards.push(...twitchCards);
      }
      
      if (hasTelegram && telegramIdentifier) {
        const normalizedTelegramUsername = telegramIdentifier.toString().replace(/^@/, '').trim();
        if (!normalizedTelegramUsername) {
          console.warn('[ClaimCards] Telegram username not found');
        } else {
          const tokenIds = await web3Service.getPendingTelegramCards(normalizedTelegramUsername);
          
          const telegramCards = await Promise.all(
            tokenIds.map(async (tokenId) => {
              try {
                const metadata = await getTelegramCardMapping(tokenId);
                if (metadata) {
                  // If amount is 0 or missing, try to get it from contract
                  if (!metadata.amount || metadata.amount === '0') {
                    const contractInfo = await getCardInfoFromContract(tokenId);
                    if (contractInfo) {
                      return { 
                        ...metadata, 
                        amount: contractInfo.amount,
                        currency: contractInfo.currency,
                        message: contractInfo.message || metadata.message,
                        cardType: 'telegram' as const 
                      };
                    }
                  }
                  return { ...metadata, cardType: 'telegram' as const };
                }
              } catch (error) {
                console.warn(`[ClaimCards] Failed to fetch metadata for Telegram card ${tokenId}:`, error);
              }
              
              // Fallback: try to get info from contract
              const contractInfo = await getCardInfoFromContract(tokenId);
              if (contractInfo) {
                return {
                  tokenId,
                  username: normalizedTelegramUsername,
                  temporaryOwner: '',
                  senderAddress: '',
                  amount: contractInfo.amount,
                  currency: contractInfo.currency,
                  message: contractInfo.message,
                  metadataUri: '',
                  status: 'pending' as const,
                  createdAt: new Date().toISOString(),
                  claimedAt: null,
                  realOwner: null,
                  cardType: 'telegram' as const
                };
              }
              
              // Last resort fallback
              return {
                tokenId,
                username: normalizedTelegramUsername,
                temporaryOwner: '',
                senderAddress: '',
                amount: '0',
                currency: 'USDC',
                message: '',
                metadataUri: '',
                status: 'pending' as const,
                createdAt: new Date().toISOString(),
                claimedAt: null,
                realOwner: null,
                cardType: 'telegram' as const
              };
            })
          );
          allCards.push(...telegramCards);
        }
      }

      if (hasTikTok) {
        const tiktokUsername = user!.tiktok!.username;
        if (!tiktokUsername) {
          console.warn('[ClaimCards] TikTok username not found');
        } else {
          const normalizedTikTokUsername = tiktokUsername.replace(/^@/, '').trim();
          const tokenIds = await web3Service.getPendingTikTokCards(normalizedTikTokUsername);

          const tiktokCards = await Promise.all(
            tokenIds.map(async (tokenId) => {
              try {
                const metadata = await getTikTokCardMapping(tokenId);
                if (metadata) {
                  // If amount is 0 or missing, try to get it from contract
                  if (!metadata.amount || metadata.amount === '0') {
                    const contractInfo = await getCardInfoFromContract(tokenId);
                    if (contractInfo) {
                      return { 
                        ...metadata, 
                        amount: contractInfo.amount,
                        currency: contractInfo.currency,
                        message: contractInfo.message || metadata.message,
                        cardType: 'tiktok' as const 
                      };
                    }
                  }
                  return { ...metadata, cardType: 'tiktok' as const };
                }
              } catch (error) {
                console.warn(`[ClaimCards] Failed to fetch metadata for TikTok card ${tokenId}:`, error);
              }
              
              // Fallback: try to get info from contract
              const contractInfo = await getCardInfoFromContract(tokenId);
              if (contractInfo) {
                return {
                  tokenId,
                  username: normalizedTikTokUsername,
                  temporaryOwner: '',
                  senderAddress: '',
                  amount: contractInfo.amount,
                  currency: contractInfo.currency,
                  message: contractInfo.message,
                  metadataUri: '',
                  status: 'pending' as const,
                  createdAt: new Date().toISOString(),
                  claimedAt: null,
                  realOwner: null,
                  cardType: 'tiktok' as const
                };
              }
              
              // Last resort fallback
              return {
                tokenId,
                username: normalizedTikTokUsername,
                temporaryOwner: '',
                senderAddress: '',
                amount: '0',
                currency: 'USDC',
                message: '',
                metadataUri: '',
                status: 'pending' as const,
                createdAt: new Date().toISOString(),
                claimedAt: null,
                realOwner: null,
                cardType: 'tiktok' as const
              };
            })
          );
          allCards.push(...tiktokCards);
        }
      }

      if (hasInstagram) {
        const instagramUsername = user!.instagram!.username;
        if (!instagramUsername) {
          console.warn('[ClaimCards] Instagram username not found');
        } else {
          const normalizedInstagramUsername = instagramUsername.replace(/^@/, '').trim();
          const tokenIds = await web3Service.getPendingInstagramCards(normalizedInstagramUsername);

          const instagramCards = await Promise.all(
            tokenIds.map(async (tokenId) => {
              try {
                const metadata = await getInstagramCardMapping(tokenId);
                if (metadata) {
                  // If amount is 0 or missing, try to get it from contract
                  if (!metadata.amount || metadata.amount === '0') {
                    const contractInfo = await getCardInfoFromContract(tokenId);
                    if (contractInfo) {
                      return { 
                        ...metadata, 
                        amount: contractInfo.amount,
                        currency: contractInfo.currency,
                        message: contractInfo.message || metadata.message,
                        cardType: 'instagram' as const 
                      };
                    }
                  }
                  return { ...metadata, cardType: 'instagram' as const };
                }
              } catch (error) {
                console.warn(`[ClaimCards] Failed to fetch metadata for Instagram card ${tokenId}:`, error);
              }
              
              // Fallback: try to get info from contract
              const contractInfo = await getCardInfoFromContract(tokenId);
              if (contractInfo) {
                return {
                  tokenId,
                  username: normalizedInstagramUsername,
                  temporaryOwner: '',
                  senderAddress: '',
                  amount: contractInfo.amount,
                  currency: contractInfo.currency,
                  message: contractInfo.message,
                  metadataUri: '',
                  status: 'pending' as const,
                  createdAt: new Date().toISOString(),
                  claimedAt: null,
                  realOwner: null,
                  cardType: 'instagram' as const
                };
              }
              
              // Last resort fallback
              return {
                tokenId,
                username: normalizedInstagramUsername,
                temporaryOwner: '',
                senderAddress: '',
                amount: '0',
                currency: 'USDC',
                message: '',
                metadataUri: '',
                status: 'pending' as const,
                createdAt: new Date().toISOString(),
                claimedAt: null,
                realOwner: null,
                cardType: 'instagram' as const
              };
            })
          );
          allCards.push(...instagramCards);
        }
      }
      
      setPendingCards(allCards);
      if (onPendingCountChange) {
        onPendingCountChange(allCards.length);
      }
    } catch (error) {
      console.error('Error fetching pending cards:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[ClaimCards] Error details:', errorMessage);
      
      // Don't show error toast if it's just that there are no cards
      // Only show error if it's a real problem
      if (!errorMessage.includes('No pending cards') && !errorMessage.includes('not found')) {
        toast.error(`Failed to load pending cards: ${errorMessage}`);
      }
      
      // Set empty array on error so UI shows "No Pending Cards" instead of error
      setPendingCards([]);
      if (onPendingCountChange) {
        onPendingCountChange(0);
      }
    } finally {
      setLoading(false);
    }
  }, [authenticated, user?.twitter?.username, user?.twitch?.username, telegramIdentifier, user?.tiktok?.username, user?.instagram?.username, onPendingCountChange]);

  useEffect(() => {
    const hasTwitter = authenticated && user?.twitter?.username;
    const hasTwitch = authenticated && user?.twitch?.username;
    const hasTelegram = authenticated && Boolean(telegramIdentifier);
    const hasTikTok = authenticated && user?.tiktok?.username;
    const hasInstagram = authenticated && user?.instagram?.username;

    if (authenticated && (hasTwitter || hasTwitch || hasTelegram || hasTikTok || hasInstagram)) {
      fetchPendingCards();
    } else {
      setPendingCards([]);
      setLoading(false);
      if (onPendingCountChange) {
        onPendingCountChange(0);
      }
    }
  }, [authenticated, user?.twitter?.username, user?.twitch?.username, telegramIdentifier, user?.tiktok?.username, user?.instagram?.username, fetchPendingCards, onPendingCountChange]);

  useEffect(() => {
    if (autoLoad && authenticated) {
      const hasTwitter = user?.twitter?.username;
      const hasTwitch = user?.twitch?.username;
      const hasTelegram = Boolean(telegramIdentifier);
      const hasTikTok = user?.tiktok?.username;
      const hasInstagram = user?.instagram?.username;
      if (hasTwitter || hasTwitch || hasTelegram || hasTikTok || hasInstagram) {
        fetchPendingCards();
      }
    }
  }, [autoLoad, authenticated, user?.twitter?.username, user?.twitch?.username, telegramIdentifier, user?.tiktok?.username, user?.instagram?.username, fetchPendingCards]);

  // Helper function to get social user ID from Privy user
  const getSocialUserId = (platform: string): string | null => {
    if (!user?.linkedAccounts) return null;
    
    const account = user.linkedAccounts.find(
      (acc: any) => 
        acc.type === platform || 
        acc.type === `${platform}_oauth` ||
        acc.provider === platform
    );
    
    // Safely access subject or id properties
    if (!account) return null;
    return (account as any)?.subject || (account as any)?.id || null;
  };

  // Handle creating Internal wallet and claiming card
  const handleCreateWalletAndClaim = async () => {
    if (!selectedCardForClaim) return;

    try {
      setClaimingTokenId(selectedCardForClaim.tokenId);
      
      const privyUserId = user?.id;
      if (!privyUserId) {
        toast.error('Privy user ID not found. Please ensure you are logged in.');
        setClaimingTokenId(null);
        return;
      }

      let platform: 'twitch' | 'twitter' | 'telegram' | 'tiktok' | 'instagram';
      let socialUserId: string | null;
      let username: string;
      let normalizedLoggedIn: string;
      let normalizedCard: string;
      let contractAddress: string;
      let claimApiFunction: (tokenId: string, username: string, walletAddress: string) => Promise<any>;

      // Determine platform and get user data
      if (selectedCardForClaim.cardType === 'twitch') {
        if (!user?.twitch) {
          toast.error('Twitch account not found');
          setClaimingTokenId(null);
          return;
        }
        platform = 'twitch';
        const twitchUsername = user.twitch.username;
        if (!twitchUsername) {
          toast.error('Twitch username not found');
          setClaimingTokenId(null);
          return;
        }
        username = twitchUsername;
        socialUserId = getSocialUserId('twitch');
        contractAddress = TWITCH_VAULT_CONTRACT_ADDRESS;
        claimApiFunction = claimTwitchCard;
      } else if (selectedCardForClaim.cardType === 'twitter') {
        if (!user?.twitter) {
          toast.error('Twitter account not found');
          setClaimingTokenId(null);
          return;
        }
        platform = 'twitter';
        const twitterUsername = user.twitter.username;
        if (!twitterUsername) {
          toast.error('Twitter username not found');
          setClaimingTokenId(null);
          return;
        }
        username = twitterUsername;
        socialUserId = getSocialUserId('twitter');
        contractAddress = VAULT_CONTRACT_ADDRESS;
        claimApiFunction = claimTwitterCard;
      } else if (selectedCardForClaim.cardType === 'telegram') {
        if (!telegramIdentifier) {
          toast.error('Telegram account not found');
          setClaimingTokenId(null);
          return;
        }
        platform = 'telegram';
        username = telegramIdentifier.toString().replace(/^@/, '');
        socialUserId = getSocialUserId('telegram');
        contractAddress = TELEGRAM_VAULT_CONTRACT_ADDRESS;
        claimApiFunction = claimTelegramCard;
      } else if (selectedCardForClaim.cardType === 'tiktok') {
        if (!user?.tiktok) {
          toast.error('TikTok account not found');
          setClaimingTokenId(null);
          return;
        }
        platform = 'tiktok';
        const tiktokUsername = user.tiktok.username;
        if (!tiktokUsername) {
          toast.error('TikTok username not found');
          setClaimingTokenId(null);
          return;
        }
        username = tiktokUsername;
        socialUserId = getSocialUserId('tiktok');
        contractAddress = TIKTOK_VAULT_CONTRACT_ADDRESS;
        claimApiFunction = claimTikTokCard;
      } else if (selectedCardForClaim.cardType === 'instagram') {
        if (!user?.instagram) {
          toast.error('Instagram account not found');
          setClaimingTokenId(null);
          return;
        }
        platform = 'instagram';
        const instagramUsername = user.instagram.username;
        if (!instagramUsername) {
          toast.error('Instagram username not found');
          setClaimingTokenId(null);
          return;
        }
        username = instagramUsername;
        socialUserId = getSocialUserId('instagram');
        contractAddress = INSTAGRAM_VAULT_CONTRACT_ADDRESS;
        claimApiFunction = claimInstagramCard;
      } else {
        toast.error(`Unsupported card type: ${selectedCardForClaim.cardType}`);
        setClaimingTokenId(null);
        return;
      }

      if (!socialUserId) {
        toast.error(`${platform.charAt(0).toUpperCase() + platform.slice(1)} ID not found. Please ensure you are logged in with ${platform}.`);
        setClaimingTokenId(null);
        return;
      }

      // Normalize usernames for comparison
      if (platform === 'twitter' || platform === 'telegram' || platform === 'tiktok' || platform === 'instagram') {
        normalizedLoggedIn = username.toLowerCase().replace(/^@/, '').trim();
        normalizedCard = selectedCardForClaim.username.toLowerCase().replace(/^@/, '').trim();
      } else {
        normalizedLoggedIn = username.toLowerCase().trim();
        normalizedCard = selectedCardForClaim.username.toLowerCase().trim();
      }
      
      if (normalizedLoggedIn !== normalizedCard) {
        toast.error(`This card is not for your ${platform.charAt(0).toUpperCase() + platform.slice(1)} account`);
        setClaimingTokenId(null);
        return;
      }

      // Check if Internal wallet exists
      let devWallet = await DeveloperWalletService.getWalletBySocial(platform, socialUserId);
      
      if (!devWallet) {
        // Create Internal wallet automatically
        toast.info('Creating internal wallet for receiving donations...');
        const createResult = await DeveloperWalletService.createWalletForSocial(
          platform,
          socialUserId,
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
            // Do not block the process if requesting tokens fails
          }
        } catch (tokenError) {
          console.warn('Error requesting testnet tokens (non-critical):', tokenError);
          // Do not block the process if requesting tokens fails
        }
      }

      // Claim via Internal wallet
      toast.info('Claiming card via internal wallet...');
      
      const txResult = await DeveloperWalletService.sendTransaction({
        walletId: devWallet.circle_wallet_id,
        walletAddress: devWallet.wallet_address,
        contractAddress: contractAddress,
        functionName: 'claimCard',
        args: [BigInt(selectedCardForClaim.tokenId), normalizedLoggedIn, devWallet.wallet_address],
        blockchain: 'ARC-TESTNET',
        privyUserId: privyUserId,
        socialPlatform: platform,
        socialUserId: socialUserId
      });

      if (!txResult.success) {
        throw new Error(txResult.error || 'Failed to claim card via Internal wallet');
      }

      // Update Supabase after successful blockchain transaction
      try {
        if (devWallet.wallet_address) {
          await claimApiFunction(selectedCardForClaim.tokenId, username, devWallet.wallet_address);
          // Successfully updated Supabase after claim
        }
      } catch (apiError) {
        console.error('Error updating Supabase after claim (non-critical):', apiError);
      }

      // Show the final success message
      // If there is no txHash yet but there is a transactionId - that's normal, the transaction is queued
      if (!txResult.txHash && txResult.transactionId) {
        toast.info('Transaction submitted. Waiting for confirmation...');
        // You can poll the transaction status later or simply display the transactionId
        // Transaction status checked
        toast.success(`Card claimed successfully! Transaction ID: ${txResult.transactionId.slice(0, 8)}...`);
      } else if (txResult.txHash) {
        toast.success(`Card claimed successfully! TX: ${txResult.txHash.slice(0, 10)}...`);
      } else {
        toast.success('Card claimed successfully!');
      }
      await fetchPendingCards();
      setClaimingTokenId(null);
      setSelectedCardForClaim(null);
      
      if (onCardClaimed) {
        onCardClaimed();
      }
    } catch (error) {
      console.error('Error creating wallet and claiming card:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create wallet and claim card';
      toast.error(errorMessage);
      setClaimingTokenId(null);
      setSelectedCardForClaim(null);
    }
  };

  const handleClaim = async (card: PendingCard, useDeveloperWallet: boolean = false) => {
    if (!authenticated) {
      setIsPrivyModalOpen(true);
      const providerLabelMap = {
        twitter: 'Twitter',
        twitch: 'Twitch',
        telegram: 'Telegram',
        tiktok: 'TikTok',
        instagram: 'Instagram',
      } as const;
      const providerLabel = providerLabelMap[card.cardType] || 'Social';
      toast.info(`Please login with ${providerLabel} via Privy to claim this card`);
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
      
      if (card.cardType === 'twitter') {
        if (!user?.twitter) {
          setIsPrivyModalOpen(true);
          toast.info('Please login with Twitter via Privy to claim this card');
          return;
        }

        const twitterUsername = user.twitter.username;
        if (!twitterUsername) {
          throw new Error('Twitter username not found');
        }
        const normalizedLoggedIn = twitterUsername.toLowerCase().replace(/^@/, '').trim();
        const normalizedCard = card.username.toLowerCase().replace(/^@/, '').trim();
        
        if (normalizedLoggedIn !== normalizedCard) {
          throw new Error('This card is not for your Twitter account');
        }

        if (!user) {
          throw new Error('User not found. Please ensure you are logged in.');
        }

        const privyUserId = user.id;
        const twitterUserId = getSocialUserId('twitter');

        // If no MetaMask or Internal wallet is selected
        if (useDeveloperWallet || !isConnected || !address) {
          if (!privyUserId || !twitterUserId) {
            throw new Error('Privy user ID or Twitter ID not found. Please ensure you are logged in with Twitter.');
          }

          // Check if Internal wallet exists
          let devWallet = await DeveloperWalletService.getWalletBySocial('twitter', twitterUserId);
          
          if (!devWallet) {
            // Create Internal wallet automatically
            toast.info('Creating internal wallet for receiving donations...');
            const createResult = await DeveloperWalletService.createWalletForSocial(
              'twitter',
              twitterUserId,
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
            contractAddress: VAULT_CONTRACT_ADDRESS,
            functionName: 'claimCard',
            args: [BigInt(card.tokenId), normalizedLoggedIn, devWallet.wallet_address],
            blockchain: 'ARC-TESTNET',
            privyUserId: privyUserId,
            socialPlatform: 'twitter',
            socialUserId: twitterUserId
          });

          if (!txResult.success) {
            throw new Error(txResult.error || 'Failed to claim card via Internal wallet');
          }

          // Update Supabase after successful blockchain transaction
          // Note: This is non-critical - the blockchain transaction already succeeded
          try {
            await claimTwitterCard(card.tokenId, twitterUsername, devWallet.wallet_address);
            // Successfully updated Supabase after claim
          } catch (apiError) {
            console.warn('Failed to update Supabase after claim (non-critical - blockchain transaction succeeded):', apiError);
            // Don't block the process - the card was already claimed on-chain
          }

          // Show the final success message
          if (!txResult.txHash && txResult.transactionId) {
            toast.info('Transaction submitted. Waiting for confirmation...');
            toast.success(`Card claimed successfully! Transaction ID: ${txResult.transactionId.slice(0, 8)}...`);
          } else if (txResult.txHash) {
            toast.success(`Card claimed successfully! TX: ${txResult.txHash.slice(0, 10)}...`);
          } else {
            toast.success('Card claimed successfully!');
          }
          
          await fetchPendingCards();
          setClaimingTokenId(null);
          
          if (onCardClaimed) {
            onCardClaimed();
          }
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
        
        const txHash = await web3Service.claimTwitterCard(
          card.tokenId,
          twitterUsername
        );

        // Update Supabase after successful blockchain transaction
        try {
          if (address) {
            await claimTwitterCard(card.tokenId, twitterUsername, address);
            // Successfully updated Supabase after claim
          }
        } catch (apiError) {
          console.error('Error updating Supabase after claim (non-critical):', apiError);
          // Don't fail the claim if API update fails - blockchain transaction already succeeded
        }

        toast.success(`Card claimed successfully! TX: ${txHash.slice(0, 10)}...`);
      } else if (card.cardType === 'twitch') {
        if (!user?.twitch) {
          setIsPrivyModalOpen(true);
          toast.info('Please login with Twitch via Privy to claim this card');
          return;
        }

        const twitchUsername = user.twitch.username;
        if (!twitchUsername) {
          throw new Error('Twitch username not found');
        }
        const normalizedLoggedIn = twitchUsername.toLowerCase().trim();
        const normalizedCard = card.username.toLowerCase().trim();
        
        if (normalizedLoggedIn !== normalizedCard) {
          throw new Error('This card is not for your Twitch account');
        }

        if (!user) {
          throw new Error('User not found. Please ensure you are logged in.');
        }

        const privyUserId = user.id;
        const twitchUserId = getSocialUserId('twitch');

        // If no MetaMask or Internal wallet is selected
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

          if (!txResult.success) {
            throw new Error(txResult.error || 'Failed to claim card via Internal wallet');
          }

          // Update Supabase after successful blockchain transaction
          try {
            await claimTwitchCard(card.tokenId, twitchUsername, devWallet.wallet_address);
            // Successfully updated Supabase after claim
          } catch (apiError) {
            console.error('Error updating Supabase after claim (non-critical):', apiError);
          }

          // Show the final success message
          if (!txResult.txHash && txResult.transactionId) {
            toast.info('Transaction submitted. Waiting for confirmation...');
            toast.success(`Card claimed successfully! Transaction ID: ${txResult.transactionId.slice(0, 8)}...`);
          } else if (txResult.txHash) {
            toast.success(`Card claimed successfully! TX: ${txResult.txHash.slice(0, 10)}...`);
          } else {
            toast.success('Card claimed successfully!');
          }
          
          await fetchPendingCards();
          setClaimingTokenId(null);
          
          if (onCardClaimed) {
            onCardClaimed();
          }
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

        // Update Supabase after successful blockchain transaction
        try {
          await claimTwitchCard(card.tokenId, twitchUsername, address);
          // Successfully updated Supabase after claim
        } catch (apiError) {
          console.error('Error updating Supabase after claim (non-critical):', apiError);
          // Don't fail the claim if API update fails - blockchain transaction already succeeded
        }

        toast.success(`Card claimed successfully! TX: ${txHash.slice(0, 10)}...`);
      } else if (card.cardType === 'telegram') {
        if (!telegramIdentifier) {
          setIsPrivyModalOpen(true);
          toast.info('Please login with Telegram via Privy to claim this card');
          return;
        }

        const telegramUsername = telegramIdentifier.toString();
        const normalizedLoggedIn = telegramUsername.toLowerCase().replace(/^@/, '').trim();
        const normalizedCard = card.username.toLowerCase().replace(/^@/, '').trim();

        if (normalizedLoggedIn !== normalizedCard) {
          throw new Error('This card is not for your Telegram account');
        }

        if (!user) {
          throw new Error('User not found. Please ensure you are logged in.');
        }

        const privyUserId = user.id;
        const telegramUserId = getSocialUserId('telegram');

        // If no MetaMask or Internal wallet is selected
        if (useDeveloperWallet || !isConnected || !address) {
          if (!privyUserId || !telegramUserId) {
            throw new Error('Privy user ID or Telegram ID not found. Please ensure you are logged in with Telegram.');
          }

          // Check if Internal wallet exists
          let devWallet = await DeveloperWalletService.getWalletBySocial('telegram', telegramUserId);
          
          if (!devWallet) {
            // Create Internal wallet automatically
            toast.info('Creating internal wallet for receiving donations...');
            const createResult = await DeveloperWalletService.createWalletForSocial(
              'telegram',
              telegramUserId,
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
            contractAddress: TELEGRAM_VAULT_CONTRACT_ADDRESS,
            functionName: 'claimCard',
            args: [BigInt(card.tokenId), normalizedLoggedIn, devWallet.wallet_address],
            blockchain: 'ARC-TESTNET',
            privyUserId: privyUserId,
            socialPlatform: 'telegram',
            socialUserId: telegramUserId
          });

          if (!txResult.success) {
            throw new Error(txResult.error || 'Failed to claim card via Internal wallet');
          }

          // Update Supabase after successful blockchain transaction
          try {
            await claimTelegramCard(card.tokenId, normalizedLoggedIn, devWallet.wallet_address);
            // Successfully updated Supabase after claim
          } catch (apiError) {
            console.error('Error updating Supabase after claim (non-critical):', apiError);
          }

          // Show the final success message
          if (!txResult.txHash && txResult.transactionId) {
            toast.info('Transaction submitted. Waiting for confirmation...');
            toast.success(`Card claimed successfully! Transaction ID: ${txResult.transactionId.slice(0, 8)}...`);
          } else if (txResult.txHash) {
            toast.success(`Card claimed successfully! TX: ${txResult.txHash.slice(0, 10)}...`);
          } else {
            toast.success('Card claimed successfully!');
          }
          
          await fetchPendingCards();
          setClaimingTokenId(null);
          
          if (onCardClaimed) {
            onCardClaimed();
          }
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
        
        const txHash = await web3Service.claimTelegramCard(
          card.tokenId,
          normalizedLoggedIn
        );

        // Update Supabase after successful blockchain transaction
        try {
          if (address) {
            await claimTelegramCard(card.tokenId, normalizedLoggedIn, address);
            // Successfully updated Supabase after claim
          }
        } catch (apiError) {
          console.error('Error updating Supabase after claim (non-critical):', apiError);
          // Don't fail the claim if API update fails - blockchain transaction already succeeded
        }

        toast.success(`Card claimed successfully! TX: ${txHash.slice(0, 10)}...`);
      } else if (card.cardType === 'tiktok') {
        if (!user?.tiktok) {
          setIsPrivyModalOpen(true);
          toast.info('Please login with TikTok via Privy to claim this card');
          return;
        }

        const tiktokUsername = user.tiktok.username;
        if (!tiktokUsername) {
          throw new Error('TikTok username not found');
        }
        const normalizedLoggedIn = tiktokUsername.toLowerCase().replace(/^@/, '').trim();
        const normalizedCard = card.username.toLowerCase().replace(/^@/, '').trim();

        if (normalizedLoggedIn !== normalizedCard) {
          throw new Error('This card is not for your TikTok account');
        }

        if (!user) {
          throw new Error('User not found. Please ensure you are logged in.');
        }

        const privyUserId = user.id;
        const tiktokUserId = getSocialUserId('tiktok');

        // If no MetaMask or Internal wallet is selected
        if (useDeveloperWallet || !isConnected || !address) {
          if (!privyUserId || !tiktokUserId) {
            throw new Error('Privy user ID or TikTok ID not found. Please ensure you are logged in with TikTok.');
          }

          // Check if Internal wallet exists
          let devWallet = await DeveloperWalletService.getWalletBySocial('tiktok', tiktokUserId);
          
          if (!devWallet) {
            // Create Internal wallet automatically
            toast.info('Creating internal wallet for receiving donations...');
            const createResult = await DeveloperWalletService.createWalletForSocial(
              'tiktok',
              tiktokUserId,
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
            contractAddress: TIKTOK_VAULT_CONTRACT_ADDRESS,
            functionName: 'claimCard',
            args: [BigInt(card.tokenId), normalizedLoggedIn, devWallet.wallet_address],
            blockchain: 'ARC-TESTNET',
            privyUserId: privyUserId,
            socialPlatform: 'tiktok',
            socialUserId: tiktokUserId
          });

          if (!txResult.success) {
            throw new Error(txResult.error || 'Failed to claim card via Internal wallet');
          }

          // Update Supabase after successful blockchain transaction
          try {
            await claimTikTokCard(card.tokenId, normalizedLoggedIn, devWallet.wallet_address);
            // Successfully updated Supabase after claim
          } catch (apiError) {
            console.error('Error updating Supabase after claim (non-critical):', apiError);
          }

          // Show the final success message
          if (!txResult.txHash && txResult.transactionId) {
            toast.info('Transaction submitted. Waiting for confirmation...');
            toast.success(`Card claimed successfully! Transaction ID: ${txResult.transactionId.slice(0, 8)}...`);
          } else if (txResult.txHash) {
            toast.success(`Card claimed successfully! TX: ${txResult.txHash.slice(0, 10)}...`);
          } else {
            toast.success('Card claimed successfully!');
          }
          
          await fetchPendingCards();
          setClaimingTokenId(null);
          
          if (onCardClaimed) {
            onCardClaimed();
          }
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
        
        const txHash = await web3Service.claimTikTokCard(
          card.tokenId,
          normalizedLoggedIn
        );

        // Update Supabase after successful blockchain transaction
        try {
          if (address) {
            await claimTikTokCard(card.tokenId, normalizedLoggedIn, address);
            // Successfully updated Supabase after claim
          }
        } catch (apiError) {
          console.error('Error updating Supabase after claim (non-critical):', apiError);
          // Don't fail the claim if API update fails - blockchain transaction already succeeded
        }

        toast.success(`Card claimed successfully! TX: ${txHash.slice(0, 10)}...`);
      } else if (card.cardType === 'instagram') {
        if (!user?.instagram) {
          setIsPrivyModalOpen(true);
          toast.info('Please login with Instagram via Privy to claim this card');
          return;
        }

        const instagramUsername = user.instagram.username;
        if (!instagramUsername) {
          throw new Error('Instagram username not found');
        }
        const normalizedLoggedIn = instagramUsername.toLowerCase().replace(/^@/, '').trim();
        const normalizedCard = card.username.toLowerCase().replace(/^@/, '').trim();

        if (normalizedLoggedIn !== normalizedCard) {
          throw new Error('This card is not for your Instagram account');
        }

        if (!user) {
          throw new Error('User not found. Please ensure you are logged in.');
        }

        const privyUserId = user.id;
        const instagramUserId = getSocialUserId('instagram');

        // If no MetaMask or Internal wallet is selected
        if (useDeveloperWallet || !isConnected || !address) {
          if (!privyUserId || !instagramUserId) {
            throw new Error('Privy user ID or Instagram ID not found. Please ensure you are logged in with Instagram.');
          }

          // Check if Internal wallet exists
          let devWallet = await DeveloperWalletService.getWalletBySocial('instagram', instagramUserId);
          
          if (!devWallet) {
            // Create Internal wallet automatically
            toast.info('Creating internal wallet for receiving donations...');
            const createResult = await DeveloperWalletService.createWalletForSocial(
              'instagram',
              instagramUserId,
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
            contractAddress: INSTAGRAM_VAULT_CONTRACT_ADDRESS,
            functionName: 'claimCard',
            args: [BigInt(card.tokenId), normalizedLoggedIn, devWallet.wallet_address],
            blockchain: 'ARC-TESTNET',
            privyUserId: privyUserId,
            socialPlatform: 'instagram',
            socialUserId: instagramUserId
          });

          if (!txResult.success) {
            throw new Error(txResult.error || 'Failed to claim card via Internal wallet');
          }

          // Update Supabase after successful blockchain transaction
          try {
            await claimInstagramCard(card.tokenId, normalizedLoggedIn, devWallet.wallet_address);
            // Successfully updated Supabase after claim
          } catch (apiError) {
            console.error('Error updating Supabase after claim (non-critical):', apiError);
          }

          // Show the final success message
          if (!txResult.txHash && txResult.transactionId) {
            toast.info('Transaction submitted. Waiting for confirmation...');
            toast.success(`Card claimed successfully! Transaction ID: ${txResult.transactionId.slice(0, 8)}...`);
          } else if (txResult.txHash) {
            toast.success(`Card claimed successfully! TX: ${txResult.txHash.slice(0, 10)}...`);
          } else {
            toast.success('Card claimed successfully!');
          }
          
          await fetchPendingCards();
          setClaimingTokenId(null);
          
          if (onCardClaimed) {
            onCardClaimed();
          }
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
        
        const txHash = await web3Service.claimInstagramCard(
          card.tokenId,
          normalizedLoggedIn
        );

        // Update Supabase after successful blockchain transaction
        try {
          if (address) {
            await claimInstagramCard(card.tokenId, normalizedLoggedIn, address);
            // Successfully updated Supabase after claim
          }
        } catch (apiError) {
          console.error('Error updating Supabase after claim (non-critical):', apiError);
          // Don't fail the claim if API update fails - blockchain transaction already succeeded
        }

        toast.success(`Card claimed successfully! TX: ${txHash.slice(0, 10)}...`);
      }
      
      await fetchPendingCards();
      setClaimingTokenId(null);
      
      if (onCardClaimed) {
        onCardClaimed();
      }
    } catch (error) {
      console.error('Error claiming card:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to claim card';
      toast.error(errorMessage);
      setClaimingTokenId(null);
    }
  };

  const hasTwitter = authenticated && user?.twitter?.username;
  const hasTwitch = authenticated && user?.twitch?.username;
  const hasTelegramDisplay = authenticated && Boolean(telegramIdentifier);
  const hasTikTokDisplay = authenticated && user?.tiktok?.username;
  const hasInstagramDisplay = authenticated && user?.instagram?.username;

  if (!authenticated || (!hasTwitter && !hasTwitch && !hasTelegramDisplay && !hasTikTokDisplay && !hasInstagramDisplay)) {
    return (
      <div className="p-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please login with Twitter, Twitch, Telegram, TikTok or Instagram via Privy to see and claim gift cards sent to your username.
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

  const usernames = [];
  if (hasTwitter) usernames.push(`@${user!.twitter!.username}`);
  if (hasTwitch) usernames.push(`${user!.twitch!.username} (Twitch)`);
  if (hasTelegramDisplay && telegramIdentifier) usernames.push(`@${telegramIdentifier.toString().replace(/^@/, '')} (Telegram)`);
  if (hasTikTokDisplay) usernames.push(`@${user!.tiktok!.username?.replace(/^@/, '')} (TikTok)`);
  if (hasInstagramDisplay) usernames.push(`@${user!.instagram!.username?.replace(/^@/, '')} (Instagram)`);

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
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                          </svg>
                          X.com
                        </>
                      ) : card.cardType === 'twitch' ? (
                        //https://brandfetch.com/twitch.tv?library=default&collection=logos&asset=idkW5NfuSd
                        <>
                          <svg viewBox="0 0 24 24" fill="currentColor" className="size-3">
                            <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z"/>
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


import { useState, useEffect } from 'react';
import { Gift, Eye, Clock, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from '@/components/ui/empty';
import { Spinner } from '@/components/ui/spinner';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { useAccount } from 'wagmi';
import { createWalletClient, custom } from 'viem';
import { arcTestnet } from '@/lib/web3/wagmiConfig';
import web3Service from '@/lib/web3/web3Service';
import { ClaimCards } from './ClaimCards';
import { usePrivySafe } from '@/lib/privy/usePrivySafe';
import { GiftCardsService, type GiftCardInsert } from '@/lib/supabase/giftCards';
import { DeveloperWalletService } from '@/lib/circle/developerWalletService';

interface GiftCard {
  tokenId: string;
  amount: string;
  currency: 'USDC' | 'EURC' | 'USYC';
  design: string;
  message: string;
  recipient: string;
  sender: string;
  status: 'active' | 'redeemed' | 'expired' | 'pending';
  createdAt: string;
  expiresAt?: string;
  hasTimer: boolean;
  hasPassword: boolean;
  qrCode: string;
  metadataUri?: string;
}

interface MyCardsProps {
  onSpendCard: (tokenId: string) => void;
}

export function MyCards({ onSpendCard }: MyCardsProps) {
  const { address, isConnected } = useAccount();
  const { authenticated, user } = usePrivySafe();
  const telegramAccount = (user as any)?.telegram;
  const telegramUsername = ((telegramAccount?.username || telegramAccount?.telegramUserId || telegramAccount?.id || '') as string).replace(/^@/, '').trim();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCurrency, setFilterCurrency] = useState('all');
  const [sentCards, setSentCards] = useState<GiftCard[]>([]);
  const [receivedCards, setReceivedCards] = useState<GiftCard[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [hasFetched, setHasFetched] = useState(false);
  const [activeTab, setActiveTab] = useState('received');
  // Temporary flag to disable background blockchain sync on /my
  const ENABLE_BLOCKCHAIN_SYNC = false;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'redeemed': return 'bg-blue-100 text-blue-800';
      case 'expired': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="w-4 h-4" />;
      case 'redeemed': return <CheckCircle className="w-4 h-4" />;
      case 'expired': return <XCircle className="w-4 h-4" />;
      case 'pending': return <Clock className="w-4 h-4" />;
      default: return <Gift className="w-4 h-4" />;
    }
  };

  const fetchPendingCardsCount = async () => {
    if (!authenticated) {
      setPendingCount(0);
      return;
    }

    const hasTwitter = user?.twitter?.username;
    const hasTwitch = user?.twitch?.username;
    const hasTelegram = telegramUsername;
    const hasTikTok = user?.tiktok?.username;
    const hasInstagram = user?.instagram?.username;

    if (!hasTwitter && !hasTwitch && !hasTelegram && !hasTikTok && !hasInstagram) {
      setPendingCount(0);
      return;
    }

    try {
      // Initialize web3Service only if wallet is connected, otherwise use publicClient only
      // publicClient is already created in web3Service constructor, so we can use it without initialization
      if (isConnected && address && typeof window !== 'undefined' && window.ethereum) {
        const walletClient = createWalletClient({
          chain: arcTestnet,
          transport: custom(window.ethereum)
        });
        await web3Service.initialize(walletClient, address);
      }
      // If no wallet connected, web3Service can still use publicClient for read operations
      
      let totalCount = 0;

      if (hasTwitter) {
        try {
          const twitterUsername = user!.twitter!.username;
          if (twitterUsername) {
            const tokenIds = await web3Service.getPendingTwitterCards(twitterUsername);
            totalCount += tokenIds.length;
          }
        } catch (error) {
          console.error('Error fetching Twitter pending cards count:', error);
        }
      }

      if (hasTwitch) {
        try {
          const twitchUsername = user!.twitch!.username;
          if (twitchUsername) {
            const tokenIds = await web3Service.getPendingTwitchCards(twitchUsername);
            totalCount += tokenIds.length;
          }
        } catch (error) {
          console.error('Error fetching Twitch pending cards count:', error);
        }
      }

      if (hasTelegram) {
        try {
          if (telegramUsername) {
            const tokenIds = await web3Service.getPendingTelegramCards(telegramUsername);
            totalCount += tokenIds.length;
          }
        } catch (error) {
          console.error('Error fetching Telegram pending cards count:', error);
        }
      }

      if (hasTikTok) {
        try {
          const tiktokUsername = user!.tiktok!.username;
          if (tiktokUsername) {
            const tokenIds = await web3Service.getPendingTikTokCards(tiktokUsername);
            totalCount += tokenIds.length;
          }
        } catch (error) {
          console.error('Error fetching TikTok pending cards count:', error);
        }
      }

      if (hasInstagram) {
        try {
          const instagramUsername = user!.instagram!.username;
          if (instagramUsername) {
            const tokenIds = await web3Service.getPendingInstagramCards(instagramUsername);
            totalCount += tokenIds.length;
          }
        } catch (error) {
          console.error('Error fetching Instagram pending cards count:', error);
        }
      }

      setPendingCount(totalCount);
    } catch (error) {
      console.error('Error fetching pending cards count:', error);
      setPendingCount(0);
    }
  };

  useEffect(() => {
    // Load cards if MetaMask is connected OR a social network with a Internal wallet is available
    if ((isConnected && address) || (authenticated && user)) {
      if (!hasFetched) {
        setHasFetched(true);
        fetchCards();
      }
    } else {
      setLoading(false);
      setHasFetched(false);
    }
  }, [isConnected, address, authenticated, user, hasFetched]);

  useEffect(() => {
    // Fetch pending cards count if authenticated and has at least one social network
    // This works even without connected wallet because web3Service uses publicClient for read operations
    if (authenticated && (user?.twitter?.username || user?.twitch?.username || telegramUsername || user?.tiktok?.username || user?.instagram?.username)) {
      fetchPendingCardsCount();
    } else {
      setPendingCount(0);
    }
  }, [authenticated, user?.twitter?.username, user?.twitch?.username, telegramUsername, user?.tiktok?.username, user?.instagram?.username, isConnected, address]);

  const fetchCards = async () => {
    // If MetaMask is connected - use its address
    // If there is no MetaMask but a social network is linked - check for a Internal wallet
    let recipientAddresses: string[] = [];
    
    if (isConnected && address) {
      recipientAddresses.push(address.toLowerCase());
    }
    
    // Check Internal wallet for social networks
    if (authenticated && user) {
      try {
        const socialPlatforms = ['twitter', 'twitch', 'telegram', 'tiktok', 'instagram'];
        const blockchain = 'ARC-TESTNET';
        
        for (const platform of socialPlatforms) {
          let socialUserId: string | null = null;
          
          if (platform === 'twitter' && user.twitter) {
            socialUserId = (user.twitter as any).subject;
          } else if (platform === 'twitch' && user.twitch) {
            socialUserId = (user.twitch as any).subject;
          } else if (platform === 'telegram' && user.telegram) {
            socialUserId = user.telegram.telegramUserId || (user.telegram as any).subject;
          } else if (platform === 'tiktok' && user.tiktok) {
            socialUserId = (user.tiktok as any).subject;
          } else if (platform === 'instagram' && (user as any).instagram) {
            socialUserId = ((user as any).instagram as any).subject;
          }

          if (socialUserId) {
            const devWallet = await DeveloperWalletService.getWalletBySocial(
              platform as 'twitter' | 'twitch' | 'telegram' | 'tiktok' | 'instagram',
              socialUserId,
              blockchain
            );
            
            if (devWallet && devWallet.wallet_address) {
              const walletAddr = devWallet.wallet_address.toLowerCase();
              if (!recipientAddresses.includes(walletAddr)) {
                recipientAddresses.push(walletAddr);
              }
            }
          }
        }
      } catch (error) {
        console.error('Error fetching Internal wallets:', error);
      }
    }
    
    // If neither MetaMask nor a Internal wallet is available - do not load cards
    if (recipientAddresses.length === 0) {
      setLoading(false);
      return;
    }

    try {
      // First, try to load from Supabase cache (fast) - display immediately
      // Loading cards from Supabase cache
      
      // Retrieve cards for all addresses (MetaMask + Internal wallets)
      const [allReceivedCards, supabaseSentCards] = await Promise.all([
        Promise.all(recipientAddresses.map(addr => GiftCardsService.getCardsByRecipientAddress(addr))).then(
          results => results.flat()
        ),
        isConnected && address ? GiftCardsService.getCardsBySender(address) : Promise.resolve([])
      ]);

        // Transform Supabase data to our format
        // Remove duplicates by tokenId
      const uniqueReceivedCards = Array.from(
        new Map(allReceivedCards.map(card => [card.token_id, card])).values()
      );
      
      const transformedReceivedCards: GiftCard[] = uniqueReceivedCards.map(card => ({
        tokenId: card.token_id,
        amount: card.amount,
        currency: card.currency,
        design: 'pink',
        message: card.message,
        recipient: card.recipient_address || (isConnected && address ? address : ''),
        sender: card.sender_address,
        status: card.redeemed ? 'redeemed' : 'active',
        createdAt: card.created_at ? new Date(card.created_at).toLocaleDateString() : new Date().toLocaleDateString(),
        hasTimer: false,
        hasPassword: false,
        qrCode: `/spend?tokenId=${card.token_id}`
      }));

      const transformedSentCards: GiftCard[] = supabaseSentCards.map(card => {
        const username = card.recipient_username ? card.recipient_username.replace(/^@/, '') : null;
        const recipientDisplay = (() => {
          switch (card.recipient_type) {
            case 'twitter':
              return username ? `@${username}` : 'Twitter user';
            case 'telegram':
              return username ? `@${username} (Telegram)` : 'Telegram user';
            case 'twitch':
              return username ? `${username} (Twitch)` : 'Twitch user';
            default:
              return card.recipient_address || 'Unknown';
          }
        })();

        return {
          tokenId: card.token_id,
          amount: card.amount,
          currency: card.currency,
          design: 'pink',
          message: card.message,
          recipient: recipientDisplay,
          sender: address || '',
          status: card.redeemed ? 'redeemed' : 'active',
          createdAt: card.created_at ? new Date(card.created_at).toLocaleDateString() : new Date().toLocaleDateString(),
          hasTimer: false,
          hasPassword: false,
          qrCode: `/spend?tokenId=${card.token_id}`
        };
      });

      // Update UI with cached data immediately - don't wait for blockchain!
      setReceivedCards(transformedReceivedCards);
      setSentCards(transformedSentCards);
      setLoading(false);

      // Then sync with blockchain in the background (slow, but non-blocking)
      // Temporarily disabled per request
      if (ENABLE_BLOCKCHAIN_SYNC && address) {
        console.log('Starting blockchain sync in background...');
        syncWithBlockchain(address as string).catch(error => {
          console.error('Background sync error (non-critical):', error);
        });
      }
    } catch (error) {
      console.error('Error fetching cards from Supabase:', error);
      // Fallback to blockchain if Supabase fails
      await fetchCardsFromBlockchain();
    }
  };

  const syncWithBlockchain = async (userAddress: string) => {
    try {
      
      // Initialize web3 service
      const walletClient = createWalletClient({
        chain: arcTestnet,
        transport: custom(window.ethereum)
      });

      await web3Service.initialize(walletClient, userAddress);
      
      // Load gift cards from blockchain
      console.log('Loading received cards from blockchain...');
      const blockchainCards = await web3Service.loadGiftCards(false, true);
      
      // Load sent cards
      console.log('Loading sent cards from blockchain...');
      
      // Also check cards with NULL recipient_address in Supabase
      // and update their owners from blockchain
      console.log('Checking cards with null recipient_address...');
      const cardsWithNullRecipient = await GiftCardsService.getAllCardsWithNullRecipient();
      console.log(`Found ${cardsWithNullRecipient.length} cards with null recipient_address`);
      
      // Check owners for cards with NULL recipient_address
      const cardsToUpdate: GiftCardInsert[] = [];
      const maxConcurrentChecks = 5; // Limit concurrent requests
      
      for (let i = 0; i < cardsWithNullRecipient.length; i += maxConcurrentChecks) {
        const batch = cardsWithNullRecipient.slice(i, i + maxConcurrentChecks);
        const ownerChecks = await Promise.all(
          batch.map(async (card) => {
            try {
              const owner = await web3Service.getCardOwner(card.token_id);
              // If card belongs to current user, update recipient_address
              if (owner.toLowerCase() === userAddress.toLowerCase()) {
                return {
                  token_id: card.token_id,
                  sender_address: card.sender_address,
                  recipient_address: userAddress.toLowerCase(),
                  recipient_username: null,
                  recipient_type: 'address' as const,
                  amount: card.amount,
                  currency: card.currency,
                  message: card.message,
                  redeemed: card.redeemed,
                };
              }
              return null;
            } catch (error) {
              console.warn(`Failed to check owner for card ${card.token_id}:`, error);
              return null;
            }
          })
        );
        
        cardsToUpdate.push(...ownerChecks.filter(card => card !== null) as GiftCardInsert[]);
      }
      
      if (cardsToUpdate.length > 0) {
        console.log(`Updating ${cardsToUpdate.length} cards with owner information`);
      }
      
      // Transform and update Supabase cache
      // Use Map for deduplication by token_id (keep latest version)
      const cardsMap = new Map<string, GiftCardInsert>();
      
      // Add received cards from blockchain
      blockchainCards.forEach(card => {
        cardsMap.set(card.tokenId, {
          token_id: card.tokenId,
          sender_address: card.sender.toLowerCase(),
          recipient_address: card.recipient.toLowerCase(),
          recipient_username: null,
          recipient_type: 'address' as const,
          amount: card.amount,
          currency: card.token,
          message: card.message,
          redeemed: card.redeemed,
        });
      });
      
      // Skip sent cards enrichment (handled via Supabase cache earlier)
      
      // Add updated cards (overwrite if duplicates exist)
      cardsToUpdate.forEach(card => {
        cardsMap.set(card.token_id, card);
      });
      
      // Convert Map to array (already without duplicates)
      const cardsToCache = Array.from(cardsMap.values());
      
      console.log(`Sending ${cardsToCache.length} unique cards to Supabase (removed duplicates)`);

      // Update Supabase cache
      await GiftCardsService.bulkUpsertCards(cardsToCache);
      console.log('Cache updated with blockchain data');

      // Update UI only if new cards found or statuses changed
      // Use functional update to access current values
      setReceivedCards(currentReceivedCards => {
        const existingReceivedMap = new Map(currentReceivedCards.map(card => [card.tokenId, card]));

        // Transform received cards
        const transformedReceivedCards: GiftCard[] = blockchainCards.map(card => ({
          tokenId: card.tokenId,
          amount: card.amount,
          currency: card.token,
          design: 'pink',
          message: card.message,
          recipient: card.recipient,
          sender: card.sender,
          status: card.redeemed ? 'redeemed' : 'active',
          createdAt: existingReceivedMap.get(card.tokenId)?.createdAt || new Date().toLocaleDateString(),
          hasTimer: false,
          hasPassword: false,
          qrCode: `/spend?tokenId=${card.tokenId}`
        }));

        // Always update with blockchain data if counts differ (blockchain is source of truth)
        // Check if there are actual changes to avoid unnecessary re-renders
        const receivedChanged = currentReceivedCards.length !== transformedReceivedCards.length ||
          currentReceivedCards.some(card => {
            const newCard = transformedReceivedCards.find(c => c.tokenId === card.tokenId);
            if (!newCard) return true; // Card was removed
            return newCard.status !== card.status || 
                   newCard.amount !== card.amount ||
                   newCard.currency !== card.currency ||
                   newCard.message !== card.message;
          }) ||
          transformedReceivedCards.some(newCard => {
            const existingCard = currentReceivedCards.find(c => c.tokenId === newCard.tokenId);
            return !existingCard; // New card was added
          });

        // Always return blockchain data if counts differ, otherwise only if there are changes
        if (currentReceivedCards.length !== transformedReceivedCards.length) {
          return transformedReceivedCards;
        }
        
        return receivedChanged ? transformedReceivedCards : currentReceivedCards;
      });

      // Keep existing sent cards; no blockchain update performed here
      
      if (ENABLE_BLOCKCHAIN_SYNC) {
        console.log('Blockchain sync completed');
      }
    } catch (error) {
      console.error('Error syncing with blockchain:', error);
      // Don't show error to user - they already have data from Supabase
    } finally {
    }
  };

  const fetchCardsFromBlockchain = async () => {
    if (!isConnected || !address) return;

    try {
      setLoading(true);
      
      // Initialize web3 service
      const walletClient = createWalletClient({
        chain: arcTestnet,
        transport: custom(window.ethereum)
      });

      await web3Service.initialize(walletClient, address);
      
      // Load gift cards from blockchain
      const blockchainCards = await web3Service.loadGiftCards(false, true);
      
      // Sent cards sync is disabled (handled via Supabase cache)
      
      // Transform blockchain data to our format for received cards
      const transformedCards: GiftCard[] = blockchainCards.map(card => ({
        tokenId: card.tokenId,
        amount: card.amount,
        currency: card.token,
        design: 'pink',
        message: card.message,
        recipient: card.recipient,
        sender: card.sender,
        status: card.redeemed ? 'redeemed' : 'active',
        createdAt: new Date().toLocaleDateString(),
        hasTimer: false,
        hasPassword: false,
        qrCode: `/spend?tokenId=${card.tokenId}`
      }));

      // Update card state
      setReceivedCards(transformedCards);
      // Keep previously loaded sent cards
    } catch (error) {
      console.error('Error fetching cards:', error);
      if (!(error as Error).message?.includes('rate limit') && !(error as Error).message?.includes('429')) {
        toast.error('Failed to load gift cards');
      }
    } finally {
      setLoading(false);
    }
  };


  const filteredSentCards = sentCards.filter(card => {
    const matchesSearch = card.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         card.recipient.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || card.status === filterStatus;
    const matchesCurrency = filterCurrency === 'all' || card.currency === filterCurrency;
    return matchesSearch && matchesStatus && matchesCurrency;
  });

  const filteredReceivedCards = receivedCards.filter(card => {
    const matchesSearch = card.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         card.sender.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || card.status === filterStatus;
    const matchesCurrency = filterCurrency === 'all' || card.currency === filterCurrency;
    return matchesSearch && matchesStatus && matchesCurrency;
  });

  // Allow viewing pending cards even without wallet connection (they can use Internal wallet)
  // But require wallet for viewing received/sent cards
  if (!isConnected && !authenticated) {
    return (
      <div className="p-6">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Gift className="w-12 h-12 opacity-50" />
            </EmptyMedia>
            <EmptyTitle>Connect your wallet</EmptyTitle>
            <EmptyDescription>
              Please connect your wallet or social account to view your gift cards
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-center gap-2">
          <Spinner className="w-6 h-6" />
          <span className="text-gray-600">Loading gift cards...</span>
        </div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">My gift cards</h2>
        <div className="flex gap-2">
          <Input
            placeholder="Search cards..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-128"
          />
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="redeemed">Redeemed</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterCurrency} onValueChange={setFilterCurrency}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="USDC">USDC</SelectItem>
              <SelectItem value="EURC">EURC</SelectItem>
              <SelectItem value="USYC">USYC</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className={`grid w-full ${authenticated ? 'grid-cols-3' : 'grid-cols-2'}`}>
          <TabsTrigger value="sent">Sent ({sentCards.length})</TabsTrigger>
          <TabsTrigger value="received">Received ({receivedCards.length})</TabsTrigger>
          {authenticated && (
            <TabsTrigger value="pending">Pending Claims ({pendingCount})</TabsTrigger>
          )}
        </TabsList>
        
        {authenticated && (
          <TabsContent value="pending" className="space-y-4">
            <ClaimCards 
              autoLoad={true}
              onCardClaimed={async () => {
                // Wait a bit for database to update after claim
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // Reset hasFetched to force reload
                setHasFetched(false);
                
                // Always refresh cards after claim, even without MetaMask
                // This ensures cards claimed via Internal wallet appear immediately
                await fetchCards();
                await fetchPendingCardsCount();
                
                // Switch to "Received" tab to show the newly claimed card
                setActiveTab('received');
              }}
              onPendingCountChange={setPendingCount}
            />
          </TabsContent>
        )}
        
        <TabsContent value="sent" className="space-y-4">
          {filteredSentCards.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Gift className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No sent gift cards found</p>
              </div>
            ) : (
            filteredSentCards.map((card) => (
              <Card key={card.tokenId} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${
                        card.design === 'pink' ? 'from-pink-400 to-purple-500' :
                        card.design === 'blue' ? 'from-blue-400 to-cyan-500' :
                        'from-green-400 to-emerald-500'
                      } flex items-center justify-center`}>
                        <Gift className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">${card.amount} {card.currency}</CardTitle>
                        <p className="text-sm text-gray-600">To: {card.recipient.startsWith('@') ? card.recipient : `${card.recipient.slice(0, 6)}...${card.recipient.slice(-4)}`}</p>
                        <p className="text-xs text-gray-500">Token ID: {card.tokenId}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(card.status)}>
                        {getStatusIcon(card.status)}
                        {card.status}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {card.message && card.message.trim() && (
                    <p className="text-gray-700 mb-3">"{card.message}"</p>
                  )}
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>Created: {card.createdAt}</span>
                    {card.expiresAt && <span>Expires: {card.expiresAt}</span>}
                  </div>
                  <div className="flex gap-2 mt-3">
                    {card.hasTimer && (
                      <Badge variant="outline" className="text-xs">
                        <Clock className="w-3 h-3 mr-1" />
                        Timer
                      </Badge>
                    )}
                    {card.hasPassword && (
                      <Badge variant="outline" className="text-xs">
                        <Eye className="w-3 h-3 mr-1" />
                        Protected
                      </Badge>
            )}
          </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
        
        <TabsContent value="received" className="space-y-4">
          {filteredReceivedCards.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Gift className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No received gift cards found</p>
              </div>
            ) : (
            filteredReceivedCards.map((card) => (
              <Card 
                key={card.tokenId} 
                className="hover:shadow-md transition-shadow cursor-pointer" 
                onClick={() => onSpendCard(card.tokenId)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${
                        card.design === 'pink' ? 'from-pink-400 to-purple-500' :
                        card.design === 'blue' ? 'from-blue-400 to-cyan-500' :
                        'from-green-400 to-emerald-500'
                      } flex items-center justify-center`}>
                        <Gift className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">${card.amount} {card.currency}</CardTitle>
                        <p className="text-sm text-gray-600">From: {card.sender.startsWith('@') ? card.sender : `${card.sender.slice(0, 6)}...${card.sender.slice(-4)}`}</p>
                        <p className="text-xs text-gray-500">Token ID: {card.tokenId}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(card.status)}>
                        {getStatusIcon(card.status)}
                        {card.status}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {card.message && card.message.trim() && (
                    <p className="text-gray-700 mb-3">"{card.message}"</p>
                  )}
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>Received: {card.createdAt}</span>
                    {card.expiresAt && <span>Expires: {card.expiresAt}</span>}
                  </div>
                  <div className="flex gap-2 mt-3">
                    {card.hasTimer && (
                      <Badge variant="outline" className="text-xs">
                        <Clock className="w-3 h-3 mr-1" />
                        Timer
                      </Badge>
                    )}
                    {card.hasPassword && (
                      <Badge variant="outline" className="text-xs">
                        <Eye className="w-3 h-3 mr-1" />
                        Protected
                      </Badge>
            )}
          </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
import { useState, useEffect } from 'react';
import { Gift, Eye, Clock, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@/components/ui/empty';
import WalletIcon from '@/components/ui/icons/wallet-icon';
import { Spinner } from '@/components/ui/spinner';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { useAccount } from 'wagmi';
import { createWalletClient, custom } from 'viem';
import { arcTestnet } from '@/lib/web3/wagmiConfig';
import { ARC_CHAIN_ID } from '@/lib/web3/constants';
import web3Service from '@/lib/web3/web3Service';
import { ClaimCards } from './ClaimCards';
import { usePrivySafe } from '@/lib/privy/usePrivySafe';
import { GiftCardsService } from '@/lib/supabase/giftCards';
import {
  countPendingCards,
  identitiesFromPrivyUser,
  resolveGiftCardWalletAddresses,
} from '@/lib/giftCards/claimService';
import { GIFT_CARD_PLATFORMS } from '@/lib/giftCards/registry';

interface GiftCard {
  tokenId: string;
  amount: string;
  currency: 'USDC' | 'EURC' | 'USYC' | 'PATHUSD' | 'ALPHAUSD' | 'BETAUSD' | 'THETAUSD';
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
  const activeChain = arcTestnet;
  const activeChainId = ARC_CHAIN_ID;
  const { authenticated, user } = usePrivySafe();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCurrency, setFilterCurrency] = useState('all');
  const [sentCards, setSentCards] = useState<GiftCard[]>([]);
  const [receivedCards, setReceivedCards] = useState<GiftCard[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('received');

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
    if (!authenticated || !user) {
      setPendingCount(0);
      return;
    }

    const identities = identitiesFromPrivyUser(user);
    if (identities.length === 0) {
      setPendingCount(0);
      return;
    }

    try {
      if (isConnected && address && typeof window !== 'undefined' && window.ethereum) {
        const walletClient = createWalletClient({
          chain: activeChain,
          transport: custom(window.ethereum)
        });
        await web3Service.initialize(walletClient, address, activeChainId);
      }

      const totalCount = await countPendingCards(identities);
      setPendingCount(totalCount);
    } catch (error) {
      console.error('Error fetching pending cards count:', error);
      setPendingCount(0);
    }
  };

  const cardsFetchKey = [
    isConnected ? address?.toLowerCase() ?? '' : '',
    authenticated ? '1' : '0',
    (user as { id?: string } | undefined)?.id ?? '',
    ...GIFT_CARD_PLATFORMS.map((platform) => {
      const account = (user as any)?.[platform];
      if (!account) return '';
      if (platform === 'telegram') {
        return String(account.username || account.telegramUserId || account.id || account.subject || '');
      }
      return String(account.subject || account.username || '');
    }),
  ].join('|');

  useEffect(() => {
    const canLoadCards = (isConnected && address) || (authenticated && user);
    if (!canLoadCards) {
      setLoading(false);
      setSentCards([]);
      setReceivedCards([]);
      return;
    }

    let cancelled = false;
    setLoading(true);
    fetchCards().finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- cardsFetchKey deliberately governs this async wallet-fallback load; memoizing its helper requires refactoring that call graph.
  }, [cardsFetchKey, isConnected, address, authenticated, user]);

  useEffect(() => {
    // Fetch pending cards count if authenticated and has at least one social network
    // This works even without connected wallet because web3Service uses publicClient for read operations
    if (authenticated && user && identitiesFromPrivyUser(user).length > 0) {
      fetchPendingCardsCount();
    } else {
      setPendingCount(0);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- Identity fields intentionally govern the RPC count; its wallet-initialization helper is not yet stable.
  }, [authenticated, user, cardsFetchKey, isConnected, address]);

  const fetchCards = async () => {
    // If MetaMask is connected - use its address
    // If there is no MetaMask but a social network is linked - check for a Internal Wallet
    let recipientAddresses: string[] = [];
    
    if (isConnected && address) {
      recipientAddresses.push(address.toLowerCase());
    }
    
    // Check Internal Wallet for social networks via registry + walletResolution
    if (authenticated && user) {
      try {
        const resolved = await resolveGiftCardWalletAddresses({
          privyUser: user,
          connectedAddress: null,
        });
        for (const walletAddr of resolved) {
          if (!recipientAddresses.includes(walletAddr)) {
            recipientAddresses.push(walletAddr);
          }
        }
      } catch (error) {
        console.error('Error fetching Internal Wallets:', error);
      }
    }
    
    // If neither MetaMask nor a Internal Wallet is available - do not load cards.
    // Unclaimed social gift cards belong in Pending Claims (on-chain vault), not Received.
    if (recipientAddresses.length === 0) {
      return;
    }

    try {
      // First, try to load from Supabase cache (fast) - display immediately
      // Loading cards from Supabase cache
      
      // Received: only rows where recipient is your wallet (after claim sync / DB address path).
      // Pending social cards are listed under Pending Claims, not here.
      const [allReceivedCards, allSentCardsRaw] = await Promise.all([
        Promise.all(
          recipientAddresses.map((addr) => GiftCardsService.getCardsByRecipientForMyCards(addr, activeChainId))
        ).then((results) => results.flat()),
        Promise.all(
          recipientAddresses.map((addr) => GiftCardsService.getCardsBySenderForMyCards(addr, activeChainId))
        ).then((results) => results.flat()),
      ]);

        // Transform Supabase data to our format
        // Remove duplicates by tokenId
      const uniqueReceivedCards = Array.from(
        new Map(allReceivedCards.map(card => [card.token_id, card])).values()
      );
      const uniqueSentCards = Array.from(
        new Map(allSentCardsRaw.map(card => [card.token_id, card])).values()
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

      const transformedSentCards: GiftCard[] = uniqueSentCards.map(card => {
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
          sender: card.sender_address || '',
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
    } catch (error) {
      console.error('Error fetching cards from Supabase:', error);
      // Fallback to blockchain if Supabase fails
      await fetchCardsFromBlockchain();
    }
  };

  const fetchCardsFromBlockchain = async () => {
    if (!isConnected || !address) return;

    try {
      setLoading(true);
      
      // Initialize web3 service
      const walletClient = createWalletClient({
        chain: activeChain,
        transport: custom(window.ethereum)
      });

      await web3Service.initialize(walletClient, address, activeChainId);
      
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

  // Allow viewing pending cards even without wallet connection (they can use Internal Wallet)
  // But require wallet for viewing received/sent cards
  if (!isConnected && !authenticated) {
    return (
      <div className="p-6">
        <Empty className="flex-none gap-4 md:p-6">
          <EmptyHeader>
            <WalletIcon size={40} className="mb-2 text-foreground opacity-70" strokeWidth={1.75} />
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

                // Always refresh cards after claim, even without MetaMask
                // This ensures cards claimed via Internal Wallet appear immediately
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
                className="hover:shadow-md transition-shadow cursor-pointer focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                role="button"
                tabIndex={0}
                aria-label={`Spend gift card ${card.tokenId}`}
                onClick={() => onSpendCard(card.tokenId)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onSpendCard(card.tokenId);
                  }
                }}
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

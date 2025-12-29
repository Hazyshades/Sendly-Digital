import { useState, useEffect, useRef } from 'react';
import { Calendar, TrendingUp, Gift, ArrowUpRight, ArrowDownLeft, Download, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Input } from './ui/input';
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from './ui/empty';
import { Spinner } from './ui/spinner';
import { Skeleton } from './ui/skeleton';
import { toast } from 'sonner';
import { useAccount } from 'wagmi';
import { createWalletClient, custom } from 'viem';
import { arcTestnet } from '../utils/web3/wagmiConfig';
import web3Service from '../utils/web3/web3Service';
import { GiftCardsService } from '../utils/supabase/giftCards';

interface Transaction {
  id: string;
  type: 'sent' | 'received' | 'redeemed';
  amount: string;
  currency: 'USDC' | 'EURC' | 'USYC';
  counterpart: string;
  message: string;
  status: 'completed' | 'pending' | 'failed';
  timestamp: string;
  txHash: string;
  gasUsed?: string;
}

interface Analytics {
  totalSent: string;
  totalReceived: string;
  totalRedeemed: string;
  cardsSent: number;
  cardsReceived: number;
  averageAmount: string;
  topCurrency: 'USDC' | 'EURC' | 'USYC';
}

export function TransactionHistory() {
  const { address, isConnected } = useAccount();
  const [dateFilter, setDateFilter] = useState('all');
  const [currencyFilter, setCurrencyFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [analytics, setAnalytics] = useState<Analytics>({
    totalSent: '0',
    totalReceived: '0',
    totalRedeemed: '0',
    cardsSent: 0,
    cardsReceived: 0,
    averageAmount: '0',
    topCurrency: 'USDC'
  });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Add refs to prevent duplicate requests
  const isFetchingRef = useRef(false);
  const lastAddressRef = useRef<string | null>(null);
  const lastConnectionStateRef = useRef<boolean | null>(null);
  
  // Add data cache (increased cache time to 5 minutes)
  const dataCacheRef = useRef<{
    address: string | null;
    analytics: Analytics | null;
    transactions: Transaction[] | null;
    timestamp: number;
  }>({
    address: null,
    analytics: null,
    transactions: null,
    timestamp: 0
  });

  useEffect(() => {
    // Check if important parameters have actually changed
    const addressChanged = lastAddressRef.current !== address;
    const connectionChanged = lastConnectionStateRef.current !== isConnected;
    
    // Update refs
    lastAddressRef.current = address || null;
    lastConnectionStateRef.current = isConnected;
    
    // If already loading data, don't make duplicate request
    if (isFetchingRef.current) {
      return;
    }
    
    // If parameters haven't changed, don't make request
    if (!addressChanged && !connectionChanged) {
      return;
    }
    
    if (isConnected && address) {
      fetchData();
    } else {
      setLoading(false);
      // Reset data if wallet is not connected
      setAnalytics({
        totalSent: '0',
        totalReceived: '0',
        totalRedeemed: '0',
        cardsSent: 0,
        cardsReceived: 0,
        averageAmount: '0',
        topCurrency: 'USDC'
      });
      setTransactions([]);
    }
  }, [isConnected, address]);

  const fetchData = async () => {
    if (!isConnected || !address || isFetchingRef.current) return;

    // Check cache (increased cache time to 5 minutes)
    const cacheAge = Date.now() - dataCacheRef.current.timestamp;
    const cacheValid = cacheAge < 300000 && dataCacheRef.current.address === address; // 5 minutes
    
    if (cacheValid && dataCacheRef.current.analytics && dataCacheRef.current.transactions) {
      console.log('Using cached data');
      setAnalytics(dataCacheRef.current.analytics);
      setTransactions(dataCacheRef.current.transactions);
      setLoading(false);
      return;
    }

    try {
      isFetchingRef.current = true;
      setLoading(true);
      console.log('Fetching transaction history for:', address);
      
      // Initialize web3 service
      const walletClient = createWalletClient({
        chain: arcTestnet,
        transport: custom(window.ethereum)
      });

      await web3Service.initialize(walletClient, address);
      
      // Load received gift cards first (usually faster)
      // Using API to get fresh data without cache
      console.log('Loading received gift cards...');
      const receivedCardsData = await web3Service.loadGiftCards(false, true);
      
      // Load Supabase cache for received cards to enrich with tx_hash / created_at
      console.log('Loading received gift cards from Supabase...');
      const supabaseReceivedCards = await GiftCardsService.getCardsByRecipientAddress(address);
      const supabaseReceivedMap = new Map(
        supabaseReceivedCards.map(card => [card.token_id, card])
      );

      // Mark received cards with type 'received' and enrich from Supabase when possible
      const receivedCards = receivedCardsData.map(card => {
        const supa = supabaseReceivedMap.get(card.tokenId);
        return {
          ...card,
          type: 'received' as const,
          txHash: supa?.tx_hash || (card as any).txHash || null,
          createdAt: supa?.created_at || null
        };
      });
      
      // Load sent gift cards from Supabase cache
      console.log('Loading sent gift cards from Supabase...');
      const supabaseSentCards = await GiftCardsService.getCardsBySender(address);
      
      // Transform Supabase sent cards to match blockchain format
      const sentCards = supabaseSentCards.map(card => ({
        tokenId: card.token_id,
        amount: card.amount,
        token: card.currency,
        recipient: card.recipient_username || card.recipient_address || 'Unknown',
        sender: card.sender_address,
        message: card.message || '',
        redeemed: card.redeemed,
        type: 'sent' as const,
        txHash: card.tx_hash || null, // Use real tx_hash from Supabase
        createdAt: card.created_at || null // Use real created_at from Supabase
      }));
      
      console.log(`Loaded ${receivedCards.length} received cards and ${sentCards.length} sent cards`);
      
      // Combine all cards
      const allCards = [...receivedCards, ...sentCards];
      
      // Calculate analytics from blockchain data
      let totalSent = 0;
      let totalReceived = 0;
      let totalRedeemed = 0;
      let cardsSent = 0;
      let cardsReceived = 0;
      let cardsRedeemed = 0;
      const currencyCounts: Record<'USDC' | 'EURC' | 'USYC', number> = {
        USDC: 0,
        EURC: 0,
        USYC: 0,
      };

      allCards.forEach((card: any) => {
        const amount = parseFloat(card.amount);
        const symbol = card.token as 'USDC' | 'EURC' | 'USYC';
        if (symbol === 'USDC' || symbol === 'EURC' || symbol === 'USYC') {
          currencyCounts[symbol]++;
        }

        if (card.type === 'sent') {
          totalSent += amount;
          cardsSent++;
        } else {
          totalReceived += amount;
          cardsReceived++;
          
          if (card.redeemed) {
            totalRedeemed += amount;
            cardsRedeemed++;
          }
        }
      });

      const averageAmount = (cardsSent + cardsReceived) > 0 ? 
        ((totalSent + totalReceived) / (cardsSent + cardsReceived)).toFixed(2) : '0';
      const currencyOrder: Array<keyof typeof currencyCounts> = ['USDC', 'EURC', 'USYC'];
      const topCurrency = currencyOrder.reduce((prev, curr) => {
        return currencyCounts[curr] > currencyCounts[prev] ? curr : prev;
      }, currencyOrder[0]);

      const newAnalytics: Analytics = {
        totalSent: totalSent.toFixed(2),
        totalReceived: totalReceived.toFixed(2),
        totalRedeemed: totalRedeemed.toFixed(2),
        cardsSent,
        cardsReceived,
        averageAmount,
        topCurrency
      };

      console.log('Setting analytics:', newAnalytics);
      setAnalytics(newAnalytics);

      // Create transactions from blockchain data
      const blockchainTransactions: Transaction[] = allCards.map((card) => {
        // Use real txHash if available (from Supabase) and it's a full hash (66 chars with 0x)
        const txHashRaw = (card as any).txHash;
        const txHash =
          txHashRaw && txHashRaw.length === 66 && txHashRaw.startsWith('0x')
            ? txHashRaw
            : null;
        
        // Use real created_at timestamp from Supabase if available, otherwise use current time as fallback
        const createdAt = (card as any).createdAt;
        const timestamp = createdAt
          ? new Date(createdAt).toISOString()
          : new Date().toISOString();
        
        return {
          id: `tx_${card.tokenId}_${card.type}`,
          type: card.type === 'sent' ? 'sent' : (card.redeemed ? 'redeemed' : 'received'),
          amount: card.amount,
          currency: card.token,
          counterpart: card.type === 'sent' ? card.recipient : card.sender,
          message: card.message,
          status: 'completed',
          timestamp,
          txHash: txHash || '0x', // keep non-empty to avoid UI break; ideally always real hash
          gasUsed: '0.002'
        };
      });

      console.log('Setting transactions:', blockchainTransactions);
      setTransactions(blockchainTransactions);
      
      // Save data to cache
      dataCacheRef.current = {
        address: address || null,
        analytics: newAnalytics,
        transactions: blockchainTransactions,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Error fetching data:', error);
      
      // Check different types of errors
      if (error instanceof Error) {
        if (error.message.includes('429')) {
          toast.error('Too many requests. Please try again later.');
        } else if (error.message.includes('Invalid parameters') || error.message.includes('eth_getLogs')) {
          toast.error('Error loading history. Please refresh the page.');
        } else if (error.message.includes('timeout') || error.message.includes('Timeout')) {
          toast.error('Request timeout. Please check your connection.');
        } else {
          toast.error('Error loading data. Please try again later.');
        }
      } else {
        toast.error('Unknown error while loading data.');
      }
      
      // On error, DON'T reset data if it was already loaded
      // This prevents data disappearance on network errors
      if (transactions.length === 0) {
        setAnalytics({
          totalSent: '0',
          totalReceived: '0',
          totalRedeemed: '0',
          cardsSent: 0,
          cardsReceived: 0,
          averageAmount: '0',
          topCurrency: 'USDC'
        });
        setTransactions([]);
      }
    } finally {
      console.log('Loading finished, setting loading to false');
      setLoading(false);
      isFetchingRef.current = false;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'sent': return <ArrowUpRight className="w-4 h-4 text-red-500" />;
      case 'received': return <ArrowDownLeft className="w-4 h-4 text-green-500" />;
      case 'redeemed': return <Gift className="w-4 h-4 text-blue-500" />;
      default: return <Gift className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'sent': return 'text-red-600';
      case 'received': return 'text-green-600';
      case 'redeemed': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  const shortenAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const handleAddressClick = (address: string) => {
    window.open(`https://debank.com/profile/${address}`, '_blank');
  };

  const handleTxHashClick = (txHash: string) => {
    const explorer = (import.meta as any).env?.VITE_ARC_BLOCK_EXPLORER_URL || 'https://testnet.arcscan.app';
    window.open(`${explorer}/tx/${txHash}`, '_blank');
  };

  const filteredTransactions = transactions.filter(tx => {
    const matchesSearch = tx.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         tx.counterpart.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         tx.txHash.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || tx.type === typeFilter;
    const matchesCurrency = currencyFilter === 'all' || tx.currency === currencyFilter;
    
    let matchesDate = true;
    if (dateFilter !== 'all') {
      const txDate = new Date(tx.timestamp);
      const now = new Date();
      const diffDays = Math.floor((now.getTime() - txDate.getTime()) / (1000 * 60 * 60 * 24));
      
      switch (dateFilter) {
        case 'today':
          matchesDate = diffDays === 0;
          break;
        case 'week':
          matchesDate = diffDays <= 7;
          break;
        case 'month':
          matchesDate = diffDays <= 30;
          break;
      }
    }
    
    return matchesSearch && matchesType && matchesCurrency && matchesDate;
  });

  const handleExport = () => {
    const csvContent = [
      ['Date', 'Type', 'Amount', 'Currency', 'Counterpart', 'Message', 'Status', 'Transaction Hash'],
      ...filteredTransactions.map(tx => [
        new Date(tx.timestamp).toLocaleDateString(),
        tx.type,
        tx.amount,
        tx.currency,
        tx.counterpart,
        tx.message,
        tx.status,
        tx.txHash
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'transactions.csv';
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast.success('Transactions exported successfully!');
  };

  if (!isConnected) {
    return (
      <div className="p-6">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Calendar className="w-12 h-12 opacity-50" />
            </EmptyMedia>
            <EmptyTitle>Connect your wallet</EmptyTitle>
            <EmptyDescription>
              Please connect your wallet to view transaction history
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Spinner className="w-6 h-6" />
            <p className="text-gray-600">Loading transaction history...</p>
          </div>
          <p className="text-gray-500 text-sm">This may take some time on first connection</p>
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
        <h2 className="text-2xl font-semibold">Transaction history</h2>
        <div className="flex gap-2">
          <Button 
            onClick={() => {
              // Clear cache and reload data
              dataCacheRef.current = {
                address: null,
                analytics: null,
                transactions: null,
                timestamp: 0
              };
              // Clear web3 service cache too
              web3Service.clearCache();
              fetchData();
            }} 
            variant="outline"
            disabled={loading}
          >
            {loading ? <Spinner className="w-4 h-4 mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Refresh
          </Button>
          <Button onClick={handleExport} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sent</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">${analytics.totalSent}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.cardsSent} cards sent
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Received</CardTitle>
            <ArrowDownLeft className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">${analytics.totalReceived}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.cardsReceived} cards received
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Redeemed</CardTitle>
            <Gift className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">${analytics.totalRedeemed}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.cardsReceived} cards received
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Amount</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">${analytics.averageAmount}</div>
            <p className="text-xs text-muted-foreground">
              Per card
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <Input
          placeholder="Search transactions..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-64"
        />
        
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="received">Received</SelectItem>
            <SelectItem value="redeemed">Redeemed</SelectItem>
          </SelectContent>
        </Select>

        <Select value={currencyFilter} onValueChange={setCurrencyFilter}>
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

        <Select value={dateFilter} onValueChange={setDateFilter}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Transactions List */}
      <div className="space-y-4">
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No transactions found</p>
          </div>
        ) : (
          filteredTransactions.map((tx) => (
            <Card key={tx.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {getTypeIcon(tx.type)}
                      <div>
                        <div className={`font-medium ${getTypeColor(tx.type)}`}>
                          {tx.type.charAt(0).toUpperCase() + tx.type.slice(1)} ${tx.amount} {tx.currency}
                        </div>
                        <div className="text-sm">
                          <button
                            onClick={() => handleAddressClick(tx.counterpart)}
                            className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer transition-colors"
                            title={`View on Debank: ${tx.counterpart}`}
                          >
                            {shortenAddress(tx.counterpart)}
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-sm text-gray-600 flex-1 min-w-0">
                      <div className="break-words">
                        {tx.message}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <Badge className={getStatusColor(tx.status)}>
                      {tx.status}
                    </Badge>
                    <div className="text-right text-sm text-gray-500 whitespace-nowrap">
                      <div>{new Date(tx.timestamp).toLocaleDateString()}</div>
                      <div>{new Date(tx.timestamp).toLocaleTimeString()}</div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-2 text-xs text-gray-500">
                  <span>TX: </span>
                  <button
                    onClick={() => handleTxHashClick(tx.txHash)}
                    className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer transition-colors"
                    title={`View on Arc Explorer: ${tx.txHash}`}
                  >
                    {tx.txHash.slice(0, 10)}...{tx.txHash.slice(-8)}
                  </button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
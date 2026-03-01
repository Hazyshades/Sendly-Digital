import { useState, useEffect, useRef } from 'react';
import { Calendar, TrendingUp, Gift, ArrowUpRight, ArrowDownLeft, Download, RefreshCw, Search, CheckCircle, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from '@/components/ui/empty';
import { Spinner } from '@/components/ui/spinner';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { useAccount } from 'wagmi';
import { createWalletClient, custom } from 'viem';
import { useChain } from '@/contexts/ChainContext';
import { getExplorerTxUrl } from '@/lib/web3/constants';
import web3Service from '@/lib/web3/web3Service';
import { GiftCardsService } from '@/lib/supabase/giftCards';
import { isZkHost } from '@/lib/runtime/zkHost';
import {
  getZkSendPaymentsBySender,
  getZkSendPaymentsByRecipientWallet,
  type ZkSendPaymentRow,
} from '@/lib/supabase/zksendPayments';
import { ZKSEND_CONTRACT_ADDRESS } from '@/lib/web3/constants';
import { RecipientAvatar } from '@/components/RecipientAvatar';

type SocialPlatform = 'twitter' | 'twitch' | 'telegram' | 'discord' | 'tiktok' | 'instagram' | '';

interface Transaction {
  id: string;
  type: 'sent' | 'received' | 'redeemed';
  amount: string;
  currency: 'USDC' | 'EURC' | 'USYC';
  counterpart: string;
  message: string;
  status: 'completed' | 'pending' | 'redeemed';
  timestamp: string;
  txHash: string;
  gasUsed?: string;
  platform?: SocialPlatform;
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

function normalizeTxHash(h: string | null | undefined): string {
  if (!h || typeof h !== 'string') return '0x';
  const s = h.trim();
  return s.length === 66 && s.startsWith('0x') ? s : '0x';
}

function normalizePlatform(p?: string | null): SocialPlatform {
  const s = (p ?? '').trim().toLowerCase();
  if (['twitter', 'twitch', 'telegram', 'discord', 'tiktok', 'instagram'].includes(s)) return s as SocialPlatform;
  return '';
}

function toTransactionFromSent(row: ZkSendPaymentRow): Transaction {
  const counterpart =
    row.recipient_username ?? row.recipient_username_raw ?? row.recipient_identity_hash ?? '-';
  const currency = (row.currency === 'EURC' ? 'EURC' : row.currency === 'USYC' ? 'USYC' : 'USDC') as 'USDC' | 'EURC' | 'USYC';
  return {
    id: `zksend_sent_${row.chain_id}_${row.contract_address}_${row.payment_id}`,
    type: 'sent',
    amount: row.amount ?? '0',
    currency,
    counterpart,
    message: '',
    status: 'completed',
    timestamp: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    txHash: normalizeTxHash(row.tx_hash),
    gasUsed: '0.002',
    platform: normalizePlatform(row.social_platform),
  };
}

function formatRelative(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} mins ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString();
}

function toTransactionFromReceived(row: ZkSendPaymentRow): Transaction {
  const counterpart = row.sender_address ?? '-';
  const currency = (row.currency === 'EURC' ? 'EURC' : row.currency === 'USYC' ? 'USYC' : 'USDC') as 'USDC' | 'EURC' | 'USYC';
  const timestamp = row.claimed_at ?? row.created_at ?? new Date().toISOString();
  const txHash = normalizeTxHash(row.claim_tx_hash ?? row.tx_hash);
  return {
    id: `zksend_recv_${row.chain_id}_${row.contract_address}_${row.payment_id}`,
    type: row.claimed ? 'redeemed' : 'received',
    amount: row.amount ?? '0',
    currency,
    counterpart,
    message: '',
    status: row.claimed ? 'redeemed' : 'completed',
    timestamp: typeof timestamp === 'string' ? new Date(timestamp).toISOString() : timestamp,
    txHash,
    gasUsed: '0.002',
    platform: normalizePlatform(row.social_platform),
  };
}

export function TransactionHistory() {
  const { address, isConnected } = useAccount();
  const { activeChain, activeChainId } = useChain();
  const [dateFilter, setDateFilter] = useState('all');
  const [currencyFilter, setCurrencyFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusTab, setStatusTab] = useState<'all' | 'sent' | 'received' | 'redeemed'>('all'); // 'pending' commented out
  const [avgMode, setAvgMode] = useState<'sent' | 'received'>('sent'); // change Avg only in zk dom
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

  const zkSendFilter = {
    chainId: String(import.meta.env.VITE_ARC_CHAIN_ID ?? 5042002),
    contractAddress: ZKSEND_CONTRACT_ADDRESS?.toLowerCase() ?? '',
  };

  const fetchZkSendData = async () => {
    if (!address || isFetchingRef.current) return;
    try {
      isFetchingRef.current = true;
      setLoading(true);
      const [sentRows, receivedRows] = await Promise.all([
        getZkSendPaymentsBySender(address, zkSendFilter),
        getZkSendPaymentsByRecipientWallet(address, zkSendFilter),
      ]);

      const sentTxs: Transaction[] = sentRows.map((row) => toTransactionFromSent(row));
      const receivedTxs: Transaction[] = receivedRows.map((row) =>
        toTransactionFromReceived(row)
      );
      const allTxs = [...sentTxs, ...receivedTxs].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      let totalSent = 0;
      let totalReceived = 0;
      let totalRedeemed = 0;
      let cardsSent = 0;
      let cardsReceived = 0;
      const currencyCounts: Record<'USDC' | 'EURC' | 'USYC', number> = {
        USDC: 0,
        EURC: 0,
        USYC: 0,
      };
      allTxs.forEach((tx) => {
        const amount = parseFloat(tx.amount);
        const sym = tx.currency;
        if (sym === 'USDC' || sym === 'EURC' || sym === 'USYC') currencyCounts[sym]++;
        if (tx.type === 'sent') {
          totalSent += amount;
          cardsSent++;
        } else {
          totalReceived += amount;
          cardsReceived++;
          if (tx.type === 'redeemed') totalRedeemed += amount;
        }
      });
      const averageAmount =
        cardsSent + cardsReceived > 0
          ? ((totalSent + totalReceived) / (cardsSent + cardsReceived)).toFixed(2)
          : '0';
      const currencyOrder: Array<keyof typeof currencyCounts> = ['USDC', 'EURC', 'USYC'];
      const topCurrency = currencyOrder.reduce(
        (prev, curr) => (currencyCounts[curr] > currencyCounts[prev] ? curr : prev),
        currencyOrder[0]
      );
      const newAnalytics: Analytics = {
        totalSent: totalSent.toFixed(2),
        totalReceived: totalReceived.toFixed(2),
        totalRedeemed: totalRedeemed.toFixed(2),
        cardsSent,
        cardsReceived,
        averageAmount,
        topCurrency,
      };
      setAnalytics(newAnalytics);
      setTransactions(allTxs);
      dataCacheRef.current = {
        address: address ?? null,
        analytics: newAnalytics,
        transactions: allTxs,
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error('[TransactionHistory] fetchZkSendData:', error);
      toast.error('Error loading zkSEND history.');
      if (transactions.length === 0) {
        setAnalytics({
          totalSent: '0',
          totalReceived: '0',
          totalRedeemed: '0',
          cardsSent: 0,
          cardsReceived: 0,
          averageAmount: '0',
          topCurrency: 'USDC',
        });
        setTransactions([]);
      }
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  };

  const fetchData = async () => {
    if (!isConnected || !address || isFetchingRef.current) return;

    if (isZkHost()) {
      const cacheAge = Date.now() - dataCacheRef.current.timestamp;
      const cachedAnalytics = dataCacheRef.current.analytics;
      const cachedTransactions = dataCacheRef.current.transactions;
      const cacheValid =
        cacheAge < 300000 &&
        dataCacheRef.current.address === address &&
        cachedAnalytics != null &&
        cachedTransactions != null;
      if (cacheValid) {
        setAnalytics(cachedAnalytics);
        setTransactions(cachedTransactions);
        setLoading(false);
        return;
      }
      await fetchZkSendData();
      return;
    }

    // Check cache (increased cache time to 5 minutes)
    const cacheAge = Date.now() - dataCacheRef.current.timestamp;
    const cacheValid = cacheAge < 300000 && dataCacheRef.current.address === address; // 5 minutes
    
    const cachedAnalytics = dataCacheRef.current.analytics;
    const cachedTransactions = dataCacheRef.current.transactions;
    if (cacheValid && cachedAnalytics != null && cachedTransactions != null) {
      console.log('Using cached data');
      setAnalytics(cachedAnalytics);
      setTransactions(cachedTransactions);
      setLoading(false);
      return;
    }

    try {
      isFetchingRef.current = true;
      setLoading(true);
      console.log('Fetching transaction history for:', address);
      
      // Initialize web3 service
      const walletClient = createWalletClient({
        chain: activeChain,
        transport: custom(window.ethereum)
      });

      await web3Service.initialize(walletClient, address, activeChainId);
      
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
        
        const recipientType = (card as any).recipient_type as string | undefined;
        return {
          id: `tx_${card.tokenId}_${card.type}`,
          type: card.type === 'sent' ? 'sent' : (card.redeemed ? 'redeemed' : 'received'),
          amount: card.amount,
          currency: card.token,
          counterpart: card.type === 'sent' ? card.recipient : card.sender,
          message: card.message,
          status: card.redeemed ? 'redeemed' : 'completed',
          timestamp,
          txHash: txHash || '0x',
          gasUsed: '0.002',
          platform: card.type === 'sent' ? normalizePlatform(recipientType) : undefined,
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

  const shortenAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
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
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-400';
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/20 dark:text-yellow-400';
      case 'redeemed': return 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-400';
      case 'failed': return 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-500/20 dark:text-gray-400';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'sent': return 'text-red-600 dark:text-red-400';
      case 'received': return 'text-green-600 dark:text-green-400';
      case 'redeemed': return 'text-blue-600 dark:text-blue-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  const handleTxHashClick = (txHash: string) => {
    window.open(getExplorerTxUrl(activeChainId, txHash), '_blank');
  };

  const filteredTransactions = transactions.filter(tx => {
    const matchesSearch = !searchQuery.trim() ||
                         tx.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         tx.counterpart.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         tx.txHash.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || tx.type === typeFilter;
    const matchesCurrency = currencyFilter === 'all' || tx.currency === currencyFilter;
    const matchesStatusTab =
      statusTab === 'all' ||
      (statusTab === 'sent' && tx.type === 'sent') ||
      (statusTab === 'received' && (tx.type === 'received' || tx.type === 'redeemed')) ||
      (statusTab === 'redeemed' && tx.type === 'redeemed');
    
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
    
    return matchesSearch && matchesType && matchesCurrency && matchesDate && matchesStatusTab;
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

  const handleRefresh = () => {
      dataCacheRef.current = {
        address: null,
        analytics: null,
        transactions: null,
        timestamp: 0,
      };
      if (!isZkHost()) web3Service.clearCache();
      fetchData();
    };

    const getStatusBadge = (tx: Transaction) => {
      /* if (tx.status === 'pending') {
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Pending
          </span>
        );
      } */
      if (tx.status === 'redeemed') {
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-500/10 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20">
            <CheckCircle className="w-3.5 h-3.5 animate-pulse" />
            Received
          </span>
        );
      }
      const label = tx.type === 'sent' ? 'Sent' : 'Received';
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
          <CheckCircle className="w-3.5 h-3.5" />
          {label}
        </span>
      );
    };

    const isZk = isZkHost();

    // New design only for zk.localhost (and other zk hosts)
    if (isZk) {
      return (
      <div className="flex gap-4">
        <div className="flex-1 p-6 space-y-6 min-w-0">
        {/* Filters & Search Toolbar */}
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 p-2 shadow-sm flex flex-col md:flex-row gap-2">
          <div className="flex-1 relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
            </div>
            <input
              className="block w-full pl-10 pr-3 py-2.5 border-none rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-primary/50 text-sm transition-all"
              placeholder="Search by @username, address, or transaction ID..."
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg overflow-x-auto no-scrollbar">
            {(['all', 'sent', 'received'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setStatusTab(tab)}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-all ${
                  statusTab === tab
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm font-semibold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-white/5'
                }`}
              >
                {tab === 'sent' && <span className="w-2 h-2 rounded-full bg-emerald-500" />}
                {tab === 'received' && <span className="w-2 h-2 rounded-full bg-blue-500" />}
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Additional filters (type, currency, date) - compact 
        <div className="flex flex-wrap gap-2 items-center">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-28 h-9 text-xs">
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
            <SelectTrigger className="w-24 h-9 text-xs">
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
            <SelectTrigger className="w-28 h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
            </SelectContent>
          </Select>
        </div>*/}

        {/* Analytics Cards - compact row (zk: без Redeemed) */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Sent</span>
              <ArrowUpRight className="h-3.5 w-3.5 text-red-500" />
            </div>
            <div className="text-lg font-bold text-red-600 dark:text-red-400">${analytics.totalSent}</div>
            <p className="text-xs text-slate-500 dark:text-slate-400">{analytics.cardsSent} payments</p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Received</span>
              <ArrowDownLeft className="h-3.5 w-3.5 text-blue-500" />
            </div>
            <div className="text-lg font-bold text-blue-600 dark:text-blue-400">${analytics.totalReceived}</div>
            <p className="text-xs text-slate-500 dark:text-slate-400">{analytics.cardsReceived} payments</p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 relative -top-[5px]">Avg</span>
              <div className="flex rounded-lg bg-slate-200/80 dark:bg-slate-700/80 p-0.5 relative -top-[5px]">
                <button
                  type="button"
                  onClick={() => setAvgMode('sent')}
                  className={`px-2 py-0.5 rounded-md text-xs font-medium transition-all ${
                    avgMode === 'sent'
                      ? 'bg-white dark:bg-slate-600 text-red-600 dark:text-red-400 shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  Sent
                </button>
                <button
                  type="button"
                  onClick={() => setAvgMode('received')}
                  className={`px-2 py-0.5 rounded-md text-xs font-medium transition-all ${
                    avgMode === 'received'
                      ? 'bg-white dark:bg-slate-600 text-green-600 dark:text-green-400 shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  Received
                </button>
              </div>
            </div>
            <div className={`text-lg font-bold ${avgMode === 'sent' ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
              $
              {avgMode === 'sent'
                ? (analytics.cardsSent > 0 ? (parseFloat(analytics.totalSent) / analytics.cardsSent).toFixed(2) : '0.00')
                : (analytics.cardsReceived > 0 ? (parseFloat(analytics.totalReceived) / analytics.cardsReceived).toFixed(2) : '0.00')}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {avgMode === 'sent' ? 'per sent payment' : 'per received payment'}
            </p>
          </div>
        </div>

        {/* Transaction List (Inbox Style) */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col bg-white dark:bg-slate-800/30">
          <div className="hidden sm:grid grid-cols-12 gap-4 px-4 sm:px-6 py-3 bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            <div className="col-span-5 md:col-span-4">Recipient / Sender</div>
            <div className="col-span-3 md:col-span-3 text-right">Amount</div>
            <div className="col-span-2 md:col-span-3 pl-4">Status</div>
            <div className="col-span-2 md:col-span-2">Time</div>
          </div>
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-12 text-slate-500 dark:text-slate-400">
              <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No transactions found</p>
            </div>
          ) : (
            filteredTransactions.map((tx) => {
              const isSent = tx.type === 'sent';
              const amountFormatted = parseFloat(tx.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
              const usdFormatted = `$${parseFloat(tx.amount).toFixed(2)} USD`;
              const displayName = tx.counterpart.startsWith('0x') ? shortenAddress(tx.counterpart) : tx.counterpart;
              const secondaryText = tx.txHash && tx.txHash !== '0x' ? shortenAddress(tx.txHash) : 'Sendly';

              return (
                <div
                  key={tx.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => tx.txHash && tx.txHash !== '0x' && handleTxHashClick(tx.txHash)}
                  onKeyDown={(e) => e.key === 'Enter' && tx.txHash && tx.txHash !== '0x' && handleTxHashClick(tx.txHash)}
                  className="group relative grid grid-cols-12 gap-4 px-4 sm:px-6 py-4 items-center hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer border-b border-slate-100 dark:border-slate-700 last:border-0"
                >
                  <div className="col-span-12 sm:col-span-5 md:col-span-4 flex items-center gap-4">
                    <RecipientAvatar
                      platform={tx.platform}
                      counterpart={tx.counterpart}
                      displayName={displayName}
                      alt={`Profile of ${displayName}`}
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {displayName}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {tx.platform
                          ? `${tx.platform.charAt(0).toUpperCase() + tx.platform.slice(1)} • ${secondaryText}`
                          : secondaryText !== 'Sendly'
                            ? `TX: ${secondaryText}`
                            : 'Sendly'}
                      </span>
                    </div>
                  </div>
                  <div className="col-span-6 sm:col-span-3 md:col-span-3 flex flex-col sm:items-end justify-center">
                    <span className="text-sm font-bold text-slate-900 dark:text-white">
                      {isSent ? '-' : '+'} {amountFormatted} {tx.currency}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">{usdFormatted}</span>
                  </div>
                  <div className="col-span-6 sm:col-span-2 md:col-span-3 flex items-center sm:pl-4 justify-end sm:justify-start">
                    {getStatusBadge(tx)}
                  </div>
                  <div className="col-span-12 sm:col-span-2 md:col-span-2 flex items-center justify-end">
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      {formatRelative(new Date(tx.timestamp))}
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-400 ml-2 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {filteredTransactions.length > 0 && (
          <div className="flex justify-center pt-4 pb-2">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? 's' : ''} shown
            </p>
          </div>
        )}
        </div>

        {/* Vertical action buttons - right side 
        <div className="flex flex-col gap-2 py-6 pr-6 shrink-0 bg-transparent">
          <button
            onClick={handleExport}
            className="p-2 text-slate-500 hover:text-primary dark:text-slate-400 dark:hover:text-primary transition-colors rounded-lg"
            title="Export CSV"
          >
            <Download className="w-5 h-5" />
          </button>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="p-2 text-slate-500 hover:text-primary dark:text-slate-400 dark:hover:text-primary transition-colors rounded-lg disabled:opacity-50"
            title="Refresh"
          >
            {loading ? <Spinner className="w-5 h-5" /> : <RefreshCw className="w-5 h-5" />}
          </button>
        </div>*/}
      </div>
    );
    }

    // Original interface for normal localhost (not zk) - as before changes
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Transaction history</h2>
          <div className="flex gap-2">
            <Button
              onClick={handleRefresh}
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
              <p className="text-xs text-muted-foreground">{analytics.cardsSent} payments sent</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Received</CardTitle>
              <ArrowDownLeft className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">${analytics.totalReceived}</div>
              <p className="text-xs text-muted-foreground">{analytics.cardsReceived} payments received</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Redeemed</CardTitle>
              <Gift className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">${analytics.totalRedeemed}</div>
              <p className="text-xs text-muted-foreground">claimed</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Amount</CardTitle>
              <TrendingUp className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">${analytics.averageAmount}</div>
              <p className="text-xs text-muted-foreground">Per payment</p>
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

        {/* Transactions List - cards as in original */}
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
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            <span title={tx.counterpart}>{shortenAddress(tx.counterpart)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 flex-1 min-w-0">
                        <div className="break-words">{tx.message}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <Badge className={getStatusColor(tx.status)}>{tx.status}</Badge>
                      <div className="text-right text-sm text-gray-500 whitespace-nowrap">
                        <div>{new Date(tx.timestamp).toLocaleDateString()}</div>
                        <div>{new Date(tx.timestamp).toLocaleTimeString()}</div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    <span>TX: </span>
                    {tx.txHash && tx.txHash !== '0x' ? (
                      <button
                        type="button"
                        onClick={() => handleTxHashClick(tx.txHash)}
                        className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer transition-colors dark:text-blue-400 dark:hover:text-blue-300"
                        title={`View on Arc Explorer: ${tx.txHash}`}
                      >
                        {tx.txHash.slice(0, 10)}...{tx.txHash.slice(-8)}
                      </button>
                    ) : (
                      <span className="text-gray-400">- </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    );
}
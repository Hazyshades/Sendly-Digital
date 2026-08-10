import { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, TrendingUp, Gift, ArrowUpRight, ArrowDownLeft, Download, RefreshCw, Search, CheckCircle, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@/components/ui/empty';
import HistoryCircleIcon from '@/components/ui/icons/history-circle-icon';
import { Spinner } from '@/components/ui/spinner';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { useChainId } from 'wagmi';
import { createWalletClient, custom } from 'viem';
import { arcTestnet, chains } from '@/lib/web3/wagmiConfig';
import { getExplorerTxUrl, getContractsForChain, ARC_CHAIN_ID } from '@/lib/web3/constants';
import web3Service from '@/lib/web3/web3Service';
import { GiftCardsService, getMyCardsDataSource } from '@/lib/supabase/giftCards';
import { useWalletSourcePreference } from '@/hooks/useWalletSourcePreference';
import { WalletSourceToggle } from '@/components/zksend/WalletSourceToggle';
import { formatDisplayAmount, formatTokenAmountString } from '@/lib/tokenAmount';
import { isZkHost } from '@/lib/runtime/zkHost';
import {
  getZkSendPaymentsBySender,
  getZkSendPaymentsByRecipientWallet,
  type ZkSendPaymentRow,
} from '@/lib/supabase/zksendPayments';
import { RecipientAvatar } from '@/components/RecipientAvatar';

type SocialPlatform = 'twitter' | 'twitch' | 'telegram' | 'discord' | 'tiktok' | 'instagram' | '';

interface Transaction {
  id: string;
  type: 'sent' | 'received' | 'redeemed';
  amount: string;
  currency: 'USDC' | 'EURC' | 'USYC' | 'PATHUSD' | 'ALPHAUSD' | 'BETAUSD' | 'THETAUSD';
  counterpart: string;
  message: string;
  status: 'completed' | 'pending' | 'redeemed';
  timestamp: string;
  txHash: string;
  gasUsed?: string;
  platform?: SocialPlatform;
}

type TransactionCurrency = Transaction['currency'];

interface Analytics {
  totalSent: string;
  totalReceived: string;
  totalRedeemed: string;
  cardsSent: number;
  cardsReceived: number;
  averageAmount: string;
  topCurrency: TransactionCurrency;
}

function normalizeTxHash(h: string | null | undefined): string {
  if (!h || typeof h !== 'string') return '0x';
  const s = h.trim();
  return s.length === 66 && s.startsWith('0x') ? s : '0x';
}

type GiftCardHistoryRow = {
  tokenId: string;
  amount: string;
  token: string;
  recipient: string;
  sender: string;
  message: string;
  redeemed: boolean;
  type: 'sent' | 'received';
  txHash: string | null;
  createdAt: string | null;
  recipient_type?: string | null;
};

function normalizePlatform(p?: string | null): SocialPlatform {
  const s = (p ?? '').trim().toLowerCase();
  if (['twitter', 'twitch', 'telegram', 'discord', 'tiktok', 'instagram'].includes(s)) return s as SocialPlatform;
  return '';
}

function AnalyticsAmount({ value, className }: { value: string; className?: string }) {
  const rounded = formatDisplayAmount(value);
  return (
    <div className={`tabular-nums ${className ?? ''}`}>
      ${rounded}
    </div>
  );
}

function toTransactionFromSent(row: ZkSendPaymentRow): Transaction {
  const counterpart =
    row.recipient_username ?? row.recipient_username_raw ?? row.recipient_identity_hash ?? '-';
  const currency = (
    ['USDC', 'EURC', 'USYC', 'PATHUSD', 'ALPHAUSD', 'BETAUSD', 'THETAUSD'].includes((row.currency ?? '').toUpperCase())
      ? (row.currency ?? '').toUpperCase()
      : 'USDC'
  ) as Transaction['currency'];
  return {
    id: `zksend_sent_${row.chain_id}_${row.contract_address}_${row.payment_id}`,
    type: 'sent',
    amount: formatTokenAmountString(row.amount ?? '0', { unit: 'human' }),
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
  const currency = (
    ['USDC', 'EURC', 'USYC', 'PATHUSD', 'ALPHAUSD', 'BETAUSD', 'THETAUSD'].includes((row.currency ?? '').toUpperCase())
      ? (row.currency ?? '').toUpperCase()
      : 'USDC'
  ) as Transaction['currency'];
  const timestamp = row.claimed_at ?? row.created_at ?? new Date().toISOString();
  const txHash = normalizeTxHash(row.claim_tx_hash ?? row.tx_hash);
  return {
    id: `zksend_recv_${row.chain_id}_${row.contract_address}_${row.payment_id}`,
    type: row.claimed ? 'redeemed' : 'received',
    amount: formatTokenAmountString(row.amount ?? '0', { unit: 'human' }),
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
  const {
    walletSource,
    setWalletSource,
    activeAddress,
    hasExternalWallet,
    hasInternalWallet,
    hasSocialIdentity,
    checkingWallet,
  } = useWalletSourcePreference();
  const showWalletToggle = hasExternalWallet && hasInternalWallet;
  const connectedChainId = useChainId();
  const activeChainId = connectedChainId || ARC_CHAIN_ID;
  const activeChain = useMemo(
    () => chains.find((chain) => chain.id === activeChainId) ?? arcTestnet,
    [activeChainId]
  );
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
  const lastWalletSourceRef = useRef<string | null>(null);
  const lastChainIdRef = useRef<number | null>(null);
  
  // Add data cache (increased cache time to 5 minutes)
  const dataCacheRef = useRef<{
    address: string | null;
    chainId: number | null;
    analytics: Analytics | null;
    transactions: Transaction[] | null;
    timestamp: number;
  }>({
    address: null,
    chainId: null,
    analytics: null,
    transactions: null,
    timestamp: 0
  });

  useEffect(() => {
    if (checkingWallet) {
      return;
    }

    const addressChanged = lastAddressRef.current !== activeAddress;
    const walletSourceChanged = lastWalletSourceRef.current !== walletSource;
    const chainChanged = lastChainIdRef.current !== activeChainId;

    lastAddressRef.current = activeAddress;
    lastWalletSourceRef.current = walletSource;
    lastChainIdRef.current = activeChainId;

    if (isFetchingRef.current) {
      return;
    }

    if (!addressChanged && !walletSourceChanged && !chainChanged) {
      return;
    }

    if (addressChanged || walletSourceChanged) {
      dataCacheRef.current = {
        address: null,
        chainId: null,
        analytics: null,
        transactions: null,
        timestamp: 0,
      };
    }

    if (activeAddress) {
      void fetchData();
    } else {
      setLoading(false);
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
  // eslint-disable-next-line react-hooks/exhaustive-deps -- Cache and reentrancy refs govern fetch scheduling; stabilizing fetchData requires refactoring its sibling data loaders.
  }, [checkingWallet, activeAddress, walletSource, activeChainId]);

  const zkSendFilter = useMemo(() => ({
    chainId: String(activeChainId),
    contractAddress: (getContractsForChain(activeChainId).zksend ?? '').toLowerCase(),
  }), [activeChainId]);

  const fetchZkSendData = async (queryAddress: string) => {
    if (!queryAddress || isFetchingRef.current) return;
    if (!zkSendFilter.contractAddress) {
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
      setLoading(false);
      return;
    }
    try {
      isFetchingRef.current = true;
      setLoading(true);
      const [sentRows, receivedRows] = await Promise.all([
        getZkSendPaymentsBySender(queryAddress, zkSendFilter),
        getZkSendPaymentsByRecipientWallet(queryAddress, zkSendFilter),
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
      const currencyCounts: Record<TransactionCurrency, number> = {
        USDC: 0,
        EURC: 0,
        USYC: 0,
        PATHUSD: 0,
        ALPHAUSD: 0,
        BETAUSD: 0,
        THETAUSD: 0,
      };
      allTxs.forEach((tx) => {
        const amount = parseFloat(tx.amount);
        const sym = tx.currency;
        if (currencyCounts[sym] !== undefined) currencyCounts[sym]++;
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
      const currencyOrder: Array<keyof typeof currencyCounts> = ['USDC', 'EURC', 'USYC', 'PATHUSD', 'ALPHAUSD', 'BETAUSD', 'THETAUSD'];
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
        address: queryAddress,
        chainId: activeChainId,
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

  const fetchSupabaseGiftCardHistory = async (queryAddress: string): Promise<GiftCardHistoryRow[]> => {
    const sentAmountUnit = getMyCardsDataSource() === 'graph' ? 'micro' : 'human';
    const [supabaseReceivedCards, supabaseSentCards] = await Promise.all([
      GiftCardsService.getCardsByRecipientForMyCards(queryAddress, activeChainId),
      GiftCardsService.getCardsBySenderForMyCards(queryAddress, activeChainId),
    ]);

    const receivedCards = supabaseReceivedCards.map((card) => ({
      tokenId: card.token_id,
      amount: formatTokenAmountString(card.amount, { unit: sentAmountUnit }),
      token: card.currency,
      recipient: card.recipient_address || queryAddress,
      sender: card.sender_address,
      message: card.message || '',
      redeemed: card.redeemed,
      type: 'received' as const,
      txHash: card.tx_hash || null,
      createdAt: card.created_at || null,
      recipient_type: card.recipient_type,
    }));

    const sentCards = supabaseSentCards.map((card) => ({
      tokenId: card.token_id,
      amount: formatTokenAmountString(card.amount, { unit: sentAmountUnit }),
      token: card.currency,
      recipient: card.recipient_username || card.recipient_address || 'Unknown',
      sender: card.sender_address,
      message: card.message || '',
      redeemed: card.redeemed,
      type: 'sent' as const,
      txHash: card.tx_hash || null,
      createdAt: card.created_at || null,
      recipient_type: card.recipient_type,
    }));

    return [...receivedCards, ...sentCards];
  };

  const applyGiftCardHistory = (allCards: GiftCardHistoryRow[]) => {
    let totalSent = 0;
    let totalReceived = 0;
    let totalRedeemed = 0;
    let cardsSent = 0;
    let cardsReceived = 0;
    const currencyCounts: Record<TransactionCurrency, number> = {
      USDC: 0,
      EURC: 0,
      USYC: 0,
      PATHUSD: 0,
      ALPHAUSD: 0,
      BETAUSD: 0,
      THETAUSD: 0,
    };

    allCards.forEach((card) => {
      const amount = parseFloat(card.amount);
      const symbol = String(card.token || '').toUpperCase() as keyof typeof currencyCounts;
      if (currencyCounts[symbol] !== undefined) currencyCounts[symbol]++;

      if (card.type === 'sent') {
        totalSent += amount;
        cardsSent++;
      } else {
        totalReceived += amount;
        cardsReceived++;
        if (card.redeemed) {
          totalRedeemed += amount;
        }
      }
    });

    const averageAmount =
      cardsSent + cardsReceived > 0
        ? ((totalSent + totalReceived) / (cardsSent + cardsReceived)).toFixed(2)
        : '0';
    const currencyOrder: Array<keyof typeof currencyCounts> = [
      'USDC', 'EURC', 'USYC', 'PATHUSD', 'ALPHAUSD', 'BETAUSD', 'THETAUSD',
    ];
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
      topCurrency,
    };

    const blockchainTransactions: Transaction[] = allCards.map((card) => {
      const txHashRaw = card.txHash;
      const txHash =
        txHashRaw && txHashRaw.length === 66 && txHashRaw.startsWith('0x') ? txHashRaw : null;
      const timestamp = card.createdAt
        ? new Date(card.createdAt).toISOString()
        : new Date().toISOString();

      return {
        id: `tx_${card.tokenId}_${card.type}`,
        type: card.type === 'sent' ? 'sent' : card.redeemed ? 'redeemed' : 'received',
        amount: card.amount,
        currency: card.token as Transaction['currency'],
        counterpart: card.type === 'sent' ? card.recipient : card.sender,
        message: card.message,
        status: card.redeemed ? 'redeemed' : 'completed',
        timestamp,
        txHash: txHash || '0x',
        gasUsed: '0.002',
        platform: card.type === 'sent' ? normalizePlatform(card.recipient_type) : undefined,
      };
    });

    return { newAnalytics, blockchainTransactions };
  };

  const fetchData = async () => {
    const queryAddress = activeAddress;
    if (!queryAddress || isFetchingRef.current) return;

    if (isZkHost()) {
      const cacheAge = Date.now() - dataCacheRef.current.timestamp;
      const cachedAnalytics = dataCacheRef.current.analytics;
      const cachedTransactions = dataCacheRef.current.transactions;
      const cacheValid =
        cacheAge < 300000 &&
        dataCacheRef.current.address === queryAddress &&
        dataCacheRef.current.chainId === activeChainId &&
        cachedAnalytics != null &&
        cachedTransactions != null;
      if (cacheValid) {
        setAnalytics(cachedAnalytics);
        setTransactions(cachedTransactions);
        setLoading(false);
        return;
      }
      await fetchZkSendData(queryAddress);
      return;
    }

    const cacheAge = Date.now() - dataCacheRef.current.timestamp;
    const cacheValid =
      cacheAge < 300000 &&
      dataCacheRef.current.address === queryAddress &&
      dataCacheRef.current.chainId === activeChainId;

    const cachedAnalytics = dataCacheRef.current.analytics;
    const cachedTransactions = dataCacheRef.current.transactions;
    if (cacheValid && cachedAnalytics != null && cachedTransactions != null) {
      setAnalytics(cachedAnalytics);
      setTransactions(cachedTransactions);
      setLoading(false);
      return;
    }

    const useWeb3Path = walletSource === 'external' && hasExternalWallet;

    try {
      isFetchingRef.current = true;
      setLoading(true);

      let allCards: GiftCardHistoryRow[];

      if (useWeb3Path) {
        console.log('Fetching transaction history for:', queryAddress);

        const walletClient = createWalletClient({
          chain: activeChain,
          transport: custom(window.ethereum),
        });

        await web3Service.initialize(walletClient, queryAddress, activeChainId);

        const receivedCardsData = await web3Service.loadGiftCards(false, true);
        const supabaseReceivedCards = await GiftCardsService.getCardsByRecipientForMyCards(
          queryAddress,
          activeChainId,
        );
        const supabaseReceivedMap = new Map(
          supabaseReceivedCards.map((card) => [card.token_id, card]),
        );

        const receivedCards = receivedCardsData.map((card) => {
          const supa = supabaseReceivedMap.get(card.tokenId);
          return {
            tokenId: card.tokenId,
            amount: formatTokenAmountString(card.amount, { unit: 'human' }),
            token: card.token,
            recipient: card.recipient,
            sender: card.sender,
            message: card.message,
            redeemed: card.redeemed,
            type: 'received' as const,
            txHash: supa?.tx_hash || (card as { txHash?: string }).txHash || null,
            createdAt: supa?.created_at || null,
            recipient_type: supa?.recipient_type,
          };
        });

        const supabaseSentCards = await GiftCardsService.getCardsBySenderForMyCards(
          queryAddress,
          activeChainId,
        );
        const sentAmountUnit = getMyCardsDataSource() === 'graph' ? 'micro' : 'human';
        const sentCards = supabaseSentCards.map((card) => ({
          tokenId: card.token_id,
          amount: formatTokenAmountString(card.amount, { unit: sentAmountUnit }),
          token: card.currency,
          recipient: card.recipient_username || card.recipient_address || 'Unknown',
          sender: card.sender_address,
          message: card.message || '',
          redeemed: card.redeemed,
          type: 'sent' as const,
          txHash: card.tx_hash || null,
          createdAt: card.created_at || null,
          recipient_type: card.recipient_type,
        }));

        allCards = [...receivedCards, ...sentCards];
      } else {
        console.log('Fetching Supabase transaction history for:', queryAddress);
        allCards = await fetchSupabaseGiftCardHistory(queryAddress);
      }

      const { newAnalytics, blockchainTransactions } = applyGiftCardHistory(allCards);
      setAnalytics(newAnalytics);
      setTransactions(blockchainTransactions);

      dataCacheRef.current = {
        address: queryAddress,
        chainId: activeChainId,
        analytics: newAnalytics,
        transactions: blockchainTransactions,
        timestamp: Date.now(),
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

  if (hasSocialIdentity && !hasInternalWallet && !hasExternalWallet && !checkingWallet) {
    return (
      <div className="p-6">
        <Empty className="flex-none gap-4 md:p-6">
          <EmptyHeader>
            <HistoryCircleIcon size={40} className="mb-2 text-foreground opacity-70" strokeWidth={1.75} />
            <EmptyTitle>Create Internal Wallet</EmptyTitle>
            <EmptyDescription>
              Your social account is connected. Create an Internal Wallet on Dashboard to view transaction history.
            </EmptyDescription>
          </EmptyHeader>
          <Button asChild className="mt-4">
            <Link to="/dashboard">Go to Dashboard</Link>
          </Button>
        </Empty>
      </div>
    );
  }

  if (!activeAddress) {
    return (
      <div className="p-6">
        <Empty className="flex-none gap-4 md:p-6">
          <EmptyHeader>
            <HistoryCircleIcon size={40} className="mb-2 text-foreground opacity-70" strokeWidth={1.75} />
            <EmptyTitle>Connect your wallet</EmptyTitle>
            <EmptyDescription>
              Please connect your wallet or social account to view transaction history
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
        chainId: null,
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
              className="block w-full pl-10 pr-3 py-2.5 border-none rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-primary/50 text-sm transition-[box-shadow,background-color] duration-200 ease-[var(--ease-out)]"
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
                className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-[background-color,color,box-shadow] duration-200 ease-[var(--ease-out)] active:scale-[0.97] motion-reduce:active:scale-100 ${
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
          {showWalletToggle ? (
            <WalletSourceToggle
              value={walletSource}
              onChange={setWalletSource}
              hasCircleWallet={hasInternalWallet}
            />
          ) : null}
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
            <AnalyticsAmount value={analytics.totalSent} className="text-lg font-bold text-red-600 dark:text-red-400" />
            <p className="text-xs text-slate-500 dark:text-slate-400">{analytics.cardsSent} payments</p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Received</span>
              <ArrowDownLeft className="h-3.5 w-3.5 text-blue-500" />
            </div>
            <AnalyticsAmount value={analytics.totalReceived} className="text-lg font-bold text-blue-600 dark:text-blue-400" />
            <p className="text-xs text-slate-500 dark:text-slate-400">{analytics.cardsReceived} payments</p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 relative -top-[5px]">Avg</span>
              <div className="flex rounded-lg bg-slate-200/80 dark:bg-slate-700/80 p-0.5 relative -top-[5px]">
                <button
                  type="button"
                  onClick={() => setAvgMode('sent')}
                  className={`px-2 py-0.5 rounded-md text-xs font-medium transition-[background-color,color,box-shadow] duration-200 ease-[var(--ease-out)] active:scale-[0.97] motion-reduce:active:scale-100 ${
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
                  className={`px-2 py-0.5 rounded-md text-xs font-medium transition-[background-color,color,box-shadow] duration-200 ease-[var(--ease-out)] active:scale-[0.97] motion-reduce:active:scale-100 ${
                    avgMode === 'received'
                      ? 'bg-white dark:bg-slate-600 text-green-600 dark:text-green-400 shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  Received
                </button>
              </div>
            </div>
            <AnalyticsAmount
              value={
                avgMode === 'sent'
                  ? (analytics.cardsSent > 0
                      ? formatDisplayAmount(parseFloat(analytics.totalSent) / analytics.cardsSent)
                      : '0.00')
                  : (analytics.cardsReceived > 0
                      ? formatDisplayAmount(parseFloat(analytics.totalReceived) / analytics.cardsReceived)
                      : '0.00')
              }
              className={`text-lg font-bold relative -top-[14px] ${avgMode === 'sent' ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 relative -top-[14px]">
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
              <AnalyticsAmount value={analytics.totalSent} className="text-2xl font-bold text-red-600" />
              <p className="text-xs text-muted-foreground">{analytics.cardsSent} payments sent</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Received</CardTitle>
              <ArrowDownLeft className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <AnalyticsAmount value={analytics.totalReceived} className="text-2xl font-bold text-green-600" />
              <p className="text-xs text-muted-foreground">{analytics.cardsReceived} payments received</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Redeemed</CardTitle>
              <Gift className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <AnalyticsAmount value={analytics.totalRedeemed} className="text-2xl font-bold text-blue-600" />
              <p className="text-xs text-muted-foreground">claimed</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Amount</CardTitle>
              <TrendingUp className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <AnalyticsAmount value={analytics.averageAmount} className="text-2xl font-bold text-purple-600" />
              <p className="text-xs text-muted-foreground">Per payment</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 items-center">
          {showWalletToggle ? (
            <WalletSourceToggle
              value={walletSource}
              onChange={setWalletSource}
              hasCircleWallet={hasInternalWallet}
            />
          ) : null}
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
                        title={`View on Explorer: ${tx.txHash}`}
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

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Trophy, RefreshCw, Users, Copy, CheckCircle2, Search, Twitter, Zap, Wallet, TrendingUp, Twitch, Send } from 'lucide-react';
import { CardHeader, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Skeleton } from './ui/skeleton';
import { Alert, AlertDescription } from './ui/alert';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from './ui/empty';
import { Progress } from './ui/progress';
import { Input } from './ui/input';
import { Separator } from './ui/separator';
import { ScrollArea } from './ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
} from './ui/pagination';
import { getLeaderboardSendersGraph, syncLeaderboardGraph, updateZnsDomainsGraph, LeaderboardEntry } from '../utils/leaderboard';
import { useAccount } from 'wagmi';
import { toast } from 'sonner';
import { getContractBalance, getContractTransactionsCount } from '../utils/web3/contractBalance';
import { CONTRACT_ADDRESS, ZKSEND_CONTRACT_ADDRESS } from '../utils/web3/constants';
import { isZkHost } from '../utils/runtime/zkHost';
import { getZkSendLeaderboardEntriesFromStats } from '../utils/supabase/zksendPayments';

const ITEMS_PER_PAGE = 30;

const formatAddress = (value?: string | null) => {
  if (!value) {
    return 'Unknown';
  }
  if (value.length <= 12) {
    return value;
  }
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
};

// USDC and EURC have 6 decimals, so divide by 1,000,000 to get the actual amount
const TOKEN_DECIMALS_DIVISOR = 1_000_000;

const formatCurrencySummary = (map: Record<string, number>) => {
  const parts = Object.entries(map)
    .filter(([, amount]) => amount > 0)
    .sort(([, a], [, b]) => b - a)
    .map(([currency, amount]) => {
      // Divide by 1,000,000 to convert from smallest units to actual amount
      const actualAmount = amount / TOKEN_DECIMALS_DIVISOR;
      return `${currency} ${actualAmount.toFixed(2)}`;
    });

  return parts.length ? parts.join(' • ') : '0';
};

// Generate avatar URL from address (using a simple hash-based approach)
const getAvatarUrl = (address: string) => {
  // In production, use @dicebear/core or similar library
  // For now, using a placeholder service
  const seed = address.toLowerCase().slice(2, 10);
  return `https://api.dicebear.com/7.x/identicon/svg?seed=${seed}&radius=50&size=40`;
};

// Medal component for top 3
// const TopThreeMedal = ({ rank }: { rank: number }) => {
//   if (rank > 3) return null;
//   
//   const medals = {
//     1: { emoji: '🥇', gradient: 'from-yellow-400 via-yellow-300 to-yellow-200', glow: 'shadow-yellow-200/50' },
//     2: { emoji: '🥈', gradient: 'from-gray-300 via-gray-200 to-gray-100', glow: 'shadow-gray-200/50' },
//     3: { emoji: '🥉', gradient: 'from-amber-400 via-amber-300 to-amber-200', glow: 'shadow-amber-200/50' },
//   };
//   
//   const medal = medals[rank as keyof typeof medals];
//   
//   return (
//     <div className={`relative bg-gradient-to-br ${medal.gradient} rounded-full w-10 h-10 flex items-center justify-center text-xl ${medal.glow} shadow-lg`}>
//       <span>{medal.emoji}</span>
//     </div>
//   );
// };
{/* 
// Achievement badges component
const AchievementBadges = ({ cardsSent, rank }: { cardsSent: number; rank: number }) => {
  const badges = [];
  
  if (cardsSent >= 100) {
    badges.push(
      <Badge key="power" variant="default" className="bg-purple-100 text-purple-700 border-purple-200 text-xs">
        💎 Power User
      </Badge>
    );
  }
  if (rank < 10) {
    badges.push(
      <Badge key="top10" variant="default" className="bg-yellow-100 text-yellow-700 border-yellow-200 text-xs">
        ⭐ Top 10
      </Badge>
    );
  }
  if (cardsSent >= 50) {
    badges.push(
      <Badge key="active" variant="default" className="bg-blue-100 text-blue-700 border-blue-200 text-xs">
        🚀 Active Sender
      </Badge>
    );
  }
  
  return badges.length > 0 ? <div className="flex flex-wrap gap-1 mt-1">{badges}</div> : null;
};
*/}
export function Leaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasFetchedOnce, setHasFetchedOnce] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'cards' | 'amount' | 'date'>('cards');
  const [filterType, setFilterType] = useState<'all' | 'address' | 'twitter' | 'telegram' | 'twitch' | 'zns'>('all');
  const [metricView, setMetricView] = useState<'total' | 'twitter' | 'twitch' | 'telegram' | 'gas' | 'tvl'>('total');
  const [contractTvl, setContractTvl] = useState<number | null>(null);
  const [tvlLoading, setTvlLoading] = useState(false);
  const [contractTransactionsCount, setContractTransactionsCount] = useState<number | null>(null);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const { address } = useAccount();
  const normalizedAccount = address?.toLowerCase() ?? null;

  const terminology = useMemo(() => {
    const isZk = isZkHost();
    return {
      itemSingular: isZk ? 'payment' : 'card',
      itemPlural: isZk ? 'payments' : 'cards',
      itemCapitalized: isZk ? 'Payments' : 'Cards',
      itemSent: isZk ? 'payments sent' : 'cards sent',
      itemSentCapitalized: isZk ? 'Payments sent' : 'Cards sent',
    };
  }, []);

  const zkSendFilter = useMemo(
    () => ({
      chainId: String(import.meta.env.VITE_ARC_CHAIN_ID ?? 5042002),
      contractAddress: (ZKSEND_CONTRACT_ADDRESS ?? '').toLowerCase(),
    }),
    []
  );

  const loadEntries = useCallback(
    async (options?: { preserveData?: boolean; recalculate?: boolean }) => {
      const preserveData = options?.preserveData ?? false;

      if (preserveData) {
        setIsRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const data = isZkHost()
          ? await getZkSendLeaderboardEntriesFromStats(zkSendFilter)
          : await getLeaderboardSendersGraph({ limit: 100000 });
        const source = isZkHost() ? 'zksend_leaderboard_stats' : 'leaderboard_stats_graph_true';
        console.log(`[Leaderboard] Loaded ${data.length} entries from ${source}`);

        if (!Array.isArray(data)) {
          throw new Error('Invalid data format: expected array');
        }

        setEntries(data);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch leaderboard', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to load data';
        setError(errorMessage);
        setEntries([]);
      } finally {
        if (preserveData) {
          setIsRefreshing(false);
        } else {
          setLoading(false);
        }
      }
    },
    [zkSendFilter]
  );

  useEffect(() => {
    if (!hasFetchedOnce) {
      loadEntries({ preserveData: false });
      setHasFetchedOnce(true);
    }
  }, [hasFetchedOnce, loadEntries]);

  // Calculate global ranks based on full entries list (before filtering)
  // Ranks are calculated based on current sortBy to maintain consistency
  const globalRanksMap = useMemo(() => {
    if (!entries.length) return new Map<string, number>();
    
    // Aggregate entries by senderAddress (sum all platforms for the same address)
    const aggregatedMap = new Map<string, LeaderboardEntry>();
    
    for (const entry of entries) {
      const addressKey = entry.senderAddress?.toLowerCase() || '';
      if (!addressKey) continue;
      
      const existing = aggregatedMap.get(addressKey);
      
      if (!existing) {
        // First entry for this address - use it as base
        aggregatedMap.set(addressKey, { ...entry });
      } else {
        // Merge with existing entry
        // Sum cards
        existing.cardsSentTotal += entry.cardsSentTotal;
        
        // Sum amounts by currency
        for (const [currency, amount] of Object.entries(entry.amountSentByCurrency || {})) {
          existing.amountSentByCurrency[currency] = (existing.amountSentByCurrency[currency] || 0) + amount;
        }
        
        // Sum total amount
        existing.amountSentTotal += entry.amountSentTotal;
        
        // Take latest lastSentAt
        const existingDate = existing.lastSentAt ? new Date(existing.lastSentAt).getTime() : 0;
        const entryDate = entry.lastSentAt ? new Date(entry.lastSentAt).getTime() : 0;
        if (entryDate > existingDate) {
          existing.lastSentAt = entry.lastSentAt;
          existing.lastRecipient = entry.lastRecipient || existing.lastRecipient;
        }
        
        // Prefer non-null values for display fields
        if (!existing.displayName && entry.displayName) {
          existing.displayName = entry.displayName;
        }
        if (!existing.avatarUrl && entry.avatarUrl) {
          existing.avatarUrl = entry.avatarUrl;
        }
        if (!existing.znsDomain && entry.znsDomain) {
          existing.znsDomain = entry.znsDomain;
        }
      }
    }
    
    // Convert map back to array and sort based on current sortBy
    const aggregated = Array.from(aggregatedMap.values());
    aggregated.sort((a, b) => {
      switch (sortBy) {
        case 'cards':
          return b.cardsSentTotal - a.cardsSentTotal;
        case 'amount':
          // Divide by 1,000,000 for 6 decimals when comparing amounts
          const aTotal = Object.values(a.amountSentByCurrency).reduce((sum, val) => sum + val, 0) / TOKEN_DECIMALS_DIVISOR;
          const bTotal = Object.values(b.amountSentByCurrency).reduce((sum, val) => sum + val, 0) / TOKEN_DECIMALS_DIVISOR;
          return bTotal - aTotal;
        case 'date':
          return new Date(b.lastSentAt || 0).getTime() - new Date(a.lastSentAt || 0).getTime();
        default:
          return 0;
      }
    });
    
    // Create map of address -> global rank
    const ranksMap = new Map<string, number>();
    aggregated.forEach((entry, index) => {
      const addressKey = entry.senderAddress?.toLowerCase() || '';
      if (addressKey) {
        ranksMap.set(addressKey, index + 1);
      }
    });
    
    return ranksMap;
  }, [entries, sortBy]);

  // Filter and sort entries
  const filteredAndSortedEntries = useMemo(() => {
    let filtered = [...entries];
    
    // Platform filter
    if (filterType !== 'all' && filterType !== 'zns') {
      const platformMap: Record<string, string> = {
        'address': 'address',
        'twitter': 'twitter',
        'telegram': 'telegram',
        'twitch': 'twitch',
      };
      const targetPlatform = platformMap[filterType];
      if (targetPlatform) {
        filtered = filtered.filter(entry => 
          entry.socialPlatform?.toLowerCase() === targetPlatform.toLowerCase()
        );
      }
    }
    
    // ZNS domains filter
    if (filterType === 'zns') {
      filtered = filtered.filter(entry => entry.znsDomain && entry.znsDomain.trim() !== '');
    }
    
    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(entry => 
        entry.senderAddress?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.znsDomain?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.displayName?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Aggregate entries by senderAddress (sum all platforms for the same address)
    const aggregatedMap = new Map<string, LeaderboardEntry>();
    
    for (const entry of filtered) {
      const addressKey = entry.senderAddress?.toLowerCase() || '';
      if (!addressKey) continue;
      
      const existing = aggregatedMap.get(addressKey);
      
      if (!existing) {
        // First entry for this address - use it as base
        aggregatedMap.set(addressKey, { ...entry });
      } else {
        // Merge with existing entry
        // Sum cards
        existing.cardsSentTotal += entry.cardsSentTotal;
        
        // Sum amounts by currency
        for (const [currency, amount] of Object.entries(entry.amountSentByCurrency || {})) {
          existing.amountSentByCurrency[currency] = (existing.amountSentByCurrency[currency] || 0) + amount;
        }
        
        // Sum total amount
        existing.amountSentTotal += entry.amountSentTotal;
        
        // Take latest lastSentAt
        const existingDate = existing.lastSentAt ? new Date(existing.lastSentAt).getTime() : 0;
        const entryDate = entry.lastSentAt ? new Date(entry.lastSentAt).getTime() : 0;
        if (entryDate > existingDate) {
          existing.lastSentAt = entry.lastSentAt;
          existing.lastRecipient = entry.lastRecipient || existing.lastRecipient;
        }
        
        // Prefer non-null values for display fields
        if (!existing.displayName && entry.displayName) {
          existing.displayName = entry.displayName;
        }
        if (!existing.avatarUrl && entry.avatarUrl) {
          existing.avatarUrl = entry.avatarUrl;
        }
        if (!existing.znsDomain && entry.znsDomain) {
          existing.znsDomain = entry.znsDomain;
        }
        
        // Keep the first socialPlatform or combine them (optional)
        // For now, we'll keep the first one, but you could change this to show "multiple" or combine
        if (existing.socialPlatform !== entry.socialPlatform) {
          // If different platforms, we could set to 'multiple' or keep first
          // existing.socialPlatform = 'multiple';
        }
      }
    }
    
    // Convert map back to array
    filtered = Array.from(aggregatedMap.values());
    
    // Sort
    // For ZNS filter, always sort by cards sent
    const effectiveSortBy = filterType === 'zns' ? 'cards' : sortBy;
    filtered.sort((a, b) => {
      switch (effectiveSortBy) {
        case 'cards':
          return b.cardsSentTotal - a.cardsSentTotal;
        case 'amount':
          // Divide by 1,000,000 for 6 decimals when comparing amounts
          const aTotal = Object.values(a.amountSentByCurrency).reduce((sum, val) => sum + val, 0) / TOKEN_DECIMALS_DIVISOR;
          const bTotal = Object.values(b.amountSentByCurrency).reduce((sum, val) => sum + val, 0) / TOKEN_DECIMALS_DIVISOR;
          return bTotal - aTotal;
        case 'date':
          return new Date(b.lastSentAt || 0).getTime() - new Date(a.lastSentAt || 0).getTime();
        default:
          return 0;
      }
    });
    
    return filtered;
  }, [entries, sortBy, searchQuery, filterType]);

  // Calculate pagination
  const totalPages = useMemo(() => Math.ceil(filteredAndSortedEntries.length / ITEMS_PER_PAGE), [filteredAndSortedEntries.length]);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const displayedEntries = useMemo(() => filteredAndSortedEntries.slice(startIndex, endIndex), [filteredAndSortedEntries, startIndex, endIndex]);

  // Calculate pagination pages to display
  const paginationPages = useMemo(() => {
    const pages: (number | 'ellipsis')[] = [];
    const showEllipsis = totalPages > 7;
    
    if (!showEllipsis) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      
      if (currentPage <= 4) {
        for (let i = 2; i <= 5; i++) {
          pages.push(i);
        }
        pages.push('ellipsis');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 3) {
        pages.push('ellipsis');
        for (let i = totalPages - 4; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push('ellipsis');
        pages.push(currentPage - 1);
        pages.push(currentPage);
        pages.push(currentPage + 1);
        pages.push('ellipsis');
        pages.push(totalPages);
      }
    }
    
    return pages;
  }, [totalPages, currentPage]);

  // Calculate statistics
  const totalAddresses = useMemo(() => {
    // Get unique addresses
    const uniqueAddresses = new Set(entries.map(e => e.senderAddress?.toLowerCase()).filter(Boolean));
    return uniqueAddresses.size;
  }, [entries]);
  
  const totalCards = useMemo(
    () => entries.reduce((sum, entry) => sum + entry.cardsSentTotal, 0),
    [entries]
  );

  // Calculate Twitter cards
  const twitterCards = useMemo(() => {
    return entries
      .filter(entry => entry.socialPlatform?.toLowerCase() === 'twitter')
      .reduce((sum, entry) => sum + entry.cardsSentTotal, 0);
  }, [entries]);

  // Calculate Twitter addresses (unique addresses that sent cards via Twitter)
  const twitterAddresses = useMemo(() => {
    const twitterEntries = entries.filter(entry => entry.socialPlatform?.toLowerCase() === 'twitter');
    const uniqueAddresses = new Set(twitterEntries.map(e => e.senderAddress?.toLowerCase()).filter(Boolean));
    return uniqueAddresses.size;
  }, [entries]);

  // Calculate Twitch cards
  const twitchCards = useMemo(() => {
    return entries
      .filter(entry => entry.socialPlatform?.toLowerCase() === 'twitch')
      .reduce((sum, entry) => sum + entry.cardsSentTotal, 0);
  }, [entries]);

  // Calculate Twitch addresses (unique addresses that sent cards via Twitch)
  const twitchAddresses = useMemo(() => {
    const twitchEntries = entries.filter(entry => entry.socialPlatform?.toLowerCase() === 'twitch');
    const uniqueAddresses = new Set(twitchEntries.map(e => e.senderAddress?.toLowerCase()).filter(Boolean));
    return uniqueAddresses.size;
  }, [entries]);

  // Calculate Telegram cards
  const telegramCards = useMemo(() => {
    return entries
      .filter(entry => entry.socialPlatform?.toLowerCase() === 'telegram')
      .reduce((sum, entry) => sum + entry.cardsSentTotal, 0);
  }, [entries]);

  // Calculate Telegram addresses (unique addresses that sent cards via Telegram)
  const telegramAddresses = useMemo(() => {
    const telegramEntries = entries.filter(entry => entry.socialPlatform?.toLowerCase() === 'telegram');
    const uniqueAddresses = new Set(telegramEntries.map(e => e.senderAddress?.toLowerCase()).filter(Boolean));
    return uniqueAddresses.size;
  }, [entries]);

  // Calculate Gas Spent: transactions_count * 0.05
  const gasSpent = useMemo(() => {
    // Use contract transactions count if available, otherwise fallback to totalCards
    const transactionsCount = contractTransactionsCount !== null 
      ? contractTransactionsCount 
      : totalCards;
    return transactionsCount * 0.05;
  }, [contractTransactionsCount, totalCards]);

  // Calculate TVL (Total Value Locked) - use contract balance if available, otherwise calculate from entries
  const tvl = useMemo(() => {
    // If we have contract balance from API, use it (more accurate)
    if (contractTvl !== null) {
      return contractTvl;
    }
    // Fallback: Sum all amounts sent (in smallest units, so divide by 1,000,000 for 6 decimals)
    return entries.reduce((sum, entry) => {
      const entryTvl = Object.values(entry.amountSentByCurrency || {}).reduce(
        (currencySum, amount) => currencySum + amount,
        0
      ) / TOKEN_DECIMALS_DIVISOR;
      return sum + entryTvl;
    }, 0);
  }, [entries, contractTvl]);

  // Get leader's value for progress calculation (cards or USDC amount)
  const leaderValue = useMemo(() => {
    if (filteredAndSortedEntries.length === 0) return 1;
    const leader = filteredAndSortedEntries[0];
    if (sortBy === 'amount') {
      // For amount sorting, use USDC total (divide by 1,000,000 for 6 decimals)
      const usdcAmount = (leader?.amountSentByCurrency?.['USDC'] || 0) / TOKEN_DECIMALS_DIVISOR;
      return usdcAmount > 0 ? usdcAmount : 1;
    }
    // For cards sorting, use card count
    return leader?.cardsSentTotal || 1;
  }, [filteredAndSortedEntries, sortBy]);

  // Load contract balance for TVL
  useEffect(() => {
    const loadContractBalance = async () => {
      // Only load if viewing TVL metric and balance is not yet loaded
      if (metricView === 'tvl' && contractTvl === null) {
        setTvlLoading(true);
        try {
          console.log('[Leaderboard] Loading contract balance for TVL...');
          const balance = await getContractBalance(CONTRACT_ADDRESS);
          console.log(`[Leaderboard] Contract balance loaded: ${balance} USDC`);
          setContractTvl(balance);
        } catch (error) {
          console.error('[Leaderboard] Failed to load contract balance:', error);
          // Don't show error toast, just use calculated TVL as fallback
        } finally {
          setTvlLoading(false);
        }
      }
    };

    loadContractBalance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metricView]);

  // Load contract transactions count (loads on mount)
  useEffect(() => {
    const loadContractTransactions = async () => {
      // Load if count is not yet loaded
      if (contractTransactionsCount === null) {
        setTransactionsLoading(true);
        try {
          console.log('[Leaderboard] Loading contract transactions count from /counters endpoint...');
          const count = await getContractTransactionsCount(CONTRACT_ADDRESS);
          console.log(`[Leaderboard] Contract transactions count loaded: ${count}`);
          setContractTransactionsCount(count);
        } catch (error) {
          console.error('[Leaderboard] Failed to load contract transactions count:', error);
          // Don't show error toast, just use totalCards as fallback
        } finally {
          setTransactionsLoading(false);
        }
      }
    };

    loadContractTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      if (!isZkHost()) {
        // Sync leaderboard_stats_graph_true from gift_cards_graph
        console.log('[Leaderboard] Syncing leaderboard_stats_graph_true...');
        const syncResult = await syncLeaderboardGraph();
        if (syncResult.success) {
          console.log(`[Leaderboard] Synced ${syncResult.entries_count || 0} entries`);
        } else {
          console.error('[Leaderboard] Sync failed:', syncResult.message);
        }

        // Update ZNS domains for leaderboard_stats_graph_true
        console.log('[Leaderboard] Starting ZNS domains update...');
        try {
          const znsResult = await updateZnsDomainsGraph();
          console.log('[Leaderboard] ZNS update result:', znsResult);
          if (znsResult.success) {
            console.log(`[Leaderboard] Updated ZNS domains: ${znsResult.records_updated || 0} records`);
            if (znsResult.records_updated && znsResult.records_updated > 0) {
              toast.success(`Updated ${znsResult.records_updated} ZNS domains`);
            } else {
              console.log('[Leaderboard] No ZNS domains found or updated');
            }
          } else {
            console.error('[Leaderboard] ZNS update failed:', znsResult.message);
            toast.error(`ZNS update failed: ${znsResult.message || 'Unknown error'}`);
          }
        } catch (znsError) {
          console.error('[Leaderboard] Exception during ZNS update:', znsError);
          toast.error(`ZNS update error: ${znsError instanceof Error ? znsError.message : 'Unknown error'}`);
        }

        // Refresh contract balance for TVL and transactions count for Gas view
        try {
          const balance = await getContractBalance(CONTRACT_ADDRESS);
          setContractTvl(balance);
        } catch (error) {
          console.error('[Leaderboard] Failed to refresh contract balance:', error);
        }
        try {
          const count = await getContractTransactionsCount(CONTRACT_ADDRESS);
          setContractTransactionsCount(count);
        } catch (error) {
          console.error('[Leaderboard] Failed to refresh contract transactions count:', error);
        }
      }

      await loadEntries({ preserveData: true, recalculate: false });
    } catch (error) {
      console.error('[Leaderboard] Failed to refresh leaderboard:', error);
      toast.error('Failed to refresh leaderboard');
      await loadEntries({ preserveData: true, recalculate: false });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleCopyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    toast.success('Address copied to clipboard');
  };

  return (
    <>
      <CardHeader className="border-b border-gray-100">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[20px] leading-[22px] font-bold text-[#0f172a] flex items-center gap-2">
              Sender Leaderboard
            </h2>
            <Button
              onClick={handleRefresh}
              disabled={loading || isRefreshing}
              className="rounded-full bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] text-white hover:opacity-90 disabled:opacity-50 h-10 w-10 p-0"
            >
              <RefreshCw
                className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`}
              />
            </Button>
          </div>
          
          {/* Metric view selector - buttons */}
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={metricView === 'total' ? 'default' : 'outline'}
              onClick={() => setMetricView('total')}
              className={`transition-all duration-200 ${
                metricView === 'total'
                  ? 'bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] text-white border-transparent shadow-md'
                  : 'bg-white hover:bg-gray-50'
              }`}
            >
              Total
            </Button>
            <Button
              variant={metricView === 'twitter' ? 'default' : 'outline'}
              onClick={() => setMetricView('twitter')}
              className={`transition-all duration-200 ${
                metricView === 'twitter'
                  ? 'bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] text-white border-transparent shadow-md'
                  : 'bg-white hover:bg-gray-50'
              }`}
            >
              <Twitter className="h-4 w-4 mr-2" />
              Twitter
            </Button>
            <Button
              variant={metricView === 'twitch' ? 'default' : 'outline'}
              onClick={() => setMetricView('twitch')}
              className={`transition-all duration-200 ${
                metricView === 'twitch'
                  ? 'bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] text-white border-transparent shadow-md'
                  : 'bg-white hover:bg-gray-50'
              }`}
            >
              <Twitch className="h-4 w-4 mr-2" />
              Twitch
            </Button>
            <Button
              variant={metricView === 'telegram' ? 'default' : 'outline'}
              onClick={() => setMetricView('telegram')}
              className={`transition-all duration-200 ${
                metricView === 'telegram'
                  ? 'bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] text-white border-transparent shadow-md'
                  : 'bg-white hover:bg-gray-50'
              }`}
            >
              <Send className="h-4 w-4 mr-2" />
              Telegram
            </Button>
            <Button
              variant={metricView === 'gas' ? 'default' : 'outline'}
              onClick={() => setMetricView('gas')}
              className={`transition-all duration-200 ${
                metricView === 'gas'
                  ? 'bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] text-white border-transparent shadow-md'
                  : 'bg-white hover:bg-gray-50'
              }`}
            >
              <Zap className="h-4 w-4 mr-2" />
              Gas
            </Button>
            <Button
              variant={metricView === 'tvl' ? 'default' : 'outline'}
              onClick={() => setMetricView('tvl')}
              className={`transition-all duration-200 ${
                metricView === 'tvl'
                  ? 'bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] text-white border-transparent shadow-md'
                  : 'bg-white hover:bg-gray-50'
              }`}
            >
              <Wallet className="h-4 w-4 mr-2" />
              TVL
            </Button>
          </div>

          {/* Statistics cards - dynamic based on metric view with smooth transition */}
          <div className="relative min-h-[60px] overflow-hidden">
            <div 
              key={metricView}
              className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in-0 slide-in-from-bottom-4 duration-500"
            >
            {metricView === 'total' && (
              <>
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100 transition-all duration-300 hover:shadow-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="h-5 w-5 text-blue-600" />
                    <span className="text-sm font-medium text-gray-600">Total Addresses</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-blue-700">{totalAddresses}</span>
                    <span className="text-sm text-gray-500">addresses</span>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-100 transition-all duration-300 hover:shadow-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Trophy className="h-5 w-5 text-purple-600" />
                    <span className="text-sm font-medium text-gray-600">Total {terminology.itemCapitalized}</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-purple-700">{totalCards}</span>
                    <span className="text-sm text-gray-500">{terminology.itemSent}</span>
                  </div>
                </div>
              </>
            )}
            
            {metricView === 'twitter' && (
              <>
                <div className="bg-gradient-to-br from-sky-50 to-blue-50 rounded-xl p-4 border border-sky-100 transition-all duration-300 hover:shadow-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Twitter className="h-5 w-5 text-sky-600" />
                    <span className="text-sm font-medium text-gray-600">Twitter {terminology.itemCapitalized}</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-sky-700">{twitterCards}</span>
                    <span className="text-sm text-gray-500">{terminology.itemSent}</span>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100 transition-all duration-300 hover:shadow-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="h-5 w-5 text-blue-600" />
                    <span className="text-sm font-medium text-gray-600">Twitter Addresses</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-blue-700">{twitterAddresses}</span>
                    <span className="text-sm text-gray-500">addresses</span>
                  </div>
                </div>
              </>
            )}
            
            {metricView === 'twitch' && (
              <>
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-100 transition-all duration-300 hover:shadow-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Twitch className="h-5 w-5 text-purple-600" />
                    <span className="text-sm font-medium text-gray-600">Twitch {terminology.itemCapitalized}</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-purple-700">{twitchCards}</span>
                    <span className="text-sm text-gray-500">{terminology.itemSent}</span>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-pink-50 to-rose-50 rounded-xl p-4 border border-pink-100 transition-all duration-300 hover:shadow-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="h-5 w-5 text-pink-600" />
                    <span className="text-sm font-medium text-gray-600">Twitch Addresses</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-pink-700">{twitchAddresses}</span>
                    <span className="text-sm text-gray-500">addresses</span>
                  </div>
                </div>
              </>
            )}
            
            {metricView === 'telegram' && (
              <>
                <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-xl p-4 border border-cyan-100 transition-all duration-300 hover:shadow-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Send className="h-5 w-5 text-cyan-600" />
                    <span className="text-sm font-medium text-gray-600">Telegram {terminology.itemCapitalized}</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-cyan-700">{telegramCards}</span>
                    <span className="text-sm text-gray-500">{terminology.itemSent}</span>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4 border border-blue-100 transition-all duration-300 hover:shadow-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="h-5 w-5 text-blue-600" />
                    <span className="text-sm font-medium text-gray-600">Telegram Addresses</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-blue-700">{telegramAddresses}</span>
                    <span className="text-sm text-gray-500">addresses</span>
                  </div>
                </div>
              </>
            )}
            
            {metricView === 'gas' && (
              <>
                <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-4 border border-orange-100 transition-all duration-300 hover:shadow-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="h-5 w-5 text-orange-600" />
                    <span className="text-sm font-medium text-gray-600">Gas Spent</span>
                    {transactionsLoading && (
                      <RefreshCw className="h-3 w-3 text-orange-600 animate-spin" />
                    )}
                  </div>
                  <div className="flex items-baseline gap-2">
                    {transactionsLoading && contractTransactionsCount === null ? (
                      <Skeleton className="h-9 w-32" />
                    ) : (
                      <>
                        <span className="text-3xl font-bold text-orange-700">{gasSpent.toFixed(3)}</span>
                        <span className="text-sm text-gray-500">USDC</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl p-4 border border-amber-100 transition-all duration-300 hover:shadow-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-5 w-5 text-amber-600" />
                    <span className="text-sm font-medium text-gray-600">Transactions</span>
                    {transactionsLoading && (
                      <RefreshCw className="h-3 w-3 text-amber-600 animate-spin" />
                    )}
                  </div>
                  <div className="flex items-baseline gap-2">
                    {transactionsLoading && contractTransactionsCount === null ? (
                      <Skeleton className="h-9 w-32" />
                    ) : (
                      <>
                        <span className="text-3xl font-bold text-amber-700">
                          {contractTransactionsCount !== null 
                            ? contractTransactionsCount.toLocaleString() 
                            : totalCards.toLocaleString()}
                        </span>
                        <span className="text-sm text-gray-500">total tx</span>
                      </>
                    )}
                  </div>
                </div>
              </>
            )}
            
            {metricView === 'tvl' && (
              <>
                <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-4 border border-emerald-100 transition-all duration-300 hover:shadow-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Wallet className="h-5 w-5 text-emerald-600" />
                    <span className="text-sm font-medium text-gray-600">Total Value Locked</span>
                    {tvlLoading && (
                      <RefreshCw className="h-3 w-3 text-emerald-600 animate-spin" />
                    )}
                  </div>
                  <div className="flex items-baseline gap-2">
                    {tvlLoading && contractTvl === null ? (
                      <Skeleton className="h-9 w-32" />
                    ) : (
                      <>
                        <span className="text-3xl font-bold text-emerald-700">${tvl.toFixed(2)}</span>
                        <span className="text-sm text-gray-500">USDC</span>
                      </>
                    )}
                  </div>
                </div>

              </>
            )}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Search and filters */}
        <div className="flex flex-col sm:flex-row gap-3 pb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by address or domain..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1); // Reset to first page on search
              }}
              className="pl-9"
            />
          </div>
          <Select value={filterType} onValueChange={(v) => {
            setFilterType(v as typeof filterType);
            setCurrentPage(1);
          }}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="address">Address</SelectItem>
              <SelectItem value="twitter">X</SelectItem>
              <SelectItem value="telegram">Telegram</SelectItem>
              <SelectItem value="twitch">Twitch</SelectItem>
              <SelectItem value="zns">ZNS domains</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={(v) => {
            setSortBy(v as typeof sortBy);
            setCurrentPage(1);
          }}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cards">{terminology.itemSentCapitalized}</SelectItem>
              <SelectItem value="amount">Total amount</SelectItem>
              <SelectItem value="date">Last activity</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex items-center gap-4">
                <Skeleton className="h-6 w-6 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        ) : displayedEntries.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Trophy className="w-12 h-12 opacity-50" />
              </EmptyMedia>
              <EmptyTitle>No entries found</EmptyTitle>
              <EmptyDescription>
                {searchQuery 
                  ? 'No entries match your search. Try different keywords.'
                  : `No one has sent any ${terminology.itemPlural} yet. Be the first to appear on the leaderboard!`
                }
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ScrollArea className="w-full">
            <div className="space-y-2 pr-4">
            {displayedEntries.map((entry, index) => {
              const isAddressLabel =
                !entry.displayName ||
                entry.displayName.toLowerCase() === entry.senderAddress?.toLowerCase();
              const primaryLabel =
                (isAddressLabel ? formatAddress(entry.senderAddress) : entry.displayName) ?? '-';
              const isCurrentUser =
                normalizedAccount &&
                entry.senderAddress?.toLowerCase() === normalizedAccount;
              // Use global rank when filter is "All" (with or without search)
              // Use relative rank when platform filter is applied (starts from 1)
              const addressKey = entry.senderAddress?.toLowerCase() || '';
              let globalRank: number;
              if (filterType === 'all') {
                // Use global rank when showing all platforms (even with search)
                globalRank = globalRanksMap.get(addressKey) ?? (startIndex + index + 1);
              } else {
                // Use relative rank when platform filter is applied (starts from 1)
                globalRank = startIndex + index + 1;
              }
              // Get leader's values for difference calculation
              const leader = filteredAndSortedEntries[0];
              const leaderCards = leader?.cardsSentTotal || 0;
              const leaderUsdcAmount = leader?.amountSentByCurrency?.['USDC'] || 0;
              // Calculate progress based on sort type
              const progressPercentage = sortBy === 'amount'
                ? // For amount sorting, use USDC amount (divide by 1,000,000 for 6 decimals)
                  (((entry.amountSentByCurrency?.['USDC'] || 0) / TOKEN_DECIMALS_DIVISOR) / leaderValue) * 100
                : // For cards sorting, use card count
                  (entry.cardsSentTotal / leaderValue) * 100;
              
              // Get USDC amount for display (divide by 1,000,000 for 6 decimals)
              const usdcAmount = (entry.amountSentByCurrency?.['USDC'] || 0) / TOKEN_DECIMALS_DIVISOR;
              const isAmountSort = sortBy === 'amount';
              
              // Calculate differences for progress display
              const leaderUsdcAmountDisplay = (leaderUsdcAmount / TOKEN_DECIMALS_DIVISOR);
              const usdcDifference = leaderUsdcAmountDisplay - usdcAmount;
              const cardsDifference = leaderCards - entry.cardsSentTotal;

              return (
                <div
                  key={entry.id}
                  className={`group flex flex-col gap-3 rounded-2xl border p-3 md:p-4 transition-all hover:shadow-lg hover:scale-[1.01] ${
                    isCurrentUser 
                      ? 'bg-[#f0f9ff] border-[#bae6fd] ring-2 ring-blue-200' 
                      : globalRank <= 3
                      ? 'bg-gradient-to-r from-yellow-50/50 to-transparent border-yellow-200'
                      : 'bg-white border-[#e2e8f0]'
                  }`}
                  style={{ boxShadow: '0 4px 12px -4px rgba(0, 0, 0, 0.04)' }}
                >
                  <div className="flex items-center gap-3 md:gap-4">
                    {/* Rank badge or medal */}
                    <div className="flex-shrink-0">
                      {/* {globalRank <= 3 ? (
                        <TopThreeMedal rank={globalRank} />
                      ) : ( */}
                        <Badge 
                          variant="secondary"
                          className="min-w-[2.5rem] justify-center bg-gray-100 text-gray-700"
                        >
                          #{globalRank}
                        </Badge>
                      {/* )} */}
                    </div>

                    {/* Avatar */}
                    {entry.senderAddress && (
                      <div className="relative flex-shrink-0">
                        <img 
                          src={getAvatarUrl(entry.senderAddress)} 
                          alt={primaryLabel}
                          className="w-10 h-10 rounded-full border-2 border-gray-200"
                          onError={(e) => {
                            // Fallback to a placeholder if image fails to load
                            (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="40" height="40" fill="%23e2e8f0"/></svg>';
                          }}
                        />
                        {isCurrentUser && (
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-blue-500 rounded-full border-2 border-white" />
                        )}
                      </div>
                    )}

                    {/* Address and info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <p className="text-sm font-semibold text-gray-900 truncate cursor-help">
                              {primaryLabel}
                            </p>
                          </TooltipTrigger>
                          {entry.senderAddress && entry.senderAddress !== primaryLabel && (
                            <TooltipContent>
                              <p className="font-mono text-xs">{entry.senderAddress}</p>
                            </TooltipContent>
                          )}
                        </Tooltip>
                        {entry.senderAddress && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCopyAddress(entry.senderAddress);
                                }}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Copy address</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                      {entry.znsDomain && (
                        <div className="flex items-center gap-1 mt-1">
                          <p className="text-xs font-medium text-[#635bff]">@{entry.znsDomain}</p>
                        </div>
                      )}
                      {isCurrentUser && (
                        <div className="flex items-center gap-1 mt-1">
                          <CheckCircle2 className="h-3 w-3 text-indigo-500" />
                          <p className="text-xs font-medium text-indigo-500">Your wallet</p>
                        </div>
                      )}
                      {/* <AchievementBadges cardsSent={entry.cardsSentTotal} rank={globalRank} /> */}  
                    </div>

                    {/* Stats - Desktop */}
                    <div className="hidden md:block text-right">
                      <div className="flex items-center gap-2 justify-end">
                        {isAmountSort ? (
                          <>
                            <p className="text-sm font-semibold text-gray-900">
                              USDC {usdcAmount.toFixed(2)}
                            </p>
                          </>
                        ) : (
                          <p className="text-sm font-semibold text-gray-900">
                            {entry.cardsSentTotal} {terminology.itemPlural}
                          </p>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {isAmountSort ? (
                          <span>{entry.cardsSentTotal} {terminology.itemPlural}</span>
                        ) : (
                          formatCurrencySummary(entry.amountSentByCurrency)
                        )}
                      </p>
                      {entry.lastSentAt && (
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(entry.lastSentAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Progress bar - only show when sorting by cards or amount */}
                  {sortBy !== 'date' && (
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">Progress to Top-1</span>
                        <span className="font-medium text-gray-700">
                          {progressPercentage.toFixed(1)}%
                          {progressPercentage < 100 && (
                            isAmountSort ? (
                              usdcDifference > 0 && (
                                <span className="text-gray-500 font-normal ml-1">
                                  (USDC {usdcDifference.toFixed(2)})
                                </span>
                              )
                            ) : (
                              cardsDifference > 0 && (
                                <span className="text-gray-500 font-normal ml-1">
                                  ({cardsDifference} {cardsDifference === 1 ? terminology.itemSingular : terminology.itemPlural})
                                </span>
                              )
                            )
                          )}
                        </span>
                      </div>
                      <Progress 
                        value={progressPercentage} 
                        className="h-2"
                      />
                    </div>
                  )}

                  {/* Stats - Mobile */}
                  <div className="flex md:hidden flex-col gap-1 text-xs pt-2 border-t border-gray-100">
                    {isAmountSort ? (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500">Amount:</span>
                          <span className="font-semibold text-gray-900">USDC {usdcAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500">{terminology.itemCapitalized}:</span>
                          <span className="text-gray-500">{entry.cardsSentTotal}</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500">{terminology.itemCapitalized}:</span>
                          <span className="font-semibold text-gray-900">{entry.cardsSentTotal}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500">Amount:</span>
                          <span className="text-gray-500">{formatCurrencySummary(entry.amountSentByCurrency)}</span>
                        </div>
                      </>
                    )}
                    {entry.lastSentAt && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">Last sent:</span>
                        <span className="text-gray-600">{new Date(entry.lastSentAt).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            </div>
          </ScrollArea>
        )}

        {!loading && displayedEntries.length > 0 && totalPages > 1 && (
          <>
            <Separator className="my-4" />
            <div className="flex justify-center">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (currentPage > 1) {
                        handlePageChange(currentPage - 1);
                      }
                    }}
                    className={currentPage === 1 ? 'pointer-events-none opacity-50 cursor-not-allowed' : ''}
                  />
                </PaginationItem>
                {paginationPages.map((page, idx) => {
                  if (page === 'ellipsis') {
                    return (
                      <PaginationItem key={`ellipsis-${idx}`}>
                        <PaginationEllipsis />
                      </PaginationItem>
                    );
                  }
                  const isActive = page === currentPage;
                  return (
                    <PaginationItem key={page}>
                      <PaginationLink
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          handlePageChange(page);
                        }}
                        isActive={isActive}
                        className={isActive 
                          ? "bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] text-white border-transparent hover:opacity-90 font-semibold shadow-md" 
                          : "hover:bg-gray-100"
                        }
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (currentPage < totalPages) {
                        handlePageChange(currentPage + 1);
                      }
                    }}
                    className={currentPage === totalPages ? 'pointer-events-none opacity-50 cursor-not-allowed' : ''}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
            </div>
          </>
        )}
      </CardContent>
    </>
  );
}
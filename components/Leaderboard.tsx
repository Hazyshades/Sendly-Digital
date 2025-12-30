import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { Trophy, RefreshCw, Users, Copy, CheckCircle2, Search } from 'lucide-react';
import { CardHeader, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Skeleton } from './ui/skeleton';
import { Alert, AlertDescription } from './ui/alert';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from './ui/empty';
import { Progress } from './ui/progress';
import { Input } from './ui/input';
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
import { getLeaderboardSenders, recalculateLeaderboard, LeaderboardEntry } from '../utils/leaderboard';
import { useAccount } from 'wagmi';
import { toast } from 'sonner';

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

const formatCurrencySummary = (map: Record<string, number>) => {
  const parts = Object.entries(map)
    .filter(([, amount]) => amount > 0)
    .sort(([, a], [, b]) => b - a)
    .map(([currency, amount]) => `${currency} ${amount.toFixed(2)}`);

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
const TopThreeMedal = ({ rank }: { rank: number }) => {
  if (rank > 3) return null;
  
  const medals = {
    1: { emoji: '🥇', gradient: 'from-yellow-400 via-yellow-300 to-yellow-200', glow: 'shadow-yellow-200/50' },
    2: { emoji: '🥈', gradient: 'from-gray-300 via-gray-200 to-gray-100', glow: 'shadow-gray-200/50' },
    3: { emoji: '🥉', gradient: 'from-amber-400 via-amber-300 to-amber-200', glow: 'shadow-amber-200/50' },
  };
  
  const medal = medals[rank as keyof typeof medals];
  
  return (
    <div className={`relative bg-gradient-to-br ${medal.gradient} rounded-full w-10 h-10 flex items-center justify-center text-xl ${medal.glow} shadow-lg`}>
      <span>{medal.emoji}</span>
    </div>
  );
};

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

export function Leaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasFetchedOnce, setHasFetchedOnce] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'cards' | 'amount' | 'date'>('cards');
  const { address } = useAccount();
  const normalizedAccount = address?.toLowerCase() ?? null;
  const userEntryRef = useRef<HTMLDivElement>(null);
  const hasScrolledToUser = useRef(false);

  const loadEntries = useCallback(
    async (options?: { preserveData?: boolean; recalculate?: boolean }) => {
      const preserveData = options?.preserveData ?? false;
      const shouldRecalculate = options?.recalculate ?? false;
      
      if (preserveData) {
        setIsRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        if (shouldRecalculate) {
          console.log('Recalculating leaderboard before loading...');
          const recalcResult = await recalculateLeaderboard();
          if (!recalcResult.success) {
            console.warn('Leaderboard recalculation failed:', recalcResult.message);
          } else {
            console.log('Leaderboard recalculated. Entries:', recalcResult.entries_count);
          }
        }
        
        const data = await getLeaderboardSenders({ limit: 100000 });
        console.log(`[Leaderboard] Loaded ${data.length} entries from API`);
        setEntries(data);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch leaderboard', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        if (preserveData) {
          setIsRefreshing(false);
        } else {
          setLoading(false);
        }
      }
    },
    []
  );

  const scrollToUserEntry = useCallback(() => {
    if (userEntryRef.current) {
      userEntryRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
      hasScrolledToUser.current = true;
    } else {
      setTimeout(() => {
        if (userEntryRef.current) {
          userEntryRef.current.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          });
          hasScrolledToUser.current = true;
        }
      }, 200);
    }
  }, []);

  useEffect(() => {
    loadEntries({ preserveData: hasFetchedOnce });
    if (!hasFetchedOnce) {
      setHasFetchedOnce(true);
    }
  }, [hasFetchedOnce, loadEntries]);

  useEffect(() => {
    if (!normalizedAccount || !entries.length || loading || hasScrolledToUser.current) {
      return;
    }

    const userIndex = entries.findIndex(
      (entry) => entry.senderAddress?.toLowerCase() === normalizedAccount
    );

    if (userIndex === -1) {
      hasScrolledToUser.current = true;
      return;
    }

    const userPage = Math.floor(userIndex / ITEMS_PER_PAGE) + 1;

    if (currentPage !== userPage) {
      setCurrentPage(userPage);
      return;
    }

    const timeoutId = setTimeout(() => {
      scrollToUserEntry();
    }, 200);

    return () => clearTimeout(timeoutId);
  }, [entries, normalizedAccount, loading, currentPage, scrollToUserEntry]);

  // Filter and sort entries
  const filteredAndSortedEntries = useMemo(() => {
    let filtered = [...entries];
    
    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(entry => 
        entry.senderAddress?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (entry as any).znsDomain?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.displayName?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'cards':
          return b.cardsSentTotal - a.cardsSentTotal;
        case 'amount':
          const aTotal = Object.values(a.amountSentByCurrency).reduce((sum, val) => sum + val, 0);
          const bTotal = Object.values(b.amountSentByCurrency).reduce((sum, val) => sum + val, 0);
          return bTotal - aTotal;
        case 'date':
          return new Date(b.lastSentAt || 0).getTime() - new Date(a.lastSentAt || 0).getTime();
        default:
          return 0;
      }
    });
    
    return filtered;
  }, [entries, sortBy, searchQuery]);

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
  const totalAddresses = useMemo(() => entries.length, [entries.length]);
  const totalCards = useMemo(
    () => entries.reduce((sum, entry) => sum + entry.cardsSentTotal, 0),
    [entries]
  );

  // Get leader's card count for progress calculation
  const leaderCards = useMemo(() => {
    if (filteredAndSortedEntries.length === 0) return 1;
    return filteredAndSortedEntries[0]?.cardsSentTotal || 1;
  }, [filteredAndSortedEntries]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    hasScrolledToUser.current = false;
    try {
      // Note: updateZNSDomains function needs to be implemented
      // For now, we'll skip it and just recalculate the leaderboard
      loadEntries({ preserveData: true, recalculate: true });
    } catch (error) {
      console.error('Failed to refresh leaderboard:', error);
      loadEntries({ preserveData: true, recalculate: true });
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
          
          {/* Improved statistics cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-medium text-gray-600">Total Addresses</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-blue-700">{totalAddresses}</span>
                <span className="text-sm text-gray-500">addresses</span>
              </div>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-100">
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="h-5 w-5 text-purple-600" />
                <span className="text-sm font-medium text-gray-600">Total Cards</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-purple-700">{totalCards}</span>
                <span className="text-sm text-gray-500">cards sent</span>
              </div>
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
        <div className="flex flex-col sm:flex-row gap-3">
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
          <Select value={sortBy} onValueChange={(v) => {
            setSortBy(v as typeof sortBy);
            setCurrentPage(1);
          }}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cards">Cards sent</SelectItem>
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
                  : 'No one has sent any cards yet. Be the first to appear on the leaderboard!'
                }
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="space-y-2">
            {displayedEntries.map((entry, index) => {
              const isAddressLabel =
                !entry.displayName ||
                entry.displayName.toLowerCase() === entry.senderAddress?.toLowerCase();
              const primaryLabel =
                (isAddressLabel ? formatAddress(entry.senderAddress) : entry.displayName) ?? '—';
              const isCurrentUser =
                normalizedAccount &&
                entry.senderAddress?.toLowerCase() === normalizedAccount;
              const globalRank = startIndex + index + 1;
              const progressPercentage = (entry.cardsSentTotal / leaderCards) * 100;

              return (
                <div
                  key={entry.id}
                  ref={isCurrentUser ? userEntryRef : null}
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
                      {globalRank <= 3 ? (
                        <TopThreeMedal rank={globalRank} />
                      ) : (
                        <Badge 
                          variant="secondary"
                          className="min-w-[2.5rem] justify-center bg-gray-100 text-gray-700"
                        >
                          #{globalRank}
                        </Badge>
                      )}
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
                      {isCurrentUser && (
                        <div className="flex items-center gap-1 mt-1">
                          <CheckCircle2 className="h-3 w-3 text-indigo-500" />
                          <p className="text-xs font-medium text-indigo-500">Your wallet</p>
                        </div>
                      )}
                      <AchievementBadges cardsSent={entry.cardsSentTotal} rank={globalRank} />
                    </div>

                    {/* Stats - Desktop */}
                    <div className="hidden md:block text-right">
                      <div className="flex items-center gap-2 justify-end">
                        <p className="text-sm font-semibold text-gray-900">
                          {entry.cardsSentTotal} cards
                        </p>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatCurrencySummary(entry.amountSentByCurrency)}
                      </p>
                      {entry.lastSentAt && (
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(entry.lastSentAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Progress to #1</span>
                      <span className="font-medium text-gray-700">{progressPercentage.toFixed(1)}%</span>
                    </div>
                    <Progress 
                      value={progressPercentage} 
                      className={`h-2 ${
                        globalRank <= 3 ? 'bg-yellow-100' : ''
                      }`}
                    />
                  </div>

                  {/* Stats - Mobile */}
                  <div className="flex md:hidden flex-col gap-1 text-xs pt-2 border-t border-gray-100">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Cards:</span>
                      <span className="font-semibold">{entry.cardsSentTotal}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Amount:</span>
                      <span className="font-semibold">{formatCurrencySummary(entry.amountSentByCurrency)}</span>
                    </div>
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
        )}

        {!loading && displayedEntries.length > 0 && totalPages > 1 && (
          <div className="mt-6 flex justify-center">
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
                  return (
                    <PaginationItem key={page}>
                      <PaginationLink
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          handlePageChange(page);
                        }}
                        isActive={page === currentPage}
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
        )}
      </CardContent>
    </>
  );
}
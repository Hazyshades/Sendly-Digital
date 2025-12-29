import { apiCall } from './supabase/client';

export interface LeaderboardEntry {
  id: string;
  userIdentifier: string;
  senderAddress: string;
  socialPlatform: string;
  displayName: string | null;
  avatarUrl: string | null;
  lastRecipient: string | null;
  cardsSentTotal: number;
  amountSentTotal: number;
  amountSentByCurrency: Record<string, number>;
  lastSentAt: string | null;
  znsDomain?: string | null;
}

interface FetchParams {
  platform?: string;
  limit?: number;
}

const toNumber = (value: unknown): number => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

export async function recalculateLeaderboard(): Promise<{ success: boolean; entries_count?: number; message?: string }> {
  try {
    const response = await apiCall('/leaderboard/recalculate', {
      method: 'POST',
    });
    return {
      success: response.success ?? true,
      entries_count: response.entries_count,
      message: response.message,
    };
  } catch (error) {
    console.error('Failed to recalculate leaderboard:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to recalculate leaderboard',
    };
  }
}

export async function getLeaderboardSenders(params: FetchParams = {}): Promise<LeaderboardEntry[]> {
  const searchParams = new URLSearchParams();
  if (params.platform && params.platform !== 'all') {
    searchParams.set('platform', params.platform);
  }
  if (params.limit) {
    searchParams.set('limit', String(params.limit));
  }

  const query = searchParams.toString();
  const endpoint = `/leaderboard/senders${query ? `?${query}` : ''}`;
  const response = await apiCall(endpoint);

  const entries: any[] = Array.isArray(response.entries) ? response.entries : [];

  return entries.map((entry) => {
    const amountSentByCurrencyRaw =
      entry.amountSentByCurrency ?? entry.amount_sent_by_currency ?? {};

    const amountSentByCurrency: Record<string, number> = {};
    for (const [currency, value] of Object.entries(amountSentByCurrencyRaw)) {
      amountSentByCurrency[currency] = toNumber(value);
    }

    return {
      id: entry.id,
      userIdentifier: entry.userIdentifier ?? entry.user_identifier ?? '',
      senderAddress: entry.senderAddress ?? entry.sender_address ?? '',
      socialPlatform: entry.socialPlatform ?? entry.social_platform ?? 'generic',
      displayName: entry.displayName ?? entry.display_name ?? null,
      avatarUrl: entry.avatarUrl ?? entry.avatar_url ?? null,
      lastRecipient: entry.lastRecipient ?? entry.last_recipient ?? null,
      cardsSentTotal: entry.cardsSentTotal ?? entry.cards_sent_total ?? 0,
      amountSentTotal: toNumber(entry.amountSentTotal ?? entry.amount_sent_total ?? 0),
      amountSentByCurrency,
      lastSentAt: entry.lastSentAt ?? entry.last_sent_at ?? null,
      znsDomain: entry.znsDomain ?? entry.zns_domain ?? null,
    } satisfies LeaderboardEntry;
  });
}


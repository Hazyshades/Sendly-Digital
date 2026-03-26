import { supabase } from './client';
import type { LeaderboardEntry } from '@/lib/leaderboard';

export interface ZkSendPaymentRow {
  id: string;
  chain_id: string;
  contract_address: string;
  payment_id: string;
  sender_address: string;
  recipient_identity_hash: string;
  social_platform: string;
  recipient_username: string | null;
  recipient_username_raw: string | null;
  amount: string;
  currency: string;
  recipient_wallet: string | null;
  claimed: boolean;
  claimed_at: string | null;
  created_at: string | null;
  tx_hash: string | null;
  claim_tx_hash: string | null;
}

export interface ZkSendFilter {
  chainId: string;
  contractAddress: string;
}

export interface ZkSendLeaderboardStatsRow {
  id: string;
  chain_id: string;
  contract_address: string;
  sender_address: string;
  social_platform: string;
  cards_sent_total: number;
  amount_sent_total: number;
  amount_sent_by_currency: Record<string, number> | null;
  last_sent_at: string | null;
  last_recipient: string | null;
  display_name: string | null;
  avatar_url: string | null;
  zns_domain: string | null;
}

const toNumber = (v: unknown): number =>
  typeof v === 'number' ? (Number.isFinite(v) ? v : 0) : typeof v === 'string' ? (Number.isFinite(parseFloat(v)) ? parseFloat(v) : 0) : 0;

export async function getZkSendPaymentsBySender(address: string, filter: ZkSendFilter): Promise<ZkSendPaymentRow[]> {
  const normalized = address?.trim().toLowerCase();
  if (!normalized) return [];
  const { data, error } = await supabase
    .from('zksend_payments')
    .select('*')
    .eq('sender_address', normalized)
    .eq('chain_id', filter.chainId)
    .eq('contract_address', filter.contractAddress.toLowerCase())
    .order('created_at', { ascending: false });
  if (error) {
    console.error('[ZkSendPayments] getZkSendPaymentsBySender:', error);
    return [];
  }
  return (data ?? []) as ZkSendPaymentRow[];
}

export async function getZkSendPaymentsByRecipientWallet(address: string, filter: ZkSendFilter): Promise<ZkSendPaymentRow[]> {
  const normalized = address?.trim().toLowerCase();
  if (!normalized) return [];
  const { data, error } = await supabase
    .from('zksend_payments')
    .select('*')
    .eq('recipient_wallet', normalized)
    .eq('chain_id', filter.chainId)
    .eq('contract_address', filter.contractAddress.toLowerCase())
    .order('claimed_at', { ascending: false });
  if (error) {
    console.error('[ZkSendPayments] getZkSendPaymentsByRecipientWallet:', error);
    return [];
  }
  return (data ?? []) as ZkSendPaymentRow[];
}

export async function getZkSendLeaderboardEntries(filter: ZkSendFilter): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase
    .from('zksend_payments')
    .select('*')
    .eq('chain_id', filter.chainId)
    .eq('contract_address', filter.contractAddress.toLowerCase())
    .order('created_at', { ascending: false });
  if (error) {
    console.error('[ZkSendPayments] getZkSendLeaderboardEntries:', error);
    return [];
  }
  const rows = (data ?? []) as ZkSendPaymentRow[];
  const map = new Map<string, LeaderboardEntry>();
  for (const row of rows) {
    const key = `${row.sender_address?.toLowerCase() ?? ''}:${(row.social_platform ?? '').toLowerCase()}`;
    if (!key || key === ':') continue;
    const existing = map.get(key);
    const amountNum = toNumber(row.amount);
    const currency = (row.currency ?? 'USDC').toUpperCase();
    if (!existing) {
      map.set(key, {
        id: row.id,
        userIdentifier: key,
        senderAddress: row.sender_address ?? '',
        socialPlatform: row.social_platform ?? 'generic',
        displayName: null,
        avatarUrl: null,
        lastRecipient: row.recipient_username ?? row.recipient_username_raw ?? null,
        cardsSentTotal: 1,
        amountSentTotal: amountNum,
        amountSentByCurrency: { [currency]: amountNum },
        lastSentAt: row.created_at ?? null,
        znsDomain: null,
      });
    } else {
      existing.cardsSentTotal += 1;
      existing.amountSentTotal += amountNum;
      existing.amountSentByCurrency[currency] = (existing.amountSentByCurrency[currency] ?? 0) + amountNum;
      const rowDate = row.created_at ? new Date(row.created_at).getTime() : 0;
      const existingDate = existing.lastSentAt ? new Date(existing.lastSentAt).getTime() : 0;
      if (rowDate > existingDate) {
        existing.lastSentAt = row.created_at ?? null;
        existing.lastRecipient = row.recipient_username ?? row.recipient_username_raw ?? existing.lastRecipient;
      }
    }
  }
  return Array.from(map.values());
}

export async function getZkSendLeaderboardEntriesFromStats(filter: ZkSendFilter): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase
    .from('zksend_leaderboard_stats')
    .select('*')
    .eq('chain_id', filter.chainId)
    .eq('contract_address', filter.contractAddress.toLowerCase())
    .order('cards_sent_total', { ascending: false });
  if (error) {
    console.error('[ZkSendPayments] getZkSendLeaderboardEntriesFromStats:', error);
    return [];
  }
  const rows = (data ?? []) as ZkSendLeaderboardStatsRow[];
  const fromJsonb = (raw: unknown): Record<string, number> => {
    if (raw == null || typeof raw !== 'object') return {};
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(raw)) out[k] = toNumber(v);
    return out;
  };
  return rows.map((row) => ({
    id: row.id,
    userIdentifier: `${row.sender_address ?? ''}:${(row.social_platform ?? '').toLowerCase()}`,
    senderAddress: row.sender_address ?? '',
    socialPlatform: row.social_platform ?? 'generic',
    displayName: row.display_name ?? null,
    avatarUrl: row.avatar_url ?? null,
    lastRecipient: row.last_recipient ?? null,
    cardsSentTotal: Number(row.cards_sent_total) || 0,
    amountSentTotal: toNumber(row.amount_sent_total),
    amountSentByCurrency: fromJsonb(row.amount_sent_by_currency),
    lastSentAt: row.last_sent_at ?? null,
    znsDomain: row.zns_domain ?? null,
  }));
}

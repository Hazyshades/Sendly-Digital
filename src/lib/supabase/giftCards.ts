import { supabase } from './client';
import type { GiftCardRecord, GiftCardInsert } from '@/types/giftCard';

export type { GiftCardRecord, GiftCardInsert };

const DEFAULT_CHAIN_ID = Number(import.meta.env.VITE_ARC_CHAIN_ID || 5042002);

/** Source for /my and related UI: `graph` (gift_cards_graph) or legacy `gift_cards`. */
export type MyCardsDataSource = 'graph' | 'gift_cards';

export function getMyCardsDataSource(): MyCardsDataSource {
  const v = import.meta.env.VITE_MYCARDS_SOURCE;
  if (v === 'gift_cards') return 'gift_cards';
  return 'graph';
}

/** Postgres 42703 or PostgREST PGRST204 when chain_id column missing from table or schema cache. */
function isChainIdSchemaError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  const msg = error.message ?? '';
  if (error.code === '42703' && msg.includes('chain_id')) return true;
  if (error.code === 'PGRST204' && msg.includes('chain_id')) return true;
  return false;
}

/**
 * Used only when REST returns rows without chain_id filter (legacy DB / retry after 42703).
 */
function filterGraphRowsByChainId<T extends { chain_id?: number | null }>(rows: T[], chainId?: number | null): T[] {
  if (chainId == null) return rows;
  const hasChain = rows.some((r) => r.chain_id != null);
  if (!hasChain) return rows;
  return rows.filter((r) => r.chain_id == null || Number(r.chain_id) === chainId);
}

export class GiftCardsService {
  static async upsertCard(card: GiftCardInsert, chainId?: number): Promise<GiftCardRecord | null> {
    try {
      const row = { ...card, chain_id: card.chain_id ?? chainId ?? DEFAULT_CHAIN_ID, last_synced_at: new Date().toISOString() };
      let { data, error } = await supabase
        .from('gift_cards')
        .upsert(row, { onConflict: 'chain_id,token_id', ignoreDuplicates: false })
        .select()
        .single();
      if (error && isChainIdSchemaError(error)) {
        const { chain_id: _c, ...legacyRow } = row;
        const r = await supabase
          .from('gift_cards')
          .upsert(legacyRow, { onConflict: 'token_id', ignoreDuplicates: false })
          .select()
          .single();
        data = r.data;
        error = r.error;
      }
      if (error) {
        console.error('Error upserting gift card:', error);
        return null;
      }
      return data;
    } catch (error) {
      console.error('Error upserting gift card:', error);
      return null;
    }
  }

  static async getCardsBySender(senderAddress: string, chainId?: number): Promise<GiftCardRecord[]> {
    try {
      let q = supabase
        .from('gift_cards')
        .select('*')
        .eq('sender_address', senderAddress.toLowerCase());
      if (chainId != null) q = q.eq('chain_id', chainId);
      let { data, error } = await q.order('created_at', { ascending: false });
      if (error && isChainIdSchemaError(error) && chainId != null) {
        const r = await supabase
          .from('gift_cards')
          .select('*')
          .eq('sender_address', senderAddress.toLowerCase())
          .order('created_at', { ascending: false });
        data = r.data;
        error = r.error;
      }
      if (error) {
        console.error('Error fetching sent cards:', error);
        return [];
      }
      return data ?? [];
    } catch (error) {
      console.error('Error fetching sent cards:', error);
      return [];
    }
  }

  static async getCardsByRecipientAddress(recipientAddress: string, chainId?: number): Promise<GiftCardRecord[]> {
    try {
      let q = supabase
        .from('gift_cards')
        .select('*')
        .eq('recipient_address', recipientAddress.toLowerCase())
        .eq('recipient_type', 'address');
      if (chainId != null) q = q.eq('chain_id', chainId);
      let { data, error } = await q.order('created_at', { ascending: false });
      if (error && isChainIdSchemaError(error) && chainId != null) {
        const r = await supabase
          .from('gift_cards')
          .select('*')
          .eq('recipient_address', recipientAddress.toLowerCase())
          .eq('recipient_type', 'address')
          .order('created_at', { ascending: false });
        data = r.data;
        error = r.error;
      }
      if (error) {
        console.error('Error fetching received cards:', error);
        return [];
      }
      return data ?? [];
    } catch (error) {
      console.error('Error fetching received cards:', error);
      return [];
    }
  }

  static async getAllCardsWithNullRecipient(chainId?: number): Promise<GiftCardRecord[]> {
    try {
      let q = supabase
        .from('gift_cards')
        .select('*')
        .is('recipient_address', null)
        .eq('recipient_type', 'address')
        .order('created_at', { ascending: false })
        .limit(100);
      if (chainId != null) q = q.eq('chain_id', chainId);
      let { data, error } = await q;
      if (error && isChainIdSchemaError(error) && chainId != null) {
        const r = await supabase
          .from('gift_cards')
          .select('*')
          .is('recipient_address', null)
          .eq('recipient_type', 'address')
          .order('created_at', { ascending: false })
          .limit(100);
        data = r.data;
        error = r.error;
      }
      if (error) {
        console.error('Error fetching cards with null recipient:', error);
        return [];
      }
      return data ?? [];
    } catch (error) {
      console.error('Error fetching cards with null recipient:', error);
      return [];
    }
  }

  static async getCardByTokenId(tokenId: string, chainId?: number): Promise<GiftCardRecord | null> {
    try {
      let q = supabase.from('gift_cards').select('*').eq('token_id', tokenId);
      if (chainId != null) q = q.eq('chain_id', chainId);
      let { data, error } = await q.single();
      if (error && isChainIdSchemaError(error) && chainId != null) {
        const r = await supabase.from('gift_cards').select('*').eq('token_id', tokenId).single();
        data = r.data;
        error = r.error;
      }
      if (error) {
        if (error.code === 'PGRST116') return null;
        console.error('Error fetching card by token ID:', error);
        return null;
      }
      return data;
    } catch (error) {
      console.error('Error fetching card by token ID:', error);
      return null;
    }
  }

  static async updateCardRedeemedStatus(tokenId: string, redeemed: boolean, chainId?: number): Promise<boolean> {
    try {
      let q = supabase
        .from('gift_cards')
        .update({ redeemed, last_synced_at: new Date().toISOString() })
        .eq('token_id', tokenId);
      if (chainId != null) q = q.eq('chain_id', chainId);
      let { error } = await q;
      if (error && isChainIdSchemaError(error) && chainId != null) {
        const r = await supabase
          .from('gift_cards')
          .update({ redeemed, last_synced_at: new Date().toISOString() })
          .eq('token_id', tokenId);
        error = r.error;
      }
      if (error) {
        console.error('Error updating card redeemed status:', error);
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error updating card redeemed status:', error);
      return false;
    }
  }

  static async bulkUpsertCards(cards: GiftCardInsert[]): Promise<boolean> {
    try {
      const rows = cards.map((card) => ({
        ...card,
        chain_id: card.chain_id ?? DEFAULT_CHAIN_ID,
        last_synced_at: new Date().toISOString(),
      }));
      let { error } = await supabase
        .from('gift_cards')
        .upsert(rows, { onConflict: 'chain_id,token_id', ignoreDuplicates: false });
      if (error && isChainIdSchemaError(error)) {
        const legacy = rows.map(({ chain_id: _c, ...rest }) => rest);
        const r = await supabase
          .from('gift_cards')
          .upsert(legacy, { onConflict: 'token_id', ignoreDuplicates: false });
        error = r.error;
      }
      if (error) {
        console.error('Error bulk upserting cards:', error);
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error bulk upserting cards:', error);
      return false;
    }
  }

  /** Sent cards from subgraph-backed table (used when VITE_MYCARDS_SOURCE=graph). */
  static async getGraphCardsBySender(senderAddress: string, chainId?: number): Promise<GiftCardRecord[]> {
    try {
      let q = supabase
        .from('gift_cards_graph')
        .select('*')
        .eq('sender_address', senderAddress.toLowerCase());
      if (chainId != null) q = q.eq('chain_id', chainId);
      let { data, error } = await q.order('created_at', { ascending: false });
      if (error && isChainIdSchemaError(error) && chainId != null) {
        const r = await supabase
          .from('gift_cards_graph')
          .select('*')
          .eq('sender_address', senderAddress.toLowerCase())
          .order('created_at', { ascending: false });
        data = r.data;
        error = r.error;
        if (!error) return filterGraphRowsByChainId((data ?? []) as GiftCardRecord[], chainId);
      }
      if (error) {
        console.error('Error fetching sent cards (graph):', error);
        return [];
      }
      return (data ?? []) as GiftCardRecord[];
    } catch (error) {
      console.error('Error fetching sent cards (graph):', error);
      return [];
    }
  }

  /** Received cards (address recipient) from gift_cards_graph. */
  static async getGraphCardsByRecipientAddress(recipientAddress: string, chainId?: number): Promise<GiftCardRecord[]> {
    try {
      let q = supabase
        .from('gift_cards_graph')
        .select('*')
        .eq('recipient_address', recipientAddress.toLowerCase())
        .eq('recipient_type', 'address');
      if (chainId != null) q = q.eq('chain_id', chainId);
      let { data, error } = await q.order('created_at', { ascending: false });
      if (error && isChainIdSchemaError(error) && chainId != null) {
        const r = await supabase
          .from('gift_cards_graph')
          .select('*')
          .eq('recipient_address', recipientAddress.toLowerCase())
          .eq('recipient_type', 'address')
          .order('created_at', { ascending: false });
        data = r.data;
        error = r.error;
        if (!error) return filterGraphRowsByChainId((data ?? []) as GiftCardRecord[], chainId);
      }
      if (error) {
        console.error('Error fetching received cards (graph):', error);
        return [];
      }
      return (data ?? []) as GiftCardRecord[];
    } catch (error) {
      console.error('Error fetching received cards (graph):', error);
      return [];
    }
  }

  static async getGraphAllCardsWithNullRecipient(chainId?: number): Promise<GiftCardRecord[]> {
    try {
      let q = supabase
        .from('gift_cards_graph')
        .select('*')
        .is('recipient_address', null)
        .eq('recipient_type', 'address')
        .order('created_at', { ascending: false })
        .limit(100);
      if (chainId != null) q = q.eq('chain_id', chainId);
      let { data, error } = await q;
      if (error && isChainIdSchemaError(error) && chainId != null) {
        const r = await supabase
          .from('gift_cards_graph')
          .select('*')
          .is('recipient_address', null)
          .eq('recipient_type', 'address')
          .order('created_at', { ascending: false })
          .limit(100);
        data = r.data;
        error = r.error;
        if (!error) return filterGraphRowsByChainId((data ?? []) as GiftCardRecord[], chainId);
      }
      if (error) {
        console.error('Error fetching cards with null recipient (graph):', error);
        return [];
      }
      return (data ?? []) as GiftCardRecord[];
    } catch (error) {
      console.error('Error fetching cards with null recipient (graph):', error);
      return [];
    }
  }

  static async getGraphCardByTokenId(tokenId: string, chainId?: number): Promise<GiftCardRecord | null> {
    try {
      let q = supabase.from('gift_cards_graph').select('*').eq('token_id', tokenId);
      if (chainId != null) q = q.eq('chain_id', chainId);
      let { data, error } = await q.maybeSingle();
      if (error && isChainIdSchemaError(error) && chainId != null) {
        const r = await supabase.from('gift_cards_graph').select('*').eq('token_id', tokenId);
        const rows = filterGraphRowsByChainId((r.data ?? []) as GiftCardRecord[], chainId);
        return rows[0] ?? null;
      }
      if (error) {
        if (error.code === 'PGRST116') return null;
        console.error('Error fetching graph card by token ID:', error);
        return null;
      }
      return data as GiftCardRecord | null;
    } catch (error) {
      console.error('Error fetching graph card by token ID:', error);
      return null;
    }
  }

  static async updateGraphCardRedeemedStatus(tokenId: string, redeemed: boolean, chainId?: number): Promise<boolean> {
    try {
      const ts = new Date().toISOString();
      let q = supabase
        .from('gift_cards_graph')
        .update({ redeemed, updated_at: ts, last_synced_at: ts })
        .eq('token_id', tokenId);
      if (chainId != null) q = q.eq('chain_id', chainId);
      let { error } = await q;
      if (error && isChainIdSchemaError(error) && chainId != null) {
        const r = await supabase
          .from('gift_cards_graph')
          .update({ redeemed, updated_at: ts, last_synced_at: ts })
          .eq('token_id', tokenId);
        error = r.error;
      }
      if (error) {
        console.error('Error updating graph card redeemed status:', error);
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error updating graph card redeemed status:', error);
      return false;
    }
  }

  static async getCardsBySenderForMyCards(senderAddress: string, chainId?: number): Promise<GiftCardRecord[]> {
    return getMyCardsDataSource() === 'graph'
      ? this.getGraphCardsBySender(senderAddress, chainId)
      : this.getCardsBySender(senderAddress, chainId);
  }

  static async getCardsByRecipientForMyCards(recipientAddress: string, chainId?: number): Promise<GiftCardRecord[]> {
    return getMyCardsDataSource() === 'graph'
      ? this.getGraphCardsByRecipientAddress(recipientAddress, chainId)
      : this.getCardsByRecipientAddress(recipientAddress, chainId);
  }

  static async getAllCardsWithNullRecipientForMyCards(chainId?: number): Promise<GiftCardRecord[]> {
    return getMyCardsDataSource() === 'graph'
      ? this.getGraphAllCardsWithNullRecipient(chainId)
      : this.getAllCardsWithNullRecipient(chainId);
  }

  /** Upsert to gift_cards_graph for leaderboard from The Graph. */
  static async upsertCardGraph(card: GiftCardInsert & {
    block_number?: number | null;
    block_timestamp?: number | null;
    event_type?: string | null;
    uri?: string | null;
  }, chainId?: number): Promise<boolean> {
    try {
      const cid = card.chain_id ?? chainId ?? DEFAULT_CHAIN_ID;
      const graphCard = {
        chain_id: cid,
        token_id: card.token_id,
        sender_address: card.sender_address?.toLowerCase() ?? null,
        recipient_address: card.recipient_address?.toLowerCase() ?? null,
        recipient_username: card.recipient_username ?? null,
        recipient_type: card.recipient_type,
        amount: card.amount,
        currency: card.currency,
        message: card.message ?? '',
        redeemed: card.redeemed ?? false,
        tx_hash: card.tx_hash ?? null,
        block_number: card.block_number ?? null,
        block_timestamp: card.block_timestamp ?? null,
        event_type: card.event_type ?? null,
        uri: card.uri ?? null,
      };
      let { error } = await supabase
        .from('gift_cards_graph')
        .upsert(graphCard, { onConflict: 'chain_id,token_id', ignoreDuplicates: false });
      if (error && isChainIdSchemaError(error)) {
        const { chain_id: _c, ...legacy } = graphCard;
        const r = await supabase
          .from('gift_cards_graph')
          .upsert(legacy, { onConflict: 'token_id', ignoreDuplicates: false });
        error = r.error;
      }
      if (error) {
        console.error('Error upserting gift card to graph:', error);
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error upserting gift card to graph:', error);
      return false;
    }
  }
}

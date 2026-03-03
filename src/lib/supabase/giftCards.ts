import { supabase } from './client';
import type { GiftCardRecord, GiftCardInsert } from '@/types/giftCard';

export type { GiftCardRecord, GiftCardInsert };

const DEFAULT_CHAIN_ID = Number(import.meta.env.VITE_ARC_CHAIN_ID || 5042002);

export class GiftCardsService {
  static async upsertCard(card: GiftCardInsert, chainId?: number): Promise<GiftCardRecord | null> {
    try {
      const row = { ...card, chain_id: card.chain_id ?? chainId ?? DEFAULT_CHAIN_ID, last_synced_at: new Date().toISOString() };
      const { data, error } = await supabase
        .from('gift_cards')
        .upsert(row, { onConflict: 'chain_id,token_id', ignoreDuplicates: false })
        .select()
        .single();
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
      const { data, error } = await q.order('created_at', { ascending: false });
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
      const { data, error } = await q.order('created_at', { ascending: false });
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
      const { data, error } = await q;
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
      const { data, error } = await q.single();
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
      const { error } = await q;
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
      const { error } = await supabase
        .from('gift_cards')
        .upsert(
          cards.map((card) => ({ ...card, last_synced_at: new Date().toISOString() })),
          { onConflict: 'chain_id,token_id', ignoreDuplicates: false }
        );
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
      const { error } = await supabase
        .from('gift_cards_graph')
        .upsert(graphCard, { onConflict: 'chain_id,token_id', ignoreDuplicates: false });
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

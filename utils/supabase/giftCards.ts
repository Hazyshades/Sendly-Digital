import { supabase } from './client';
import type { GiftCardRecord, GiftCardInsert } from '../../src/types/giftCard';

export type { GiftCardRecord, GiftCardInsert };

export class GiftCardsService {
  static async upsertCard(card: GiftCardInsert): Promise<GiftCardRecord | null> {
    try {
      // If chain_id is not provided, default to ARC
      const cardWithChainId = {
        ...card,
        chain_id: card.chain_id ?? 5042002, // ARC default chainId
        last_synced_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('gift_cards')
        .upsert(cardWithChainId, {
          onConflict: 'chain_id,token_id', // Composite unique key
          ignoreDuplicates: false,
        })
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
      let query = supabase
        .from('gift_cards')
        .select('*')
        .eq('sender_address', senderAddress.toLowerCase());
      
      // Filter by chain_id if provided
      if (chainId !== undefined) {
        query = query.eq('chain_id', chainId);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching sent cards:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching sent cards:', error);
      return [];
    }
  }

  static async getCardsByRecipientAddress(recipientAddress: string, chainId?: number): Promise<GiftCardRecord[]> {
    try {
      let query = supabase
        .from('gift_cards')
        .select('*')
        .eq('recipient_address', recipientAddress.toLowerCase())
        .eq('recipient_type', 'address');
      
      // Filter by chain_id if provided
      if (chainId !== undefined) {
        query = query.eq('chain_id', chainId);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching received cards:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching received cards:', error);
      return [];
    }
  }

  static async getAllCardsWithNullRecipient(): Promise<GiftCardRecord[]> {
    try {
      const { data, error } = await supabase
        .from('gift_cards')
        .select('*')
        .is('recipient_address', null)
        .eq('recipient_type', 'address')
        .order('created_at', { ascending: false })
        .limit(100); 

      if (error) {
        console.error('Error fetching cards with null recipient:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching cards with null recipient:', error);
      return [];
    }
  }

  static async getCardByTokenId(tokenId: string, chainId?: number): Promise<GiftCardRecord | null> {
    try {
      let query = supabase
        .from('gift_cards')
        .select('*')
        .eq('token_id', tokenId);
      
      // Filter by chain_id if provided
      if (chainId !== undefined) {
        query = query.eq('chain_id', chainId);
      }
      
      const { data, error } = await query.single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
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
      let query = supabase
        .from('gift_cards')
        .update({
          redeemed,
          last_synced_at: new Date().toISOString(),
        })
        .eq('token_id', tokenId);
      
      // Filter by chain_id if provided
      if (chainId !== undefined) {
        query = query.eq('chain_id', chainId);
      }
      
      const { error } = await query;

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
      const cardsWithTimestamp = cards.map(card => ({
        ...card,
        chain_id: card.chain_id ?? 5042002, // ARC default chainId
        last_synced_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from('gift_cards')
        .upsert(cardsWithTimestamp, {
          onConflict: 'chain_id,token_id', // Composite unique key
          ignoreDuplicates: false,
        });

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

  /**
   * Upsert card to gift_cards_graph table
   * This table is used for leaderboard calculations from The Graph data
   */
  static async upsertCardGraph(card: GiftCardInsert & { 
    block_number?: number | null;
    block_timestamp?: number | null;
    event_type?: string | null;
    uri?: string | null;
  }): Promise<boolean> {
    try {
      const graphCard: any = {
        chain_id: card.chain_id ?? 5042002, // ARC default chainId
        token_id: card.token_id,
        sender_address: card.sender_address?.toLowerCase() || null,
        recipient_address: card.recipient_address?.toLowerCase() || null,
        recipient_username: card.recipient_username || null,
        recipient_type: card.recipient_type,
        amount: card.amount,
        currency: card.currency,
        message: card.message || '',
        redeemed: card.redeemed || false,
        tx_hash: card.tx_hash || null,
        block_number: card.block_number || null,
        block_timestamp: card.block_timestamp || null,
        event_type: card.event_type || null,
        uri: card.uri || null,
      };

      const { error } = await supabase
        .from('gift_cards_graph')
        .upsert(graphCard, {
          onConflict: 'chain_id,token_id',
          ignoreDuplicates: false,
        });

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


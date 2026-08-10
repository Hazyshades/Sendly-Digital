/**
 * Canonical zkSEND payment row (17 DB columns shared by Edge + PostgREST readers).
 * Field nullability matches the Supabase `zksend_payments` read shape.
 */
export interface ZkSendPayment {
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

/** PostgREST / leaderboard read alias — identical to the canonical row. */
export type ZkSendPaymentRow = ZkSendPayment;

/**
 * Edge Function write/response alias: chain fields may be omitted in older
 * responses; created_at is always present as a string when returned by the API.
 */
export type ZkSendPaymentRecord = Omit<ZkSendPayment, 'chain_id' | 'contract_address' | 'created_at'> & {
  created_at: string;
  chain_id?: string;
  contract_address?: string;
};

import { getApiUrl } from '../supabase/client';
import { publicAnonKey } from '../supabase/info';

const SUPABASE_FUNCTION_URL =
  import.meta.env.VITE_SUPABASE_ZKSEND_FUNCTION_URL ||
  import.meta.env.VITE_SUPABASE_FUNCTION_URL ||
  `${getApiUrl()}/smart-action`;

export interface ZkSendPaymentRecord {
  id: string;
  payment_id: string;
  sender_address: string;
  recipient_identity_hash: string;
  social_platform: string;
  amount: string;
  currency: string;
  recipient_wallet: string | null;
  claimed: boolean;
  claimed_at: string | null;
  created_at: string;
  tx_hash: string | null;
  claim_tx_hash: string | null;
}

export interface CreateZkSendPaymentInput {
  paymentId: string;
  senderAddress: string;
  recipientIdentityHash: string;
  platform: string;
  amount: string;
  currency: string;
  txHash?: string | null;
}

export interface ClaimZkSendPaymentInput {
  paymentId: string;
  senderAddress: string;
  recipientIdentityHash: string;
  platform: string;
  amount: string;
  currency: string;
  recipientWallet: string;
  txHash?: string | null;
  claimTxHash?: string | null;
}

async function handleResponse(response: Response): Promise<ZkSendPaymentRecord> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    const errorMessage = errorData.error || `HTTP ${response.status}`;
    throw new Error(errorMessage);
  }

  const result = (await response.json()) as { payment?: ZkSendPaymentRecord };
  if (!result.payment) {
    throw new Error('Missing payment record in response');
  }
  return result.payment;
}

export async function createZkSendPaymentRecord(input: CreateZkSendPaymentInput): Promise<ZkSendPaymentRecord> {
  const response = await fetch(`${SUPABASE_FUNCTION_URL}/zksend/payments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${publicAnonKey}`,
    },
    body: JSON.stringify(input),
  });

  return handleResponse(response);
}

export async function markZkSendPaymentClaimed(input: ClaimZkSendPaymentInput): Promise<ZkSendPaymentRecord> {
  const response = await fetch(`${SUPABASE_FUNCTION_URL}/zksend/payments/${input.paymentId}/claim`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${publicAnonKey}`,
    },
    body: JSON.stringify(input),
  });

  return handleResponse(response);
}

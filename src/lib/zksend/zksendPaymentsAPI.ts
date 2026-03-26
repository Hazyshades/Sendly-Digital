import { getApiUrl } from '@/lib/supabase/client';
import { publicAnonKey } from '@/lib/supabase/info';
import { arcTestnet } from '@/lib/web3/wagmiConfig';
import { ZKSEND_CONTRACT_ADDRESS } from '@/lib/web3/constants';

/** Base URL for zkSEND Edge Function. Use .../v1 (no function name); code appends /zk-sender/payments. */
const SUPABASE_FUNCTION_URL =
  import.meta.env.VITE_SUPABASE_ZKSEND_FUNCTION_URL ||
  import.meta.env.VITE_SUPABASE_FUNCTION_URL ||
  getApiUrl();

/** Default chain ID and contract for zkSEND (used when caller does not pass them). */
const DEFAULT_CHAIN_ID = String(arcTestnet.id);
const DEFAULT_CONTRACT_ADDRESS = (ZKSEND_CONTRACT_ADDRESS || '').trim().toLowerCase();

export interface ZkSendPaymentRecord {
  id: string;
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
  created_at: string;
  tx_hash: string | null;
  claim_tx_hash: string | null;
  chain_id?: string;
  contract_address?: string;
}

export interface CreateZkSendPaymentInput {
  paymentId: string;
  senderAddress: string;
  recipientIdentityHash: string;
  platform: string;
  /** Recipient username (e.g. @alice or alice). Stored normalized + raw in DB. */
  recipientUsername?: string | null;
  /** Optional: exact string as entered by user for recipient_username_raw. */
  recipientUsernameRaw?: string | null;
  amount: string;
  currency: string;
  txHash?: string | null;
  /** Chain ID (default: Arc testnet id from config). Required by Edge Function. */
  chainId?: string | number | null;
  /** ZkSend contract address (default from env/constants). Required by Edge Function. */
  contractAddress?: string | null;
}

export interface ClaimZkSendPaymentInput {
  paymentId: string;
  senderAddress: string;
  recipientIdentityHash: string;
  platform: string;
  recipientUsername?: string | null;
  recipientUsernameRaw?: string | null;
  amount: string;
  currency: string;
  recipientWallet: string;
  txHash?: string | null;
  claimTxHash?: string | null;
  /** Chain ID (default: Arc testnet id from config). Required by Edge Function. */
  chainId?: string | number | null;
  /** ZkSend contract address (default from env/constants). Required by Edge Function. */
  contractAddress?: string | null;
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
  const chainId = input.chainId != null ? String(input.chainId).trim() : DEFAULT_CHAIN_ID;
  const contractAddress = (input.contractAddress ?? DEFAULT_CONTRACT_ADDRESS).toString().trim().toLowerCase();
  if (!chainId || !contractAddress) {
    throw new Error('chainId and contractAddress are required for zkSEND Edge Function');
  }
  const body = {
    ...input,
    chainId,
    contractAddress,
  };
  const response = await fetch(`${SUPABASE_FUNCTION_URL}/zk-sender/payments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${publicAnonKey}`,
    },
    body: JSON.stringify(body),
  });

  return handleResponse(response);
}

export async function markZkSendPaymentClaimed(input: ClaimZkSendPaymentInput): Promise<ZkSendPaymentRecord> {
  const chainId = input.chainId != null ? String(input.chainId).trim() : DEFAULT_CHAIN_ID;
  const contractAddress = (input.contractAddress ?? DEFAULT_CONTRACT_ADDRESS).toString().trim().toLowerCase();
  if (!chainId || !contractAddress) {
    throw new Error('chainId and contractAddress are required for zkSEND Edge Function');
  }
  const body = {
    ...input,
    chainId,
    contractAddress,
  };
  const response = await fetch(`${SUPABASE_FUNCTION_URL}/zk-sender/payments/${input.paymentId}/claim`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${publicAnonKey}`,
    },
    body: JSON.stringify(body),
  });

  return handleResponse(response);
}

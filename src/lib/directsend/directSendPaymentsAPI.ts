import { getApiUrl } from '@/lib/supabase/client';
import { publicAnonKey } from '@/lib/supabase/info';
import { arcTestnet } from '@/lib/web3/wagmiConfig';

/** Base URL for Supabase Edge Functions (same pattern as zksendPaymentsAPI). */
const SUPABASE_FUNCTION_URL =
  import.meta.env.VITE_SUPABASE_ZKSEND_FUNCTION_URL ||
  import.meta.env.VITE_SUPABASE_FUNCTION_URL ||
  getApiUrl();

const DEFAULT_CHAIN_ID = String(arcTestnet.id);

export interface DirectDepositRecord {
  id: string;
  deposit_id: string;
  sender_address: string;
  recipient_wallet: string;
  amount: string;
  currency: string;
  chain_id: string;
  contract_address: string;
  tx_hash: string | null;
  claimed: boolean;
  claim_tx_hash: string | null;
  created_at: string;
}

export interface CreateDirectDepositInput {
  depositId: string;
  senderAddress: string;
  recipientWallet: string;
  amount: string;
  currency: string;
  txHash?: string | null;
  chainId?: string | number | null;
  contractAddress: string;
}

export interface MarkDirectDepositClaimedInput {
  depositId: string;
  recipientWallet: string;
  claimTxHash?: string | null;
  chainId?: string | number | null;
  contractAddress: string;
}

async function handleResponse(response: Response): Promise<DirectDepositRecord> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    const errorMessage = (errorData as { error?: string }).error || `HTTP ${response.status}`;
    throw new Error(errorMessage);
  }

  const result = (await response.json()) as { deposit?: DirectDepositRecord };
  if (!result.deposit) {
    throw new Error('Missing deposit record in response');
  }
  return result.deposit;
}

/**
 * Upsert a DirectSend V2 deposit (requires Edge Function `direct-send/deposits` or compatible REST).
 */
export async function createDirectDepositRecord(input: CreateDirectDepositInput): Promise<DirectDepositRecord> {
  const chainId = input.chainId != null ? String(input.chainId).trim() : DEFAULT_CHAIN_ID;
  const contractAddress = input.contractAddress.toString().trim().toLowerCase();
  if (!chainId || !contractAddress) {
    throw new Error('chainId and contractAddress are required');
  }
  const body = {
    ...input,
    chainId,
    contractAddress,
  };
  const response = await fetch(`${SUPABASE_FUNCTION_URL}/direct-send/deposits`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${publicAnonKey}`,
    },
    body: JSON.stringify(body),
  });

  return handleResponse(response);
}

export async function markDirectDepositClaimed(input: MarkDirectDepositClaimedInput): Promise<DirectDepositRecord> {
  const chainId = input.chainId != null ? String(input.chainId).trim() : DEFAULT_CHAIN_ID;
  const contractAddress = input.contractAddress.toString().trim().toLowerCase();
  if (!chainId || !contractAddress) {
    throw new Error('chainId and contractAddress are required');
  }
  const body = {
    ...input,
    chainId,
    contractAddress,
  };
  const response = await fetch(`${SUPABASE_FUNCTION_URL}/direct-send/deposits/${input.depositId}/claim`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${publicAnonKey}`,
    },
    body: JSON.stringify(body),
  });

  return handleResponse(response);
}

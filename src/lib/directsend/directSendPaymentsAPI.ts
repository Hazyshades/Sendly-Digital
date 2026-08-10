import { edgeFetch, isEdgeFetchError } from '@/lib/supabase/client';
import { arcTestnet } from '@/lib/web3/wagmiConfig';

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

/**
 * Upsert a DirectSend V2 deposit (requires Edge Function `direct-send/deposits` or compatible REST).
 */
export async function createDirectDepositRecord(input: CreateDirectDepositInput): Promise<DirectDepositRecord> {
  const chainId = input.chainId != null ? String(input.chainId).trim() : DEFAULT_CHAIN_ID;
  const contractAddress = input.contractAddress.toString().trim().toLowerCase();
  if (!chainId || !contractAddress) {
    throw new Error('chainId and contractAddress are required');
  }
  const result = await edgeFetch<{ deposit?: DirectDepositRecord }>('direct-send', '/deposits', {
    method: 'POST',
    auth: 'anon',
    body: {
      ...input,
      chainId,
      contractAddress,
    },
  });
  if (!result.deposit) {
    throw new Error('Missing deposit record in response');
  }
  return result.deposit;
}

/**
 * List pending (unclaimed) deposits for a recipient from the Supabase index (GET).
 * Returns null if the route is missing (404) or errors - caller may fall back to RPC.
 */
export async function fetchDirectDepositsPendingForRecipient(params: {
  recipientWallet: string;
  chainId: string | number;
  contractAddress: string;
}): Promise<DirectDepositRecord[] | null> {
  const recipient = params.recipientWallet.toLowerCase();
  const chainId = String(params.chainId).trim();
  const contractAddress = params.contractAddress.toLowerCase();
  const q = new URLSearchParams({
    recipient_wallet: recipient,
    chain_id: chainId,
    contract_address: contractAddress,
    claimed: 'false',
  });
  try {
    const { ok, status, data } = await edgeFetch<{ deposits?: DirectDepositRecord[] } | DirectDepositRecord[]>(
      'direct-send',
      `/deposits?${q.toString()}`,
      {
        method: 'GET',
        auth: 'anon',
        headers: { Accept: 'application/json' },
        rawResponse: true,
      },
    );
    if (status === 404 || status === 501) {
      return null;
    }
    if (!ok) {
      console.warn('[directsend] GET /direct-send/deposits', status);
      return null;
    }
    if (Array.isArray(data)) {
      return data;
    }
    if (data && Array.isArray(data.deposits)) {
      return data.deposits;
    }
    return [];
  } catch (e) {
    if (isEdgeFetchError(e)) {
      console.warn('[directsend] GET /direct-send/deposits', e.status);
      return null;
    }
    console.warn('[directsend] fetchDirectDepositsPendingForRecipient', e);
    return null;
  }
}

export async function markDirectDepositClaimed(input: MarkDirectDepositClaimedInput): Promise<DirectDepositRecord> {
  const chainId = input.chainId != null ? String(input.chainId).trim() : DEFAULT_CHAIN_ID;
  const contractAddress = input.contractAddress.toString().trim().toLowerCase();
  if (!chainId || !contractAddress) {
    throw new Error('chainId and contractAddress are required');
  }
  const result = await edgeFetch<{ deposit?: DirectDepositRecord }>(
    'direct-send',
    `/deposits/${input.depositId}/claim`,
    {
      method: 'PATCH',
      auth: 'anon',
      body: {
        ...input,
        chainId,
        contractAddress,
      },
    },
  );
  if (!result.deposit) {
    throw new Error('Missing deposit record in response');
  }
  return result.deposit;
}

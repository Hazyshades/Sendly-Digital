import { edgeFetch } from '@/lib/supabase/client';
import { arcTestnet } from '@/lib/web3/wagmiConfig';
import { ZKSEND_CONTRACT_ADDRESS } from '@/lib/web3/constants';
import type { ZkSendPaymentRecord } from '@/types/zksend';

export type { ZkSendPaymentRecord };

/** Default chain ID and contract for zkSEND (used when caller does not pass them). */
const DEFAULT_CHAIN_ID = String(arcTestnet.id);
const DEFAULT_CONTRACT_ADDRESS = (ZKSEND_CONTRACT_ADDRESS || '').trim().toLowerCase();

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

export async function createZkSendPaymentRecord(input: CreateZkSendPaymentInput): Promise<ZkSendPaymentRecord> {
  const chainId = input.chainId != null ? String(input.chainId).trim() : DEFAULT_CHAIN_ID;
  const contractAddress = (input.contractAddress ?? DEFAULT_CONTRACT_ADDRESS).toString().trim().toLowerCase();
  if (!chainId || !contractAddress) {
    throw new Error('chainId and contractAddress are required for zkSEND Edge Function');
  }
  const result = await edgeFetch<{ payment?: ZkSendPaymentRecord }>('zk-sender', '/payments', {
    method: 'POST',
    auth: 'anon',
    body: {
      ...input,
      chainId,
      contractAddress,
    },
  });
  if (!result.payment) {
    throw new Error('Missing payment record in response');
  }
  return result.payment;
}

export async function markZkSendPaymentClaimed(input: ClaimZkSendPaymentInput): Promise<ZkSendPaymentRecord> {
  const chainId = input.chainId != null ? String(input.chainId).trim() : DEFAULT_CHAIN_ID;
  const contractAddress = (input.contractAddress ?? DEFAULT_CONTRACT_ADDRESS).toString().trim().toLowerCase();
  if (!chainId || !contractAddress) {
    throw new Error('chainId and contractAddress are required for zkSEND Edge Function');
  }
  const result = await edgeFetch<{ payment?: ZkSendPaymentRecord }>(
    'zk-sender',
    `/payments/${input.paymentId}/claim`,
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
  if (!result.payment) {
    throw new Error('Missing payment record in response');
  }
  return result.payment;
}

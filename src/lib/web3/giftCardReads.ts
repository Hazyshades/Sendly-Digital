import type { Abi } from 'viem';

import { GiftCardABI } from '@/lib/web3/constants';
import type { WalletExecutor } from '@/lib/web3/walletExecutor';

/** Fragment kept in one place — not present on exported GiftCardABI. */
const GET_GIFT_CARD_CREATOR_ABI = [
  {
    inputs: [{ internalType: 'uint256', name: 'tokenId', type: 'uint256' }],
    name: 'getGiftCardCreator',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const satisfies Abi;

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

export type GiftCardReadResult = {
  amount: string;
  token: string;
  redeemed: boolean;
  message: string;
  owner: string;
  creator: string;
};

/**
 * Unified gift-card view reads through a WalletExecutor (browser or internal).
 */
export async function readGiftCard(
  tokenId: string,
  executor: WalletExecutor,
  contractAddress: string,
): Promise<GiftCardReadResult | null> {
  const address = contractAddress as `0x${string}`;
  const tokenIdArg = BigInt(tokenId);

  try {
    const [info, owner, creator] = await Promise.all([
      executor.read<{
        amount: bigint;
        token: string;
        redeemed: boolean;
        message: string;
      }>({
        address,
        abi: GiftCardABI as Abi,
        functionName: 'getGiftCardInfo',
        args: [tokenIdArg],
      }),
      executor.read<string>({
        address,
        abi: GiftCardABI as Abi,
        functionName: 'ownerOf',
        args: [tokenIdArg],
      }),
      executor
        .read<string>({
          address,
          abi: GET_GIFT_CARD_CREATOR_ABI,
          functionName: 'getGiftCardCreator',
          args: [tokenIdArg],
        })
        .catch(() => ZERO_ADDRESS),
    ]);

    if (!info) {
      return null;
    }

    return {
      amount: info.amount.toString(),
      token: info.token,
      redeemed: Boolean(info.redeemed),
      message: info.message || '',
      owner,
      creator:
        creator && creator !== ZERO_ADDRESS ? creator : ZERO_ADDRESS,
    };
  } catch {
    // Missing tokens revert on getGiftCardInfo / ownerOf — treat as not found.
    return null;
  }
}

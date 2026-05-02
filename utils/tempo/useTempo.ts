import { useAccount, useChainId, usePublicClient, useWalletClient } from 'wagmi';
import { tempoTestnet } from './client';
import { TEMPO_CONTRACTS } from './client';
import { formatEther } from 'viem';

export function useTempo() {
  const { address } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const isTempoNetwork = chainId === tempoTestnet.id;

  // Get token balance
  const getTokenBalance = async (tokenAddress: string) => {
    if (!address || !isTempoNetwork || !publicClient) return null;

    try {
      const balance = await publicClient.readContract({
        address: tokenAddress as `0x${string}`,
        abi: [
          {
            constant: true,
            inputs: [{ name: 'owner', type: 'address' }],
            name: 'balanceOf',
            outputs: [{ name: '', type: 'uint256' }],
            type: 'function',
          },
        ],
        functionName: 'balanceOf',
        args: [address],
      }) as bigint;

      return formatEther(balance);
    } catch (error) {
      console.error('Failed to fetch token balance:', error);
      return null;
    }
  };

  // Send a transaction (Tempo may support fee token extensions)
  const sendTempoTransaction = async (
    to: string,
    data: `0x${string}`,
    _feeToken?: string
  ) => {
    if (!walletClient || !isTempoNetwork) {
      throw new Error('Wallet is not connected or wrong network selected');
    }

    try {
      const hash = await walletClient.sendTransaction({
        to: to as `0x${string}`,
        data,
        // Tempo Transactions may support extended fee token parameters.
        // feeToken is expected to be handled by Viem when/if supported.
      });

      return hash;
    } catch (error) {
      console.error('Failed to send transaction:', error);
      throw error;
    }
  };

  return {
    isTempoNetwork,
    getTokenBalance,
    sendTempoTransaction,
    contracts: TEMPO_CONTRACTS,
  };
}

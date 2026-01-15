import { useAccount, useChainId, usePublicClient, useWalletClient } from 'wagmi';
import { tempoTestnet } from './client';
import { TEMPO_CONTRACTS } from './client';
import { formatEther } from 'viem';

export function useTempo() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const isTempoNetwork = chainId === tempoTestnet.id;

  // Получение баланса токена
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
      });

      return formatEther(balance);
    } catch (error) {
      console.error('Ошибка при получении баланса:', error);
      return null;
    }
  };

  // Отправка транзакции с указанием fee token
  const sendTempoTransaction = async (
    to: string,
    data: `0x${string}`,
    feeToken?: string
  ) => {
    if (!walletClient || !isTempoNetwork) {
      throw new Error('Кошелек не подключен или неверная сеть');
    }

    try {
      const hash = await walletClient.sendTransaction({
        to: to as `0x${string}`,
        data,
        // Для Tempo Transactions используем расширенные параметры
        // feeToken будет обработан автоматически через Viem
      });

      return hash;
    } catch (error) {
      console.error('Ошибка при отправке транзакции:', error);
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

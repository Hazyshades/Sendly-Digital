import { useWalletClient } from 'wagmi';
import { useChain } from '@/contexts/ChainContext';
import { chains } from '@/lib/web3/wagmiConfig';
import web3Service from '@/lib/web3/web3Service';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

const CHAIN_LABELS: Record<number, string> = {
  5042002: 'Arc Testnet',
  43113: 'Avalanche Fuji',
};

export function ChainSwitcher() {
  const { activeChainId, switchChain } = useChain();
  const { data: walletClient } = useWalletClient();

  const handleValueChange = async (value: string) => {
    const chainId = parseInt(value, 10);
    if (Number.isNaN(chainId)) return;

    switchChain(chainId);
    web3Service.setChainId(chainId);

    if (walletClient) {
      try {
        await walletClient.switchChain({ id: chainId });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        if (
          (err as { code?: number })?.code === 4902 ||
          message.includes('Unrecognized chain')
        ) {
          const chain = chains.find((c) => c.id === chainId);
          if (chain) {
            try {
              await walletClient.addChain({ chain });
              await walletClient.switchChain({ id: chainId });
            } catch (addErr) {
              toast.error('Failed to add network');
              console.error(addErr);
            }
          }
        } else {
          toast.error('Failed to switch network');
          console.error(err);
        }
      }
    }
  };

  return (
    <Select
      value={String(activeChainId)}
      onValueChange={handleValueChange}
    >
      <SelectTrigger className="w-[180px]" size="sm">
        <SelectValue placeholder="Network">
          {CHAIN_LABELS[activeChainId] ?? `Chain ${activeChainId}`}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {chains.map((chain) => (
          <SelectItem key={chain.id} value={String(chain.id)}>
            {CHAIN_LABELS[chain.id] ?? chain.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

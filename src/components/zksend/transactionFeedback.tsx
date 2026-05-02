import { getExplorerTxUrl } from '@/lib/web3/constants';

export const ZKSEND_SUCCESS_COPY = {
  paymentCreated: 'Payment created successfully!',
  paymentClaimed: 'Payment claimed. View transaction',
  paymentsClaimed: 'All payments claimed. View transaction',
  depositClaimed: 'Deposit claimed. View transaction',
} as const;

export function shortenTxHash(txHash: string, start = 10, end = 8): string {
  if (!txHash) return '';
  if (txHash.length <= start + end + 3) return txHash;
  return `${txHash.slice(0, start)}...${txHash.slice(-end)}`;
}

export function renderTransactionLink(chainId: number, txHash: string) {
  return (
    <a
      href={getExplorerTxUrl(chainId, txHash)}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer transition-colors"
      title={`View on Explorer: ${txHash}`}
    >
      {shortenTxHash(txHash)}
    </a>
  );
}

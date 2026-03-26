import { useAccount } from 'wagmi';

/**
 * Toggle for choosing wallet source: external (browser) or Circle (internal).
 * Styled like the Sent/Received toggle in TransactionHistory.
 * External label shows the currently connected wallet name (e.g. Rabby, MetaMask).
 */
export type WalletSource = 'external' | 'circle';

function getExternalWalletLabel(connector: { name?: string } | undefined, isConnected: boolean): string {
  if (!isConnected) return 'Browser wallet';
  if (connector?.name) {
    const n = connector.name.toLowerCase();
    if (n.includes('rabby')) return 'Rabby Wallet';
    if (n.includes('metamask')) return 'MetaMask';
    if (n.includes('coinbase')) return 'Coinbase Wallet';
    if (n.includes('rainbow')) return 'Rainbow Wallet';
    if (n.includes('trust')) return 'Trust Wallet';
    return connector.name;
  }
  if (typeof window !== 'undefined' && (window as any).ethereum) {
    const e = (window as any).ethereum;
    if (e.isRabby === true) return 'Rabby Wallet';
    if (e.isMetaMask === true) return 'MetaMask';
  }
  return 'Browser wallet';
}

type Props = {
  value: WalletSource;
  onChange: (value: WalletSource) => void;
  hasCircleWallet: boolean;
  disabled?: boolean;
  /** Compact variant for tight layouts (e.g. next to balance). */
  compact?: boolean;
};

export function WalletSourceToggle({
  value,
  onChange,
  hasCircleWallet,
  disabled = false,
  compact = false,
}: Props) {
  const { isConnected, connector } = useAccount();
  const externalLabel = getExternalWalletLabel(connector, isConnected);

  return (
    <div
      className={`flex rounded-lg bg-slate-200/80 dark:bg-slate-700/80 p-0.5 ${compact ? 'shrink-0' : ''}`}
      role="group"
      aria-label="Wallet source"
    >
      <button
        type="button"
        onClick={() => onChange('external')}
        disabled={disabled}
        className={`${compact ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'} font-medium rounded-md transition-all ${
          value === 'external'
            ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-400 shadow-sm'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {externalLabel}
      </button>
      <button
        type="button"
        onClick={() => hasCircleWallet && onChange('circle')}
        disabled={disabled || !hasCircleWallet}
        className={`${compact ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'} font-medium rounded-md transition-all ${
          value === 'circle'
            ? 'bg-white dark:bg-slate-600 text-purple-600 dark:text-purple-400 shadow-sm'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        Internal Wallet
      </button>
    </div>
  );
}

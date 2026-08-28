type PaymentsConnectWalletPreviewProps = {
  compact?: boolean;
};

/** Matches the Connect Wallet control on zk.sendly.digital/payments. */
export function PaymentsConnectWalletPreview({ compact }: PaymentsConnectWalletPreviewProps) {
  return (
    <div className={`pointer-events-none select-none flex items-center justify-center ${compact ? 'p-4' : 'p-8'}`}>
      <div
        className={`rounded-xl bg-[#0E76FD] text-white font-semibold shadow-sm border border-white/40 ${
          compact ? 'px-4 py-2.5 text-sm' : 'px-5 py-3 text-base'
        }`}
      >
        Connect Wallet
      </div>
    </div>
  );
}

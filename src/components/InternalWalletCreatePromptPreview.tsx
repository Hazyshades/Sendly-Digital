import { Wallet } from 'lucide-react';

type InternalWalletCreatePromptPreviewProps = {
  compact?: boolean;
};

export function InternalWalletCreatePromptPreview({ compact = false }: InternalWalletCreatePromptPreviewProps) {
  return (
    <div className={`${compact ? 'p-2' : 'p-5'} pointer-events-none select-none`}>
      <div className="rounded-[30px] border border-[#d8dde6] bg-[#f8f9fb] p-3 sm:p-4">
        <div className="rounded-[26px] border border-gray-200 bg-white px-4 py-4 shadow-sm sm:px-5 sm:py-5">
          <div className="mb-3 flex items-center gap-2">
            <Wallet className="h-5 w-5 text-gray-700" />
            <h3 className="text-[16px] font-medium text-gray-700">Internal Wallet</h3>
          </div>

          <p className="text-sm text-gray-600">
            Create an Internal Wallet to use the platform seamlessly.
          </p>

        

          <div className="mt-4 rounded-full bg-[#0b1736] px-4 py-2.5 text-center text-[12px] font-semibold text-white">
            Create wallet
          </div>

          {!compact && (
            <p className="mt-3 text-center text-sm text-gray-500">
              The wallet will be created on Arc Testnet blockchain and linked to your EVM address
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

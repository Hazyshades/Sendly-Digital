import { ChevronUp, Coins, Copy, ExternalLink, Send, Wallet } from 'lucide-react';

type InternalWalletDashboardPreviewProps = {
  compact?: boolean;
};

export function InternalWalletDashboardPreview({ compact = false }: InternalWalletDashboardPreviewProps) {
  return (
    <div className={`${compact ? 'p-2' : 'p-5'} pointer-events-none select-none`}>
      <div className="rounded-[30px] border border-[#d8dde6] bg-[#f8f9fb] p-3 sm:p-4">
        <div className="rounded-[26px] border border-gray-200 bg-white px-4 py-4 shadow-sm sm:px-5 sm:py-5">
          <div className="mb-4 flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-xl border border-green-100 bg-green-50 p-2">
                <Wallet className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h3 className="text-[18px] font-semibold leading-tight text-gray-800">Internal Wallet</h3>

              </div>
            </div>
            <div className="rounded-full border border-gray-200 bg-white p-2 shadow-sm">
              <ChevronUp className="h-4 w-4 text-gray-700" />
            </div>
          </div>

          <div className="mb-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-gray-700">Wallet Address</p>
              <div className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-medium text-gray-700 shadow-sm">
                <Copy className="h-3.5 w-3.5" />
                Copy
              </div>
            </div>
            <div className="rounded-[20px] border border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100/60 px-3 py-3 font-mono text-[11px] text-gray-600 whitespace-nowrap overflow-hidden text-ellipsis">
              0x23a158558a8d9c5ef41d9171a6dc601a2dbe0095
            </div>
          </div>

          <div className="my-4 h-px bg-gray-200" />

          <div className="mb-4 space-y-2.5">
            <p className="text-xs font-medium text-gray-700">Balance</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-[20px] border border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100/50 p-3">
                <div className="mb-1 flex items-center justify-between">
                  <p className="text-[11px] font-medium text-blue-700">USDC</p>
                  <Coins className="h-3.5 w-3.5 text-blue-600" />
                </div>
                <p className="text-[10px] font-semibold leading-none text-blue-900">20.923177</p>
              </div>
              <div className="rounded-[20px] border border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100/50 p-3">
                <div className="mb-1 flex items-center justify-between">
                  <p className="text-[11px] font-medium text-purple-700">EURC</p>
                  <Coins className="h-3.5 w-3.5 text-purple-600" />
                </div>
                <p className="text-[10px] font-semibold leading-none text-purple-900">20</p>
              </div>
            </div>
          </div>

          <div className="my-4 h-px bg-gray-200" />

          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            <div className="space-y-1">
              <p className="text-xs font-medium text-gray-700">Blockchain</p>
              <span className="inline-flex rounded-full border border-gray-300 bg-white px-2.5 py-0.5 text-[11px] text-gray-700">
                Arc Testnet
              </span>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-gray-700">Account type</p>
              <span className="inline-flex rounded-full border border-gray-300 bg-white px-2.5 py-0.5 text-[11px] text-gray-700">
                EOA
              </span>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-gray-700">Status</p>
              <span className="inline-flex rounded-full bg-[#0f172a] px-2.5 py-0.5 text-[11px] text-white">
                Active
              </span>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-gray-700">Created</p>
              <p className="text-[12px] font-medium text-gray-800">Feb 19, 2026</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-gray-700">Source</p>
              <span className="inline-flex rounded-full border border-gray-300 bg-white px-2.5 py-0.5 text-[11px] text-gray-700">
                MetaMask
              </span>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-gray-700">Telegram</p>
              <span className="inline-flex rounded-full border border-gray-300 bg-white px-2.5 py-0.5 text-[11px] text-gray-700">
                Not linked
              </span>
            </div>
          </div>

          <div className="my-4 h-px bg-gray-200" />

          <div className="grid grid-cols-2 gap-2">
            <div className="inline-flex items-center justify-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-2 text-[12px] font-medium text-gray-700">
              <ExternalLink className="h-4 w-4" />
              Explorer
            </div>
            <div className="inline-flex items-center justify-center gap-2 rounded-full bg-[#818898] px-4 py-2 text-[12px] font-medium text-white">
              <Send className="h-4 w-4" />
              Link
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

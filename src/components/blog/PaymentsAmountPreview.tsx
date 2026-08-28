import { Check, ChevronDown, Wallet } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type PaymentsAmountPreviewProps = {
  compact?: boolean;
};

/**
 * Amount + token + wallet-source strip from zk Payments Send form.
 * Shared by "Enter amount & token" and "Choose source of sending" steps.
 */
export function PaymentsAmountPreview({ compact }: PaymentsAmountPreviewProps) {
  return (
    <div className={`pointer-events-none select-none space-y-3 ${compact ? 'p-3' : 'p-5'}`}>
      <div className="flex items-center justify-between gap-2">
        <Label className={compact ? 'text-xs text-gray-700' : 'text-sm text-gray-700'}>Amount</Label>
        <div className="flex items-center gap-1.5">
          <div
            className={`flex rounded-lg bg-slate-200/80 p-0.5 ${compact ? 'text-[9px]' : 'text-[10px]'}`}
            role="group"
            aria-label="Wallet source"
          >
            <span className={`rounded-md px-2 py-0.5 font-medium text-slate-500 ${compact ? 'px-1.5' : ''}`}>
              Rabby Wallet
            </span>
            <span className={`rounded-md bg-white px-2 py-0.5 font-medium text-purple-600 shadow-sm ${compact ? 'px-1.5' : ''}`}>
              Internal Wallet
            </span>
          </div>
          <div
            className={`flex items-center gap-1 text-muted-foreground ${
              compact ? 'text-[10px]' : 'text-xs'
            }`}
          >
            <Wallet className={compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} aria-hidden />
            <span>102.169213</span>
          </div>
        </div>
      </div>

      <div className={`relative flex gap-2 ${compact ? 'mb-14' : 'mb-16'}`}>
        <Input readOnly value="100" tabIndex={-1} className="flex-1" aria-label="Amount" />
        <div
          className="relative w-[108px] flex h-9 items-center justify-between rounded-md border border-input bg-transparent px-3 text-sm"
          aria-label="Token"
        >
          <span>USDC</span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </div>

        <div
          className={`absolute right-0 top-full z-10 mt-1 w-[108px] rounded-md border border-gray-200 bg-white shadow-md overflow-hidden ${
            compact ? 'text-xs' : 'text-sm'
          }`}
        >
          <div className="flex items-center justify-between px-3 py-2 bg-muted/40">
            <span>USDC</span>
            <Check className="h-3.5 w-3.5 text-gray-700" />
          </div>
          <div className="px-3 py-2 text-gray-700">EURC</div>
        </div>
      </div>

      <div className="pt-1">
        <Label className={compact ? 'text-xs text-gray-700' : 'text-sm text-gray-700'}>To</Label>
        <Input
          readOnly
          value=""
          placeholder="@username"
          tabIndex={-1}
          className="mt-2"
          aria-label="Recipient"
        />
      </div>
    </div>
  );
}

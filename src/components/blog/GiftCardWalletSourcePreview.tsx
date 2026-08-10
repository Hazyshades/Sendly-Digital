import { Wallet } from 'lucide-react';

import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

type GiftCardWalletSourcePreviewProps = {
  compact?: boolean;
};

export function GiftCardWalletSourcePreview({ compact }: GiftCardWalletSourcePreviewProps) {
  const walletSource = 'external';
  const rabbyAddress = '0xd0Cc…9584';
  const internalAddress = '0x2eab…5a0b';

  return (
    <div className={`pointer-events-none select-none ${compact ? 'p-3' : 'p-5'}`}>
      <Label className={compact ? 'text-xs text-gray-700' : 'text-sm text-gray-700'}>Wallet source</Label>
      <RadioGroup
        value={walletSource}
        className={`mt-2 space-y-2 rounded-lg border border-gray-200 bg-gray-50/50 ${
          compact ? 'p-2' : 'p-3'
        }`}
      >
        <div className="flex items-center space-x-3 rounded-md border border-gray-300 bg-white p-2.5 shadow-sm">
          <RadioGroupItem value="external" id="blog-wallet-rabby" className="mt-0" />
          <div className="flex min-w-0 flex-1 items-center space-x-2.5">
            <Wallet className={`${compact ? 'h-4 w-4' : 'h-5 w-5'} shrink-0 text-blue-600`} />
            <Label htmlFor="blog-wallet-rabby" className={`truncate font-normal ${compact ? 'text-xs' : 'text-sm'}`}>
              Rabby Wallet ({rabbyAddress})
            </Label>
          </div>
        </div>
        <div className="flex items-center space-x-3 rounded-md p-2.5 hover:bg-white/60">
          <RadioGroupItem value="circle" id="blog-wallet-internal" className="mt-0" />
          <div className="flex min-w-0 flex-1 items-center space-x-2.5">
            <Wallet className={`${compact ? 'h-4 w-4' : 'h-5 w-5'} shrink-0 text-purple-600`} />
            <Label htmlFor="blog-wallet-internal" className={`truncate font-normal ${compact ? 'text-xs' : 'text-sm'}`}>
              Internal Wallet ({internalAddress})
            </Label>
          </div>
        </div>
      </RadioGroup>
    </div>
  );
}

import { RefreshCw } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TwitterIcon } from '@/components/blog/giftCardPreviewIcons';

type PaymentsPendingPreviewProps = {
  compact?: boolean;
};

const PENDING = [
  { id: '1842', amount: '100', token: 'USDC', from: '0x6d4c…e9Ca' },
  { id: '1831', amount: '25', token: 'USDC', from: '0x82f6…18cf' },
] as const;

export function PaymentsPendingPreview({ compact }: PaymentsPendingPreviewProps) {
  const rows = compact ? PENDING.slice(0, 1) : PENDING;

  return (
    <div className={`pointer-events-none select-none space-y-2.5 ${compact ? 'p-2.5' : 'p-4'}`}>
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className={`font-semibold text-gray-900 ${compact ? 'text-xs' : 'text-sm'}`}>
            Pending payments
          </div>
          <div className={`text-gray-500 ${compact ? 'text-[10px]' : 'text-xs'}`}>
            for @circle on X
          </div>
        </div>
        <Button variant="outline" size="sm" className={compact ? 'h-7 text-[10px] px-2' : ''} tabIndex={-1}>
          <RefreshCw className={`${compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} mr-1`} />
          Refresh
        </Button>
      </div>

      <div className="space-y-2">
        {rows.map((row) => (
          <div
            key={row.id}
            className={`rounded-xl border border-gray-200 bg-white ${compact ? 'p-2.5' : 'p-3'}`}
          >
            <div className="flex items-center gap-1.5 mb-1.5">
              <Badge
                variant="outline"
                className={`bg-amber-50 text-amber-700 border-amber-200 ${
                  compact ? 'text-[9px] px-1.5 py-0' : 'text-[10px]'
                }`}
              >
                Pending
              </Badge>
              <Badge
                variant="outline"
                className={`bg-blue-50 text-blue-700 border-blue-200 gap-0.5 ${
                  compact ? 'text-[9px] px-1.5 py-0' : 'text-[10px]'
                }`}
              >
                <TwitterIcon className={compact ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
                X
              </Badge>
            </div>
            <div className={`font-bold text-gray-900 ${compact ? 'text-base' : 'text-lg'}`}>
              {row.amount}{' '}
              <span className={`font-medium text-gray-500 ${compact ? 'text-xs' : 'text-sm'}`}>
                {row.token}
              </span>
            </div>
            <div className={`text-gray-500 ${compact ? 'text-[10px]' : 'text-xs'}`}>
              from {row.from}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

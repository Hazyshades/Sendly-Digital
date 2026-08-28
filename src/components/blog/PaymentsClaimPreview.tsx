import { Button } from '@/components/ui/button';
import { TwitterIcon } from '@/components/blog/giftCardPreviewIcons';

type PaymentsClaimPreviewProps = {
  compact?: boolean;
};

const ROWS = [
  { id: '1842', amount: '100', token: 'USDC', from: '0x6d4c…e9Ca' },
  { id: '1831', amount: '25', token: 'USDC', from: '0x82f6…18cf' },
  { id: '1799', amount: '10', token: 'EURC', from: '0x6d4c…e9Ca' },
] as const;

export function PaymentsClaimPreview({ compact }: PaymentsClaimPreviewProps) {
  const rows = compact ? ROWS.slice(0, 2) : ROWS;

  return (
    <div className={`pointer-events-none select-none space-y-2.5 ${compact ? 'p-2.5' : 'p-4'}`}>
      <Button className={`w-full ${compact ? 'h-8 text-xs' : ''}`} tabIndex={-1}>
        Claim all ({ROWS.length} payments)
      </Button>

      <div className="space-y-2">
        {rows.map((row) => (
          <div
            key={row.id}
            className={`flex items-center justify-between gap-2 rounded-xl border border-gray-200 bg-white ${
              compact ? 'p-2.5' : 'p-3'
            }`}
          >
            <div className="min-w-0">
              <div className={`flex items-center gap-1 font-semibold text-gray-900 ${compact ? 'text-sm' : 'text-base'}`}>
                {row.amount} {row.token}
                <TwitterIcon className={`shrink-0 text-gray-400 ${compact ? 'h-3 w-3' : 'h-3.5 w-3.5'}`} />
              </div>
              <div className={`truncate text-gray-500 ${compact ? 'text-[10px]' : 'text-xs'}`}>
                from {row.from}
              </div>
            </div>
            <Button variant="secondary" size="sm" className={compact ? 'h-7 text-[10px] px-2' : ''} tabIndex={-1}>
              Claim
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

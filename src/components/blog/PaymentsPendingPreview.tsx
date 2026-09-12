import { Button } from '@/components/ui/button';

type PaymentsPendingPreviewProps = {
  compact?: boolean;
};

/** Receive status strip: connected identity hint + Refresh. */
export function PaymentsPendingPreview({ compact }: PaymentsPendingPreviewProps) {
  return (
    <div className={`pointer-events-none select-none space-y-3 ${compact ? 'p-3' : 'p-5'}`}>
      <div className="flex items-center justify-between gap-2">
        <div className={`font-semibold text-gray-900 ${compact ? 'text-sm' : 'text-base'}`}>
          Receive
        </div>
        <span
          className={`rounded-full border border-purple-200 bg-purple-50 font-medium text-purple-700 ${
            compact ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'
          }`}
        >
          Internal Wallet
        </span>
      </div>

      <p
        className={`rounded-xl border border-dashed border-gray-200 bg-gray-50/80 text-muted-foreground ${
          compact ? 'px-3 py-2.5 text-[11px] leading-relaxed' : 'px-3.5 py-3 text-sm leading-relaxed'
        }`}
      >
        Twitter / X connected as @circle. Pending payments load automatically.
      </p>

      <Button
        type="button"
        variant="outline"
        tabIndex={-1}
        className={compact ? 'h-8 text-xs' : ''}
      >
        Refresh
      </Button>
    </div>
  );
}

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type GiftCardAmountPreviewProps = {
  compact?: boolean;
};

export function GiftCardAmountPreview({ compact }: GiftCardAmountPreviewProps) {
  return (
    <div className={`pointer-events-none select-none space-y-3 ${compact ? 'p-3' : 'p-5'}`}>
      <div>
        <Label className={compact ? 'text-xs text-gray-700' : 'text-sm text-gray-700'} htmlFor="blog-amount-username">
          Twitter username
        </Label>
        <Input
          id="blog-amount-username"
          readOnly
          value="sama"
          className="mt-2"
          tabIndex={-1}
        />
      </div>

      <div>
        <Label className={compact ? 'text-xs text-gray-700' : 'text-sm text-gray-700'} htmlFor="blog-amount-value">
          Amount (in $)
        </Label>
        <Input
          id="blog-amount-value"
          readOnly
          value="100"
          className="mt-2"
          tabIndex={-1}
        />
      </div>
    </div>
  );
}

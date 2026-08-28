import { CheckCircle2 } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TwitterIcon } from '@/components/blog/giftCardPreviewIcons';

type PaymentsIdentityPreviewProps = {
  compact?: boolean;
};

export function PaymentsIdentityPreview({ compact }: PaymentsIdentityPreviewProps) {
  return (
    <div className={`pointer-events-none select-none space-y-3 ${compact ? 'p-3' : 'p-5'}`}>
      <div className="flex items-center gap-1.5 text-emerald-600">
        <CheckCircle2 className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
        <span className={`font-medium ${compact ? 'text-[10px]' : 'text-xs'}`}>Connected</span>
      </div>

      <div>
        <Label className={compact ? 'text-xs text-gray-700' : 'text-sm text-gray-700'}>
          Platform
        </Label>
        <div
          className={`mt-2 inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white shadow-sm font-medium text-gray-900 ${
            compact ? 'px-2.5 py-1.5 text-[10px]' : 'px-3 py-2 text-xs'
          }`}
        >
          <TwitterIcon className={compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
          X (Twitter)
        </div>
      </div>

      <div>
        <Label
          className={compact ? 'text-xs text-gray-700' : 'text-sm text-gray-700'}
          htmlFor="blog-payments-identity"
        >
          Username
        </Label>
        <Input
          id="blog-payments-identity"
          readOnly
          value="circle"
          className="mt-2"
          tabIndex={-1}
        />
      </div>
    </div>
  );
}

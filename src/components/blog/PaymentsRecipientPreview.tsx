import { CheckCircle2, ChevronDown, X } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TwitterIcon } from '@/components/blog/giftCardPreviewIcons';

type PaymentsRecipientPreviewProps = {
  compact?: boolean;
  /** Twitter/Supabase avatar URL — same source as Send tab preview. */
  profileImageUrl?: string | null;
};

/** Recipient "To" field with platform picker + suggestion, from zk Payments Send. */
export function PaymentsRecipientPreview({
  compact,
  profileImageUrl,
}: PaymentsRecipientPreviewProps) {
  const avatarSrc = profileImageUrl || '/circle-avatar.svg';

  return (
    <div className={`pointer-events-none select-none space-y-2 ${compact ? 'p-3' : 'p-5'}`}>
      <Label className={compact ? 'text-xs text-gray-700' : 'text-sm text-gray-700'}>To</Label>

      <div className="relative flex items-center gap-1.5">
        <div className="relative flex-1">
          <Input
            readOnly
            value="Circle"
            tabIndex={-1}
            className="pr-8"
            aria-label="Recipient"
          />
          <X
            className={`absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 ${
              compact ? 'h-3.5 w-3.5' : 'h-4 w-4'
            }`}
          />
        </div>
        <div
          className={`flex shrink-0 items-center gap-1 rounded-full border border-input bg-white ${
            compact ? 'h-9 px-2' : 'h-9 px-2.5'
          }`}
          aria-label="Platform"
        >
          <TwitterIcon className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
          <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
        </div>
      </div>

      <div
        className={`flex items-center gap-2 rounded-xl bg-sky-50 border border-sky-100 ${
          compact ? 'px-2.5 py-2' : 'px-3 py-2.5'
        }`}
      >
        <img
          src={avatarSrc}
          alt=""
          className={`shrink-0 rounded-full object-cover bg-gray-100 ${
            compact ? 'h-7 w-7' : 'h-8 w-8'
          }`}
        />
        <div className={`min-w-0 flex-1 ${compact ? 'text-xs' : 'text-sm'}`}>
          <span className="font-medium text-gray-900 underline decoration-muted-foreground/50 underline-offset-2">
            Circle
          </span>{' '}
          <span className="text-gray-500">@circle</span>
        </div>
        <CheckCircle2 className={`shrink-0 text-sky-500 ${compact ? 'h-4 w-4' : 'h-5 w-5'}`} />
      </div>
    </div>
  );
}

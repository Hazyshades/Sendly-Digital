import { Wallet } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { TelegramIcon, TwitchIcon, TwitterIcon } from '@/components/blog/giftCardPreviewIcons';

type GiftCardRecipientTypePreviewProps = {
  compact?: boolean;
};

const RECIPIENT_OPTIONS = [
  { value: 'address', label: 'Wallet address', icon: <Wallet className="w-4 h-4" />, color: 'text-blue-600' },
  { value: 'twitter', label: 'Twitter', icon: <TwitterIcon className="w-4 h-4" />, color: 'text-gray-900' },
  { value: 'twitch', label: 'Twitch', icon: <TwitchIcon className="w-4 h-4" />, color: 'text-purple-600' },
  { value: 'telegram', label: 'Telegram', icon: <TelegramIcon className="w-4 h-4" />, color: 'text-sky-500' },
] as const;

export function GiftCardRecipientTypePreview({ compact }: GiftCardRecipientTypePreviewProps) {
  return (
    <div className={`pointer-events-none select-none space-y-3 ${compact ? 'p-3' : 'p-5'}`}>
      <div>
        <Label className={compact ? 'text-xs text-gray-700' : 'text-sm text-gray-700'}>Recipient type</Label>
        <RadioGroup
          value="twitter"
          className={`mt-2 space-y-2 rounded-lg border border-gray-200 bg-gray-50/50 ${
            compact ? 'p-2' : 'p-3'
          }`}
        >
          {RECIPIENT_OPTIONS.map((opt) => (
            <div
              key={opt.value}
              className={`flex items-center space-x-3 rounded-md p-2.5 ${
                opt.value === 'twitter'
                  ? 'border border-gray-300 bg-white shadow-sm'
                  : 'hover:bg-white/60'
              }`}
            >
              <RadioGroupItem value={opt.value} id={`blog-recipient-${opt.value}`} className="mt-0" />
              <div className={`shrink-0 ${opt.color}`}>{opt.icon}</div>
              <Label
                htmlFor={`blog-recipient-${opt.value}`}
                className={`font-normal ${compact ? 'text-xs' : 'text-sm'}`}
              >
                {opt.label}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      <div>
        <Label className={compact ? 'text-xs text-gray-700' : 'text-sm text-gray-700'} htmlFor="blog-recipient-username">
          Twitter username
        </Label>
        <Input
          id="blog-recipient-username"
          readOnly
          value="sama"
          className="mt-2"
          tabIndex={-1}
        />
      </div>
    </div>
  );
}

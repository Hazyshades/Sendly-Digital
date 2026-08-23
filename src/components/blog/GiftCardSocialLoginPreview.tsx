import { X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { TelegramIcon, TwitchIcon, TwitterIcon } from '@/components/blog/giftCardPreviewIcons';

type GiftCardSocialLoginPreviewProps = {
  compact?: boolean;
};

const PLATFORMS = [
  {
    id: 'twitter',
    label: 'Twitter / X',
    icon: <TwitterIcon className="h-4 w-4 text-white" />,
    bg: 'bg-black',
  },
  {
    id: 'twitch',
    label: 'Twitch',
    icon: <TwitchIcon className="h-4 w-4 text-white" />,
    bg: 'bg-purple-600',
  },
  {
    id: 'telegram',
    label: 'Telegram',
    icon: <TelegramIcon className="h-4 w-4 text-white" />,
    bg: 'bg-sky-500',
  },
] as const;

export function GiftCardSocialLoginPreview({ compact }: GiftCardSocialLoginPreviewProps) {
  return (
    <div className={`pointer-events-none select-none ${compact ? 'p-2' : 'p-4'}`}>
      <div
        className={`rounded-2xl border border-gray-200 bg-white shadow-circle-card ${
          compact ? 'p-3' : 'p-5'
        }`}
      >
        <div className="relative mb-3">
          <h3
            className={`text-center font-medium text-gray-900 ${
              compact ? 'text-sm' : 'text-base'
            }`}
          >
            Social Accounts
          </h3>
          <X
            className={`absolute right-0 top-0 text-gray-400 ${
              compact ? 'h-3.5 w-3.5' : 'h-4 w-4'
            }`}
          />
        </div>

        <div className={compact ? 'space-y-2' : 'space-y-2.5'}>
          {PLATFORMS.map((platform) => (
            <div
              key={platform.id}
              className={`flex items-center gap-3 rounded-xl border border-gray-200 ${
                compact ? 'px-2.5 py-2' : 'px-3 py-2.5'
              }`}
            >
              <div
                className={`flex shrink-0 items-center justify-center rounded-full ${platform.bg} ${
                  compact ? 'h-7 w-7' : 'h-8 w-8'
                }`}
              >
                {platform.icon}
              </div>
              <span
                className={`min-w-0 flex-1 truncate font-medium text-gray-900 ${
                  compact ? 'text-xs' : 'text-sm'
                }`}
              >
                {platform.label}
              </span>
              <Button
                size="sm"
                className={`rounded-full shrink-0 ${compact ? 'h-7 px-2.5 text-[10px]' : ''}`}
                tabIndex={-1}
              >
                Connect
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { X, Twitter, Twitch, Github, MessageCircle, Instagram, Linkedin, Mail, ChevronDown } from 'lucide-react';

import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';

import type { ZkSendPlatform } from './ZkSendPanel';

const PLATFORM_OPTIONS: {
  value: ZkSendPlatform;
  label: string;
  hint: string;
  icon: typeof Twitter;
  disabled?: boolean;
}[] = [
  { value: 'twitter', label: 'Twitter / X', hint: 'Send to handle', icon: Twitter },
  { value: 'twitch', label: 'Twitch', hint: 'Send to username', icon: Twitch },
  { value: 'github', label: 'GitHub', hint: 'Send to username', icon: Github },
  { value: 'telegram', label: 'Telegram', hint: 'Send to username', icon: MessageCircle },
  { value: 'instagram', label: 'Instagram', hint: 'Send to username', icon: Instagram, disabled: true },
  // { value: 'tiktok', label: 'TikTok', hint: 'Send to username', icon: Music2 },
  { value: 'gmail', label: 'Gmail', hint: 'Send to email', icon: Mail },
  { value: 'linkedin', label: 'LinkedIn', hint: 'Send to username', icon: Linkedin },
];

type Props = {
  platform: ZkSendPlatform;
  onPlatformChange: (platform: ZkSendPlatform) => void;
  username: string;
  onUsernameChange: (username: string) => void;
  label?: string;
  inputId?: string;
  ariaLabel?: string;
};

export function PlatformUsernameInput({
  platform,
  onPlatformChange,
  username,
  onUsernameChange,
  label = 'To',
  inputId = 'platform-username-input',
  ariaLabel = 'Username',
}: Props) {
  const [platformPopoverOpen, setPlatformPopoverOpen] = useState(false);
  const currentPlatformOpt = PLATFORM_OPTIONS.find((o) => o.value === platform) ?? PLATFORM_OPTIONS[0];

  const clearUsername = () => onUsernameChange('');

  return (
    <div className="space-y-2">
      {label ? <Label htmlFor={inputId}>{label}</Label> : null}
      <div className="flex gap-0 items-center rounded-xl border bg-background ring-offset-background has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-offset-2 overflow-hidden">
        <div className="relative flex-1 min-w-0">
          <Input
            id={inputId}
            value={username}
            onChange={(e) => onUsernameChange(e.target.value)}
            placeholder="@username"
            aria-label={ariaLabel}
            className="border-0 rounded-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 pr-10"
          />
          {username.length > 0 && (
            <button
              type="button"
              onClick={clearUsername}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded"
              aria-label="Clear"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Popover open={platformPopoverOpen} onOpenChange={setPlatformPopoverOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-1.5 shrink-0 h-9 pl-2 pr-2 py-1 border-input text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
              aria-label="Choose platform"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted dark:bg-muted/80 text-foreground">
                {(() => {
                  const Icon = currentPlatformOpt.icon;
                  return <Icon className="h-4 w-4 shrink-0" />;
                })()}
              </span>
              <ChevronDown
                className={`h-4 w-4 shrink-0 transition-transform ${platformPopoverOpen ? 'rotate-180' : ''}`}
                aria-hidden
              />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-2" align="end" sideOffset={4}>
            <div className="space-y-0.5">
              {PLATFORM_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isDisabled = opt.disabled;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={isDisabled}
                    title={isDisabled ? 'Temporarily unavailable' : undefined}
                    onClick={() => {
                      if (isDisabled) return;
                      onPlatformChange(opt.value as ZkSendPlatform);
                      setPlatformPopoverOpen(false);
                    }}
                    className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${platform === opt.value ? 'bg-muted/40' : ''} ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-muted/60'}`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="font-medium">{opt.label}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">{opt.hint}</span>
                  </button>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}

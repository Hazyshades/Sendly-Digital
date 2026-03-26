import { useState } from 'react';
import { Twitter, Twitch, Github, MessageCircle, Instagram, Linkedin, Mail, Wallet, ChevronDown } from 'lucide-react';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

import type { ZkSendPlatform } from './ZkSendPanel';

export type SendRecipientType = ZkSendPlatform | 'address';

const RECIPIENT_OPTIONS: {
  value: SendRecipientType;
  label: string;
  hint: string;
  icon: typeof Twitter;
}[] = [
  { value: 'twitter', label: 'Twitter / X', hint: 'Send to handle', icon: Twitter },
  { value: 'twitch', label: 'Twitch', hint: 'Send to username', icon: Twitch },
  { value: 'github', label: 'GitHub', hint: 'Send to username', icon: Github },
  { value: 'telegram', label: 'Telegram', hint: 'Send to username', icon: MessageCircle },
  { value: 'instagram', label: 'Instagram', hint: 'Send to username', icon: Instagram },
  { value: 'gmail', label: 'Gmail', hint: 'Send to email', icon: Mail },
  { value: 'linkedin', label: 'LinkedIn', hint: 'Send to username', icon: Linkedin },
  { value: 'address', label: 'Address', hint: 'Send to wallet', icon: Wallet },
];

type Props = {
  value: SendRecipientType;
  onChange: (value: SendRecipientType) => void;
};

export function SendRecipientTypeSelector({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const current = RECIPIENT_OPTIONS.find((o) => o.value === value) ?? RECIPIENT_OPTIONS[0];
  const CurrentIcon = current.icon;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-1.5 shrink-0 h-9 pl-2 pr-2 py-1 border border-input rounded-lg bg-background hover:bg-muted/60 transition-colors cursor-pointer w-full max-w-[280px]"
          aria-label="Choose recipient type"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted dark:bg-muted/80 text-foreground shrink-0">
            <CurrentIcon className="h-4 w-4 shrink-0" />
          </span>
          <span className="flex-1 text-left font-medium truncate">{current.label}</span>
          <span className="text-sm text-muted-foreground hidden sm:inline truncate">{current.hint}</span>
          <ChevronDown
            className={`h-4 w-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
            aria-hidden
          />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-72 p-2 outline-hidden"
        align="start"
        sideOffset={4}
      >
        <div className="space-y-0.5">
          {RECIPIENT_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${value === opt.value ? 'bg-muted/40' : ''} hover:bg-muted/60`}
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
  );
}

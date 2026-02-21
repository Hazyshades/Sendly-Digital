import { Twitter, Twitch, Github, MessageCircle, Instagram, Linkedin, Mail } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';

import type { ZkSendPlatform } from './ZkSendPanel';

const platformIcons: Record<ZkSendPlatform, typeof Twitter> = {
  twitter: Twitter,
  twitch: Twitch,
  github: Github,
  telegram: MessageCircle,
  instagram: Instagram,
  linkedin: Linkedin,
  gmail: Mail,
};

const platformLabels: Record<ZkSendPlatform, string> = {
  twitter: 'Twitter / X',
  twitch: 'Twitch',
  github: 'GitHub',
  telegram: 'Telegram',
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  gmail: 'Gmail',
};

const ALL_PLATFORMS: ZkSendPlatform[] = [
  'twitter',
  'twitch',
  'github',
  'telegram',
  'instagram',
  'linkedin',
  // 'tiktok',
  'gmail',
];

type Props = {
  open: boolean;
  onClose: () => void;
  onSelect: (platform: ZkSendPlatform) => void;
  currentPlatform: ZkSendPlatform;
};

export function PlatformSelectModal({ open, onClose, onSelect, currentPlatform }: Props) {
  const handleSelect = (platform: ZkSendPlatform) => {
    onSelect(platform);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change platform</DialogTitle>
        </DialogHeader>
        <div className="grid gap-2 py-2">
          {ALL_PLATFORMS.map((platform) => {
            const Icon = platformIcons[platform];
            const label = platformLabels[platform];
            const isCurrent = platform === currentPlatform;
            return (
              <Button
                key={platform}
                type="button"
                variant={isCurrent ? 'secondary' : 'ghost'}
                className="justify-start gap-3"
                onClick={() => handleSelect(platform)}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{label}</span>
                {isCurrent && <span className="ml-auto text-xs text-muted-foreground">Current</span>}
              </Button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

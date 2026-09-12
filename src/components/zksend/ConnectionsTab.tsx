import { useState } from 'react';
import { Twitter, Twitch, Github, MessageCircle, Instagram, Linkedin, Mail, Settings } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useZkSendContext } from '@/contexts/ZkSendContext';
import { useTwitterConnection } from '@/hooks/useTwitterConnection';
import { useTwitchConnection } from '@/hooks/useTwitchConnection';
import { useGmailConnection } from '@/hooks/useGmailConnection';
import { PlatformSelectModal } from './PlatformSelectModal';

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

const platformsRequiringOAuth: ZkSendPlatform[] = ['twitter', 'twitch', 'gmail'];

type Props = {
  username: string;
  isIdentityValid: boolean;
};

export function ConnectionsTab({ username: _username, isIdentityValid: _isIdentityValid }: Props) {
  const { platform, setPlatform } = useZkSendContext();
  const { isConnected: isTwitterConnected, connecting: connectingTwitter, clearing: clearingTwitter, connect: connectTwitter, disconnect: disconnectTwitter } = useTwitterConnection();
  const { isConnected: isTwitchConnected, connecting: connectingTwitch, clearing: clearingTwitch, connect: connectTwitch, disconnect: disconnectTwitch } = useTwitchConnection();
  const { isConnected: isGmailConnected, connecting: connectingGmail, clearing: clearingGmail, connect: connectGmail, disconnect: disconnectGmail } = useGmailConnection();
  const [showPlatformModal, setShowPlatformModal] = useState(false);

  const isConnected = platform === 'twitter' ? isTwitterConnected : platform === 'twitch' ? isTwitchConnected : platform === 'gmail' ? isGmailConnected : true;
  const needsOAuth = platformsRequiringOAuth.includes(platform);
  const PlatformIcon = platformIcons[platform];
  const platformLabel = platformLabels[platform];
  const connecting = platform === 'twitter' ? connectingTwitter : platform === 'twitch' ? connectingTwitch : platform === 'gmail' ? connectingGmail : false;
  const clearing = platform === 'twitter' ? clearingTwitter : platform === 'twitch' ? clearingTwitch : platform === 'gmail' ? clearingGmail : false;

  const handleConnect = async () => {
    try {
      if (platform === 'twitter') {
        await connectTwitter();
      } else if (platform === 'twitch') {
        await connectTwitch();
      } else if (platform === 'gmail') {
        await connectGmail();
      }
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('refresh-pending-payments'));
        window.dispatchEvent(new CustomEvent('identity-updated'));
      }, 500);
    } catch {
      // Error already handled in connect()
    }
  };

  const handleDisconnect = () => {
    if (platform === 'twitter') {
      disconnectTwitter();
    } else if (platform === 'twitch') {
      disconnectTwitch();
    } else if (platform === 'gmail') {
      disconnectGmail();
    }
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('identity-updated'));
    }, 300);
  };

  const handlePlatformChange = (p: ZkSendPlatform) => {
    setPlatform(p);
    setShowPlatformModal(false);
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>Connections</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => setShowPlatformModal(true)} className="gap-1.5">
            <Settings className="h-4 w-4" />
            Change platform
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 p-3 rounded-xl border bg-muted/30">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-background border">
              <PlatformIcon className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <div className="text-sm font-medium">{platformLabel}</div>
              <div className="text-xs text-muted-foreground">
                {needsOAuth
                  ? isConnected
                    ? 'Account connected'
                    : 'Connect your account to create and claim payments'
                  : 'Use Reclaim proof (no OAuth)'}
              </div>
            </div>
          </div>

          {needsOAuth ? (
            <div className="space-y-3">
              <Button
                type="button"
                size="lg"
                onClick={handleConnect}
                disabled={connecting || clearing}
                className="w-full"
              >
                {connecting ? 'Connecting...' : clearing ? 'Disconnecting...' : isConnected ? 'Reconnect' : `Connect ${platformLabel}`}
              </Button>
              {isConnected && (
                <Button type="button" variant="ghost" onClick={handleDisconnect} disabled={clearing} className="w-full text-red-600 hover:text-red-700 hover:bg-red-50">
                  {clearing ? 'Disconnecting...' : 'Disconnect'}
                </Button>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Claim opens a proof window for this platform. You do not need to generate a proof first.
            </p>
          )}
        </CardContent>
      </Card>

      <PlatformSelectModal open={showPlatformModal} onClose={() => setShowPlatformModal(false)} onSelect={handlePlatformChange} currentPlatform={platform} />
    </>
  );
}

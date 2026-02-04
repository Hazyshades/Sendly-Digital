import { useState, useEffect } from 'react';
import { Twitter, Twitch, Github, MessageCircle, Instagram, Linkedin, Mail, CheckCircle2, AlertCircle, RefreshCw, LogOut, UserPlus, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { useTwitterConnection } from '../../hooks/useTwitterConnection';
import { useTwitchConnection } from '../../hooks/useTwitchConnection';
import { useGmailConnection } from '../../hooks/useGmailConnection';
import { useZkSendContext } from '../../contexts/ZkSendContext';
import { PlatformSelectModal } from './PlatformSelectModal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
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

const platformsRequiringOAuth: ZkSendPlatform[] = ['twitter', 'twitch', 'gmail'];

export function SocialAccountStatus() {
  const { platform, setPlatform, setActiveTab } = useZkSendContext();
  const { accessToken: twitterToken, isConnected: isTwitterConnected, clearing: clearingTwitter, disconnect: disconnectTwitter } = useTwitterConnection();
  const { isConnected: isTwitchConnected, clearing: clearingTwitch, disconnect: disconnectTwitch } = useTwitchConnection();
  const { isConnected: isGmailConnected, clearing: clearingGmail, disconnect: disconnectGmail } = useGmailConnection();
  const [username, setUsername] = useState<string | null>(null);
  const [loadingUsername, setLoadingUsername] = useState(false);
  const [showPlatformModal, setShowPlatformModal] = useState(false);
  const navigate = useNavigate();

  const isConnected = platform === 'twitter' ? isTwitterConnected : platform === 'twitch' ? isTwitchConnected : platform === 'gmail' ? isGmailConnected : true; // Reclaim platforms don't need OAuth
  const needsConnection = platformsRequiringOAuth.includes(platform) && !isConnected;

  useEffect(() => {
    if (!isConnected || username) return;
    if (platform !== 'twitter') return;

    const fetchUsername = async () => {
      setLoadingUsername(true);
      try {
        const response = await fetch('https://api.x.com/2/users/me?user.fields=username', {
          headers: {
            Authorization: `Bearer ${twitterToken}`,
          },
        });

        if (response.ok) {
          const data = (await response.json()) as { data?: { username?: string } };
          if (data.data?.username) {
            setUsername(data.data.username);
          }
        }
      } catch (error) {
        console.warn('[SocialAccountStatus] Failed to fetch username:', error);
      } finally {
        setLoadingUsername(false);
      }
    };

    void fetchUsername();
  }, [isConnected, twitterToken, username, platform]);

  const handleDisconnect = () => {
    if (platform === 'twitter') {
      disconnectTwitter();
    } else if (platform === 'twitch') {
      disconnectTwitch();
    } else if (platform === 'gmail') {
      disconnectGmail();
    }
  };

  const handlePlatformChange = (newPlatform: ZkSendPlatform) => {
    setPlatform(newPlatform);
    setUsername(null);
    setShowPlatformModal(false);
  };

  const PlatformIcon = platformIcons[platform];
  const platformLabel = platformLabels[platform];
  const clearing = platform === 'twitter' ? clearingTwitter : platform === 'twitch' ? clearingTwitch : platform === 'gmail' ? clearingGmail : false;

  const handleRefreshPending = () => {
    navigate('/payments');
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('refresh-pending-payments'));
    }, 100);
  };

  const goToConnections = () => {
    navigate('/payments');
    setActiveTab('connections');
  };

  if (needsConnection) {
    return (
      <>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="bg-amber-100 dark:bg-amber-900/40 backdrop-blur-sm border-2 border-amber-400 dark:border-amber-600 text-amber-800 dark:text-amber-200 hover:bg-amber-200 dark:hover:bg-amber-800/50 px-3 py-2 rounded-2xl transition-all duration-200 shadow-lg shadow-amber-200/30 dark:shadow-amber-900/20 ring-2 ring-amber-300/50 dark:ring-amber-500/30"
              aria-label="Social account status — not connected"
            >
              <AlertCircle className="h-4 w-4 mr-2 shrink-0" />
              <span className="text-sm font-semibold">Not connected</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>Social Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="px-2 py-1.5 text-xs text-muted-foreground mb-2">
              Connect your account in the <strong>Connections</strong> tab to create and claim payments
            </div>
            <DropdownMenuItem onClick={goToConnections}>
              <UserPlus className="h-4 w-4 mr-2" />
              Go to Connections
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowPlatformModal(true)}>
              <Settings className="h-4 w-4 mr-2" />
              Change platform
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <PlatformSelectModal
          open={showPlatformModal}
          onClose={() => setShowPlatformModal(false)}
          onSelect={handlePlatformChange}
          currentPlatform={platform}
        />
      </>
    );
  }

  const getPlatformColor = () => {
    if (platform === 'twitter') return 'bg-black';
    if (platform === 'twitch') return 'bg-purple-600';
    if (platform === 'github') return 'bg-gray-800';
    if (platform === 'telegram') return 'bg-sky-500';
    if (platform === 'instagram') return 'bg-gradient-to-br from-purple-600 via-pink-600 to-orange-500';
    if (platform === 'linkedin') return 'bg-blue-600';
    if (platform === 'gmail') return 'bg-red-600';
    return 'bg-gray-600';
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="bg-white/90 backdrop-blur-sm border border-gray-200 text-gray-900 hover:bg-white px-3 py-2 rounded-2xl transition-all duration-200 shadow-circle-card flex items-center gap-2"
            aria-label="Social account status"
          >
            <div className="relative">
              <div className={`w-6 h-6 ${getPlatformColor()} rounded-full flex items-center justify-center`}>
                <PlatformIcon className="h-3.5 w-3.5 text-white" />
              </div>
              {(isConnected || !platformsRequiringOAuth.includes(platform)) && (
                <CheckCircle2 className="absolute -bottom-0.5 -right-0.5 h-3 w-3 text-emerald-600 bg-white rounded-full" />
              )}
            </div>
            <span className="text-xs font-medium">
              {loadingUsername ? '...' : username ? `@${username}` : platformLabel}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>
            <div className="flex items-center gap-2">
              <PlatformIcon className="h-4 w-4" />
              <span>{platformLabel}</span>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {platformsRequiringOAuth.includes(platform) && isConnected && (
            <div className="px-2 py-1.5 text-xs text-muted-foreground">
              Connected as {username ? `@${username}` : platformLabel}
            </div>
          )}

          <DropdownMenuItem onClick={handleRefreshPending}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh pending
          </DropdownMenuItem>

          <DropdownMenuItem onClick={() => setShowPlatformModal(true)}>
            <Settings className="h-4 w-4 mr-2" />
            Change platform
          </DropdownMenuItem>

          {platformsRequiringOAuth.includes(platform) && isConnected && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleDisconnect} disabled={clearing} className="text-red-600">
                <LogOut className="h-4 w-4 mr-2" />
                {clearing ? 'Disconnecting...' : 'Disconnect'}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <PlatformSelectModal
        open={showPlatformModal}
        onClose={() => setShowPlatformModal(false)}
        onSelect={handlePlatformChange}
        currentPlatform={platform}
      />
    </>
  );
}

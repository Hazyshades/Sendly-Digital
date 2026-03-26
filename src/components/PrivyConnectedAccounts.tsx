import { useMemo } from 'react';
import { usePrivySafe } from '@/lib/privy/usePrivySafe';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface ConnectedAccount {
  type: string;
  name: string;
  identifier: string;
  icon: string;
  color: string;
}

export function PrivyConnectedAccounts() {
  const { authenticated, user } = usePrivySafe();

  const connectedAccounts = useMemo<ConnectedAccount[]>(() => {
    if (!user || !authenticated) return [];

    const accounts: ConnectedAccount[] = [];

    if (user.twitter) {
      accounts.push({
        type: 'twitter',
        name: 'X (Twitter)',
        identifier: user.twitter.username || 'user',
        icon: '𝕏',
        color: 'bg-purple-500'
      });
    }

    if (user.twitch) {
      accounts.push({
        type: 'twitch',
        name: 'Twitch',
        identifier: (user.twitch as any).username || (user.twitch as any).email || 'Twitch',
        icon: '📺',
        color: 'bg-purple-700'
      });
    }

    if (user.telegram) {
      accounts.push({
        type: 'telegram',
        name: 'Telegram',
        identifier: user.telegram.username || user.telegram.firstName || user.telegram.telegramUserId || 'Telegram',
        icon: '✈️',
        color: 'bg-sky-500'
      });
    }

    if (user.google) {
      accounts.push({
        type: 'google',
        name: 'Google',
        identifier: user.google.name || user.google.email || 'Google',
        icon: 'G',
        color: 'bg-blue-500'
      });
    }

    if (user.tiktok) {
      accounts.push({
        type: 'tiktok',
        name: 'TikTok',
        identifier: user.tiktok.username || 'TikTok',
        icon: '♫',
        color: 'bg-pink-500'
      });
    }

    if ((user as any).instagram) {
      accounts.push({
        type: 'instagram',
        name: 'Instagram',
        identifier: (user as any).instagram.username || 'Instagram',
        icon: '📷',
        color: 'bg-pink-600'
      });
    }

    if ((user as any).facebook) {
      accounts.push({
        type: 'instagram',
        name: 'Instagram / Facebook',
        identifier: (user as any).facebook.name || (user as any).facebook.email || 'Facebook',
        icon: '📷',
        color: 'bg-pink-600'
      });
    }

    if (user.apple) {
      accounts.push({
        type: 'apple',
        name: 'Apple',
        identifier: user.apple.email || 'Apple',
        icon: '🍎',
        color: 'bg-gray-700'
      });
    }

    if (user.email) {
      accounts.push({
        type: 'email',
        name: 'Email',
        identifier: user.email.address || 'Email',
        icon: '✉️',
        color: 'bg-indigo-500'
      });
    }

    if (user.phone) {
      accounts.push({
        type: 'phone',
        name: 'Phone',
        identifier: user.phone.number || 'Phone',
        icon: '📱',
        color: 'bg-green-500'
      });
    }

    return accounts;
  }, [user, authenticated]);

  if (!authenticated || connectedAccounts.length === 0) {
    return null;
  }

  // Show only main accounts (Twitter, Twitch, Google, TikTok, Instagram)
  const mainAccounts = connectedAccounts.filter(acc => 
    ['twitter', 'twitch', 'telegram', 'google', 'tiktok', 'instagram'].includes(acc.type)
  );

  if (mainAccounts.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      {mainAccounts.slice(0, 2).map((account, index) => (
        <div
          key={`${account.type}-${index}`}
          className="flex items-center gap-1.5 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg px-2.5 py-1.5 hover:bg-white transition-all duration-200"
          title={`${account.name}: ${account.identifier}`}
        >
          {account.type === 'twitter' ? (
            <div className="w-5 h-5 bg-black rounded flex items-center justify-center">
              <span className="text-white text-[12px] font-bold">𝕏</span>
            </div>
          ) : account.type === 'twitch' ? (
            <div className="w-5 h-5 bg-purple-600 rounded overflow-hidden flex items-center justify-center">
              <img 
                src="https://cdn.brandfetch.io/idIwZCwD2f/w/400/h/400/theme/dark/icon.jpeg?c=1dxbfHSJFAPEGdCLU4o5B" 
                alt="Twitch" 
                className="w-full h-full object-cover"
              />
            </div>
          ) : account.type === 'instagram' ? (
            <div className="w-5 h-5 bg-gradient-to-br from-purple-600 via-pink-600 to-orange-500 rounded flex items-center justify-center">
              <span className="text-white text-[10px]">📷</span>
            </div>
          ) : account.type === 'telegram' ? (
        <div className="w-5 h-5 rounded overflow-hidden flex items-center justify-center">
          <img
            src="https://cdn.brandfetch.io/id68S6e-Gp/w/400/h/400/theme/dark/icon.jpeg?c=1bxid64Mup7aczewSAYMX&t=1751901140899"
            alt="Telegram"
            className="w-full h-full object-cover"
          />
        </div>
          ) : (
            <Avatar className="w-5 h-5">
              <AvatarFallback className={`${account.color} text-white text-[10px] font-bold flex items-center justify-center`}>
                {account.icon}
              </AvatarFallback>
            </Avatar>
          )}
          <span className="text-gray-900 text-xs font-medium whitespace-nowrap">
            {account.type === 'twitter' 
              ? `@${account.identifier}` 
              : account.identifier.length > 15 
                ? `${account.identifier.slice(0, 15)}...` 
                : account.identifier}
          </span>
        </div>
      ))}
      {mainAccounts.length > 2 && (
        <div className="flex items-center justify-center w-8 h-8 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg text-white text-xs font-medium">
          +{mainAccounts.length - 2}
        </div>
      )}
    </div>
  );
}


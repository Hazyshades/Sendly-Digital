import { useState } from 'react';
import { usePrivy, useLoginWithTelegram } from '@privy-io/react-auth';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { Alert, AlertDescription } from './ui/alert';
import { AlertCircle, LogOut } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';

interface PrivyAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PrivyAuthModal({ isOpen, onClose }: PrivyAuthModalProps) {
  const privy = usePrivy();
  const { login, linkTwitter, linkTwitch, linkTelegram, user, authenticated, unlinkTwitter, unlinkTwitch, unlinkTelegram, logout } = privy as typeof privy & {
    linkTelegram?: (options?: { launchParams?: { initDataRaw?: string } }) => Promise<void> | void;
    unlinkTelegram?: (telegramUserId: string) => Promise<any>;
  };
  const { login: loginWithTelegram, state: telegramState } = useLoginWithTelegram();
  const [loading, setLoading] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const hasTwitter = user?.twitter;
  const hasTwitch = user?.twitch;
  const hasInstagram = (user as any)?.instagram || (user as any)?.facebook;
  const hasTikTok = (user as any)?.tiktok;
  const hasTelegram = user?.telegram;
  const linkedAccountsCount = user?.linkedAccounts?.length || 0;
  const canUnlink = linkedAccountsCount > 1;

  const handleLogin = async (provider: 'twitter' | 'twitch') => {
    try {
      setLoading(provider);
      setErrorMessage(null);
      
      if (authenticated && user) {
        if (provider === 'twitter') {
          await linkTwitter();
          onClose();
        } else if (provider === 'twitch') {
          await linkTwitch();
          onClose();
        }
      } else {
        await login();
        onClose();
      }
    } catch (error: any) {
      console.error(`Failed to ${authenticated && user ? 'link' : 'login'} with ${provider}:`, error);
      
      const errorMessage = (error?.message || error?.toString() || '').toLowerCase();
      const errorCode = error?.code || '';
      
      const isAccountLinkedError = 
        errorMessage.includes('already been linked') || 
        errorMessage.includes('already linked') ||
        errorMessage.includes('authentication failed') ||
        errorMessage.includes('linked to another user') ||
        errorCode.includes('account_already_linked') ||
        errorCode.includes('user_exists');
      
      if (isAccountLinkedError) {
        const providerName = provider === 'twitter' ? 'Twitter' : provider === 'twitch' ? 'Twitch' : 'social';
        setErrorMessage(`This ${providerName} account is already linked to another Privy user. To use a different ${providerName} account, please log out of your current session first.`);
        toast.error(`This account is already linked to another user`, {
          description: 'Log out of your current session and log in again with the desired account',
          duration: 5000,
        });
      } else {
        toast.error(`Failed to ${authenticated && user ? 'link' : 'login'}`, {
          description: errorMessage || 'Please try again',
        });
      }
      setLoading(null);
    }
  };

  const handleUnlink = async (provider: 'twitter' | 'twitch') => {
    try {
      setLoading(`unlink-${provider}`);
      
      if (!user) {
        toast.error('User not found');
        setLoading(null);
        return;
      }

      const hasAccount = provider === 'twitter' ? hasTwitter : hasTwitch;
      if (!hasAccount) {
        toast.error('Account not connected');
        setLoading(null);
        return;
      }

      onClose();
      
      if (provider === 'twitter' && user.twitter?.subject) {
        await unlinkTwitter(user.twitter.subject);
        toast.success('Twitter account unlinked successfully');
      } else if (provider === 'twitch' && user.twitch?.subject) {
        await unlinkTwitch(user.twitch.subject);
        toast.success('Twitch account unlinked successfully');
      }
    } catch (error) {
      console.error(`Failed to unlink ${provider}:`, error);
      toast.error(`Failed to unlink ${provider === 'twitter' ? 'Twitter' : 'Twitch'} account`);
    } finally {
      setLoading(null);
    }
  };

  const handleTelegramLogin = async () => {
    try {
      setLoading('telegram');
      setErrorMessage(null);
      
      if (authenticated && user) {
        const privyAny = privy as any;
        if (linkTelegram) {
          await linkTelegram();
          onClose();
        } else if (privyAny.linkTelegram) {
          await privyAny.linkTelegram();
          onClose();
        } else if (privyAny.linkOAuth) {
          await privyAny.linkOAuth({ provider: 'telegram' });
          onClose();
        } else if (privyAny.link) {
          await privyAny.link({ provider: 'telegram' });
          onClose();
        } else {
          toast.error('Linking Telegram is not available. Please configure Telegram in Privy Dashboard first.');
          setLoading(null);
        }
      } else {
        await loginWithTelegram();
        onClose();
      }
    } catch (error: any) {
      console.error(`Failed to ${authenticated && user ? 'link' : 'login'} with Telegram:`, error);
      
      const errorMessage = (error?.message || error?.toString() || '').toLowerCase();
      const errorCode = error?.code || '';
      
      const isAccountLinkedError = 
        errorMessage.includes('already been linked') || 
        errorMessage.includes('already linked') ||
        errorMessage.includes('authentication failed') ||
        errorMessage.includes('linked to another user') ||
        errorMessage.includes('telegram user already exists') ||
        errorCode.includes('account_already_linked') ||
        errorCode.includes('user_exists');
      
      if (isAccountLinkedError) {
        setErrorMessage('This Telegram account is already linked to another Privy user. Log out of your current session and try again with the desired account.');
        toast.error('This account is already linked to another user', {
          description: 'Log out of your current session and log in again with the desired account',
          duration: 5000,
        });
      } else {
        toast.error(`Failed to ${authenticated && user ? 'link' : 'login'}`, {
          description: errorMessage || 'Please try again',
        });
      }
      setLoading(null);
    }
  };

  const handleTelegramUnlink = async () => {
    try {
      setLoading('unlink-telegram');
      
      if (!user) {
        toast.error('User not found');
        setLoading(null);
        return;
      }

      if (!hasTelegram) {
        toast.error('Telegram account not connected');
        setLoading(null);
        return;
      }

      if (linkedAccountsCount <= 1) {
        toast.error('Cannot unlink the last account');
        setLoading(null);
        return;
      }

      onClose();
      
      const privyAny = privy as any;
      const telegramAccount = user.telegram;

      if (telegramAccount?.telegramUserId) {
        if (unlinkTelegram) {
          await unlinkTelegram(telegramAccount.telegramUserId);
          toast.success('Telegram account unlinked successfully');
        } else if (privyAny.unlinkTelegram) {
          await privyAny.unlinkTelegram(telegramAccount.telegramUserId);
          toast.success('Telegram account unlinked successfully');
        } else if (privyAny.unlinkOAuth) {
          await privyAny.unlinkOAuth({ provider: 'telegram', subject: telegramAccount.telegramUserId });
          toast.success('Telegram account unlinked successfully');
        } else {
          toast.error('Telegram unlinking is not available in this Privy SDK version');
        }
      } else {
        toast.error('Telegram account information not found');
      }
    } catch (error) {
      console.error('Failed to unlink Telegram:', error);
      toast.error('Failed to unlink Telegram account');
    } finally {
      setLoading(null);
    }
  };

  const handleInstagramLogin = async () => {
    try {
      setLoading('instagram');
      setErrorMessage(null);

      if (authenticated && user) {
        const privyAny = privy as any;
        // Try linkInstagram first, then linkOAuth, then generic link
        if (privyAny.linkInstagram) {
          await privyAny.linkInstagram();
          onClose();
        } else if (privyAny.linkOAuth) {
          await privyAny.linkOAuth({ provider: 'instagram' });
          onClose();
        } else if (privyAny.link) {
          await privyAny.link({ provider: 'instagram' });
          onClose();
        } else {
          toast.error('Linking Instagram is not available. Please configure Instagram in Privy Dashboard first.');
          setLoading(null);
        }
      } else {
        // For login, use the standard login method which will show Instagram as an option
        await login();
        onClose();
      }
    } catch (error: any) {
      console.error(`Failed to ${authenticated && user ? 'link' : 'login'} with Instagram:`, error);

      const errorMessage = (error?.message || error?.toString() || '').toLowerCase();
      const errorCode = error?.code || '';

      const isAccountLinkedError = 
        errorMessage.includes('already been linked') || 
        errorMessage.includes('already linked') ||
        errorMessage.includes('authentication failed') ||
        errorMessage.includes('linked to another user') ||
        errorCode.includes('account_already_linked') ||
        errorCode.includes('user_exists');

      if (isAccountLinkedError) {
        setErrorMessage('This Instagram account is already linked to another Privy user. To use a different Instagram account, please log out of your current session first.');
        toast.error('This account is already linked to another user', {
          description: 'Log out of your current session and log in again with the desired account',
          duration: 5000,
        });
      } else {
        toast.error(`Failed to ${authenticated && user ? 'link' : 'login'}`, {
          description: errorMessage || 'Please try again',
        });
      }
      setLoading(null);
    }
  };

  const handleInstagramUnlink = async () => {
    try {
      setLoading('unlink-instagram');

      if (!user) {
        toast.error('User not found');
        setLoading(null);
        return;
      }

      if (!hasInstagram) {
        toast.error('Instagram account not connected');
        setLoading(null);
        return;
      }

      if (linkedAccountsCount <= 1) {
        toast.error('Cannot unlink the last account');
        setLoading(null);
        return;
      }

      onClose();

      const privyAny = privy as any;
      const instagramAccount = (user as any).instagram || (user as any).facebook;
      
      if (instagramAccount?.subject) {
        if (privyAny.unlinkInstagram) {
          await privyAny.unlinkInstagram(instagramAccount.subject);
          toast.success('Instagram account unlinked successfully');
        } else if (privyAny.unlinkOAuth) {
          await privyAny.unlinkOAuth({ provider: 'instagram', subject: instagramAccount.subject });
          toast.success('Instagram account unlinked successfully');
        } else {
          toast.error('Instagram unlinking is not available in this Privy SDK version');
        }
      } else {
        toast.error('Instagram account information not found');
      }
    } catch (error) {
      console.error('Failed to unlink Instagram:', error);
      toast.error('Failed to unlink Instagram account');
    } finally {
      setLoading(null);
    }
  };

  const getTwitterUsername = () => {
    return user?.twitter?.username || 'Twitter';
  };

  const getTwitchUsername = () => {
    if (!user?.twitch) return 'Twitch';
    return (user.twitch as any).username || (user.twitch as any).email || 'Twitch';
  };

  const getInstagramUsername = () => {
    if (!hasInstagram) return 'Instagram';
    return (user as any)?.instagram?.username || (user as any)?.instagram?.email || 'Instagram';
  };

  const handleTikTokLogin = async () => {
    try {
      setLoading('tiktok');
      setErrorMessage(null);

      if (authenticated && user) {
        const privyAny = privy as any;
        if (privyAny.linkTiktok) {
          await privyAny.linkTiktok();
          onClose();
        } else if (privyAny.linkOAuth) {
          await privyAny.linkOAuth({ provider: 'tiktok' });
          onClose();
        } else if (privyAny.link) {
          await privyAny.link({ provider: 'tiktok' });
          onClose();
        } else {
          toast.error('Linking TikTok is not available. Please configure TikTok in Privy Dashboard first.');
          setLoading(null);
        }
      } else {
        await login();
        onClose();
      }
    } catch (error: any) {
      console.error(`Failed to ${authenticated && user ? 'link' : 'login'} with TikTok:`, error);

      const errorMessage = (error?.message || error?.toString() || '').toLowerCase();
      const errorCode = error?.code || '';

      const isAccountLinkedError =
        errorMessage.includes('already been linked') ||
        errorMessage.includes('already linked') ||
        errorMessage.includes('authentication failed') ||
        errorMessage.includes('linked to another user') ||
        errorCode.includes('account_already_linked') ||
        errorCode.includes('user_exists');

      if (isAccountLinkedError) {
        setErrorMessage('This TikTok account is already linked to another Privy user. Log out of your current session and try again with the desired account.');
        toast.error('This account is already linked to another user', {
          description: 'Log out of your current session and log in again with the desired account',
          duration: 5000,
        });
      } else {
        toast.error(`Failed to ${authenticated && user ? 'link' : 'login'}`, {
          description: errorMessage || 'Please try again',
        });
      }
      setLoading(null);
    }
  };

  const handleTikTokUnlink = async () => {
    try {
      setLoading('unlink-tiktok');

      if (!user) {
        toast.error('User not found');
        setLoading(null);
        return;
      }

      if (!hasTikTok) {
        toast.error('TikTok account not connected');
        setLoading(null);
        return;
      }

      if (linkedAccountsCount <= 1) {
        toast.error('Cannot unlink the last account');
        setLoading(null);
        return;
      }

      onClose();

      const privyAny = privy as any;
      const tiktokAccount = (user as any).tiktok;

      if (tiktokAccount?.subject) {
        if (privyAny.unlinkTiktok) {
          await privyAny.unlinkTiktok(tiktokAccount.subject);
          toast.success('TikTok account unlinked successfully');
        } else if (privyAny.unlinkOAuth) {
          await privyAny.unlinkOAuth({ provider: 'tiktok', subject: tiktokAccount.subject });
          toast.success('TikTok account unlinked successfully');
        } else {
          toast.error('TikTok unlinking is not available in this Privy SDK version');
        }
      } else {
        toast.error('TikTok account information not found');
      }
    } catch (error) {
      console.error('Failed to unlink TikTok:', error);
      toast.error('Failed to unlink TikTok account');
    } finally {
      setLoading(null);
    }
  };

  const getTikTokUsername = () => {
    if (!hasTikTok) return 'TikTok';
    const tiktokAccount = (user as any).tiktok;
    const username =
      tiktokAccount?.username ||
      tiktokAccount?.handle ||
      tiktokAccount?.display_name ||
      tiktokAccount?.email ||
      '';
    if (!username) {
      return 'TikTok';
    }
    return username.startsWith('@') ? username : `@${username}`;
  };

  const getTelegramDisplayName = () => {
    if (!hasTelegram) return 'Telegram';
    return (
      user?.telegram?.username ? `@${user.telegram.username}` :
      user?.telegram?.firstName || user?.telegram?.lastName ||
      user?.telegram?.telegramUserId ||
      'Telegram'
    );
  };

  const handleLogout = async () => {
    try {
      setLoading('logout');
      await logout();
      toast.success('Successfully logged out');
      setErrorMessage(null);
      onClose();
    } catch (error) {
      console.error('Failed to logout:', error);
      toast.error('Failed to log out');
    } finally {
      setLoading(null);
    }
  };

  const handleClose = () => {
    setErrorMessage(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">Social Accounts</DialogTitle>
          <DialogDescription className="text-center">
              </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {errorMessage && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="space-y-2">
                <p>{errorMessage}</p>
                {authenticated && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLogout}
                    disabled={loading !== null}
                    className="w-full mt-2"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    {loading === 'logout' ? 'Logging out...' : 'Log out and log in again'}
                  </Button>
                )}
              </AlertDescription>
            </Alert>
          )}
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center overflow-hidden">
                  <img 
                    src="https://cdn.brandfetch.io/x.com/w/400/h/400/theme/dark/icon.jpeg?c=1dxbfHSJFAPEGdCLU4o5B" 
                    alt="X logo" 
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <div className="font-medium">Twitter / X</div>
                  {hasTwitter && (
                    <div className="text-sm text-muted-foreground">
                      @{getTwitterUsername()}
                    </div>
                  )}
                </div>
              </div>
              {hasTwitter ? (
                canUnlink ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleUnlink('twitter')}
                    disabled={loading !== null}
                  >
                    {loading === 'unlink-twitter' ? 'Disconnecting...' : 'Disconnect'}
                  </Button>
                ) : (
                  <span className="text-xs text-muted-foreground">Last account</span>
                )
              ) : (
                <Button
                  onClick={() => handleLogin('twitter')}
                  disabled={loading !== null}
                  size="sm"
                >
                  {loading === 'twitter' ? 'Connecting...' : 'Connect'}
                </Button>
              )}
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-700 rounded-lg flex items-center justify-center overflow-hidden">
                  <img 
                    src="https://cdn.brandfetch.io/idIwZCwD2f/w/400/h/400/theme/dark/icon.jpeg?c=1dxbfHSJFAPEGdCLU4o5B" 
                    alt="Twitch logo" 
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <div className="font-medium">Twitch</div>
                  {hasTwitch && (
                    <div className="text-sm text-muted-foreground">
                      {getTwitchUsername()}
                    </div>
                  )}
                </div>
              </div>
              {hasTwitch ? (
                canUnlink ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleUnlink('twitch')}
                    disabled={loading !== null}
                  >
                    {loading === 'unlink-twitch' ? 'Disconnecting...' : 'Disconnect'}
                  </Button>
                ) : (
                  <span className="text-xs text-muted-foreground">Last account</span>
                )
              ) : (
                <Button
                  onClick={() => handleLogin('twitch')}
                  disabled={loading !== null}
                  size="sm"
                >
                  {loading === 'twitch' ? 'Connecting...' : 'Connect'}
                </Button>
              )}
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-sky-500 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-white"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M9.50039 15.0005L9.30305 18.7916C9.63343 18.7916 9.77653 18.6502 9.94861 18.4803L11.4982 16.9898L15.251 19.7367C15.9373 20.1197 16.4205 19.9285 16.6027 19.0304L18.9395 7.42573L18.9402 7.42504C19.1555 6.32428 18.5201 5.86444 17.851 6.13415L4.90234 11.1053C3.84037 11.5206 3.85629 12.1181 4.7964 12.3878L8.10118 13.3485L15.8533 8.52547C16.2199 8.28796 16.5538 8.42039 16.2799 8.6579L9.50039 15.0005Z" />
                  </svg>
                </div>
                <div>
                  <div className="font-medium">Telegram</div>
                  {hasTelegram && (
                    <div className="text-sm text-muted-foreground">
                      {getTelegramDisplayName()}
                    </div>
                  )}
                </div>
              </div>
              {hasTelegram ? (
                canUnlink ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleTelegramUnlink}
                    disabled={loading !== null || telegramState.status === 'loading'}
                  >
                    {loading === 'unlink-telegram' ? 'Disconnecting...' : 'Disconnect'}
                  </Button>
                ) : (
                  <span className="text-xs text-muted-foreground">Last account</span>
                )
              ) : (
                <Button
                  onClick={handleTelegramLogin}
                  disabled={loading !== null || telegramState.status === 'loading'}
                  size="sm"
                >
                  {loading === 'telegram' || telegramState.status === 'loading' ? 'Connecting...' : 'Connect'}
                </Button>
              )}
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-600 via-pink-600 to-orange-500 rounded-lg flex items-center justify-center overflow-hidden">
                  <svg 
                    className="w-full h-full p-2"
                    viewBox="0 0 512 512"
                    fill="white"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M349.33 69.33a93.62 93.62 0 0193.34 93.34v186.66a93.62 93.62 0 01-93.34 93.34H162.67a93.62 93.62 0 01-93.34-93.34V162.67a93.62 93.62 0 0193.34-93.34h186.66m0-37.33H162.67C90.8 32 32 90.8 32 162.67v186.66C32 421.2 90.8 480 162.67 480h186.66C421.2 480 480 421.2 480 349.33V162.67C480 90.8 421.2 32 349.33 32z"/>
                    <path d="M377.33 162.67a28 28 0 1128-28 27.94 27.94 0 01-28 28zM256 181.33A74.67 74.67 0 11181.33 256 74.75 74.75 0 01256 181.33m0-37.33a112 112 0 10112 112 112 112 0 00-112-112z"/>
                  </svg>
                </div>
                <div>
                  <div className="font-medium">Instagram / Threads</div>
                  {hasInstagram && (
                    <div className="text-sm text-muted-foreground">
                      @{getInstagramUsername()}
                    </div>
                  )}
                </div>
              </div>
              {hasInstagram ? (
                canUnlink ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleInstagramUnlink}
                    disabled={loading !== null}
                  >
                    {loading === 'unlink-instagram' ? 'Disconnecting...' : 'Disconnect'}
                  </Button>
                ) : (
                  <span className="text-xs text-muted-foreground">Last account</span>
                )
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex">
                      <Button
                        onClick={handleInstagramLogin}
                        disabled
                        size="sm"
                        className="pointer-events-none"
                      >
                        {loading === 'instagram' ? 'Connecting...' : 'Connect'}
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    Oops! This feature is taking a short break. Come back soon!
                  </TooltipContent>
                </Tooltip>
              )}
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center overflow-hidden">
                  <img 
                    src="https://cdn.brandfetch.io/id-0D6OFrq/w/400/h/400/theme/dark/icon.jpeg?c=1bxid64Mup7aczewSAYMX&t=1740370965265" 
                    alt="TikTok logo" 
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <div className="font-medium">TikTok</div>
                  {hasTikTok && (
                    <div className="text-sm text-muted-foreground">
                      {getTikTokUsername()}
                    </div>
                  )}
                </div>
              </div>
              {hasTikTok ? (
                canUnlink ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleTikTokUnlink}
                    disabled={loading !== null}
                  >
                    {loading === 'unlink-tiktok' ? 'Disconnecting...' : 'Disconnect'}
                  </Button>
                ) : (
                  <span className="text-xs text-muted-foreground">Last account</span>
                )
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex">
                      <Button
                        onClick={handleTikTokLogin}
                        disabled
                        size="sm"
                        className="pointer-events-none"
                      >
                        {loading === 'tiktok' ? 'Connecting...' : 'Connect'}
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    Oops! This feature is taking a short break. Come back soon!
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>

          <Separator />

          {authenticated && (
            <div className="pt-2">
              <Button
                variant="outline"
                onClick={handleLogout}
                disabled={loading !== null}
                className="w-full"
              >
                <LogOut className="w-4 h-4 mr-2" />
                {loading === 'logout' ? 'Logging out...' : 'Log out'}
              </Button>
            </div>
          )}

          <div className="text-sm text-muted-foreground text-center">
Only users who have logged in to Sendly with Privy can receive or send a gift card via social accounts.          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


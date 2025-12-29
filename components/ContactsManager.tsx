import { useState, useEffect } from 'react';
import { Plus, Trash2, UserPlus, RefreshCw, Twitch, Twitter, Send, User, Heart, ChevronUp, ChevronDown, Users } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Alert, AlertDescription } from './ui/alert';
import { Avatar, AvatarFallback } from './ui/avatar';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { Badge } from './ui/badge';
import { Spinner } from './ui/spinner';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { toast } from 'sonner';
import { usePrivy } from '@privy-io/react-auth';
import { useAccount } from 'wagmi';
import { useNavigate } from 'react-router-dom';
import { apiCall } from '../utils/supabase/client';
import {
  getAllSocialContacts,
  getTwitchContacts,
  getTwitterContacts,
  getTelegramContacts,
  getPersonalContacts,
  syncPersonalContact,
  deletePersonalContact,
  toggleFavoritePersonalContact,
  toggleFavoriteSocialContact,
} from '../utils/supabase/contacts';
import type { TwitchContact } from '../utils/twitch/contactsAPI';
import type { TwitterContact, TelegramContact } from '../utils/supabase/contacts';

export interface Contact {
  name: string;
  wallet?: string;
  source?: 'manual' | 'twitch' | 'twitter' | 'tiktok' | 'instagram' | 'telegram';
  socialId?: string;
  username?: string;
  displayName?: string;
  avatarUrl?: string;
  isFavorite?: boolean;
}

interface ContactsManagerProps {
  contacts: Contact[];
  onContactsChange: (contacts: Contact[]) => void;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word[0]?.toUpperCase())
    .join('')
    .slice(0, 2);
}

function getSourceBadge(source: Contact['source']) {
  if (!source || source === 'manual') return null;
  
  const badges: Record<string, { label: string; icon?: typeof Twitch | typeof Twitter | typeof Send; className: string }> = {
    twitch: { label: 'Twitch', icon: Twitch, className: 'bg-purple-100 text-purple-800' },
    twitter: { label: 'Twitter', icon: Twitter, className: 'bg-blue-100 text-blue-800' },
    tiktok: { label: 'TikTok', className: 'bg-black text-white' },
    instagram: { label: 'Instagram', className: 'bg-pink-100 text-pink-800' },
    telegram: { label: 'Telegram', icon: Send, className: 'bg-sky-100 text-sky-800' },
  };
  
  const badge = badges[source];
  if (!badge) return null;
  
  const Icon = badge.icon;
  return (
    <Badge variant="outline" className={`${badge.className} text-xs`}>
      {Icon && <Icon className="w-3 h-3 mr-1" />}
      {badge.label}
    </Badge>
  );
}

// Helper function to get user ID (wallet address)
// Uses wallet address as user_id for consistency
// Does NOT depend on Privy - only uses wagmi address
const getUserId = (address: string | undefined): string | null => {
  // Use connected wallet address from wagmi (works with or without Privy)
  if (address) {
    return address.toLowerCase();
  }
  
  return null;
};

export function ContactsManager({ contacts, onContactsChange }: ContactsManagerProps) {
  // Privy is optional - only used for social media contacts (Twitch/Twitter)
  // For personal contacts and favorites, we only need wallet address from wagmi
  const { authenticated, user } = usePrivy();
  const { address, isConnected } = useAccount();
  const navigate = useNavigate();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newContact, setNewContact] = useState<Contact>({ name: '', wallet: '' });
  const [syncing, setSyncing] = useState(false);
  const [syncingTwitter, setSyncingTwitter] = useState(false);
  const [syncingTelegram, setSyncingTelegram] = useState(false);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [twitchContacts, setTwitchContacts] = useState<TwitchContact[]>([]);
  const [loadingTwitchContacts, setLoadingTwitchContacts] = useState(false);
  const [twitterContacts, setTwitterContacts] = useState<TwitterContact[]>([]);
  const [loadingTwitterContacts, setLoadingTwitterContacts] = useState(false);
  const [telegramContacts, setTelegramContacts] = useState<TelegramContact[]>([]);
  const [loadingTelegramContacts, setLoadingTelegramContacts] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const twitchAccount = user?.twitch;
  const twitterAccount = user?.twitter;
  const telegramAccount = (user as any)?.telegram as (Record<string, any> | undefined);
  const hasTwitch = !!twitchAccount?.subject;
  const hasTwitter = !!twitterAccount?.subject;
  const hasTelegram = Boolean(telegramAccount?.telegramUserId || telegramAccount?.id || telegramAccount?.subject);

  const loadSocialContacts = async () => {
    try {
      setLoadingContacts(true);
      
      let personalContacts: Contact[] = [];
      let socialContacts: Contact[] = [];

      // Use wallet address as user_id for consistency (doesn't depend on Privy)
      const userId = getUserId(address);
      
      // Load personal contacts from database (works with just wallet address, no Privy needed)
      if (userId) {
        try {
          const loadedContacts = await getPersonalContacts(userId);
          personalContacts = loadedContacts || [];
        } catch (error) {
          console.error('Error loading personal contacts from DB:', error);
          // Fallback to localStorage if DB fails
          const saved = localStorage.getItem('sendly_contacts');
          if (saved) {
            try {
              personalContacts = JSON.parse(saved) as Contact[];
            } catch (e) {
              console.error('Error parsing contacts from localStorage:', e);
            }
          }
        }
      } else {
        // If no wallet connected, try to load from localStorage
        const saved = localStorage.getItem('sendly_contacts');
        if (saved) {
          try {
            personalContacts = JSON.parse(saved) as Contact[];
          } catch (e) {
            console.error('Error parsing contacts from localStorage:', e);
          }
        }
      }

      // Load social contacts only if we have a wallet address
      // Note: Social contacts require Privy OAuth, but favorites work with just wallet
      if (userId) {
        try {
          socialContacts = await getAllSocialContacts(userId);
        } catch (error) {
          console.error('Error loading social contacts:', error);
        }
      }
      
      // Sort: favorites first, then alphabetically
      const updatedContacts = [...personalContacts, ...socialContacts].sort((a, b) => {
        if (a.isFavorite && !b.isFavorite) return -1;
        if (!a.isFavorite && b.isFavorite) return 1;
        return a.name.localeCompare(b.name);
      });
      onContactsChange(updatedContacts);
    } catch (error) {
      console.error('Error loading contacts:', error);
    } finally {
      setLoadingContacts(false);
    }
  };

  const loadTwitterContacts = async () => {
    const userId = getUserId(address);
    // Note: Twitter contacts require Privy OAuth, but we use wallet address as user_id
    if (!authenticated || !userId) return;

    try {
      setLoadingTwitterContacts(true);
      
      // Use wallet address as user_id for loading contacts
      console.log('Loading Twitter contacts for wallet address (user_id):', userId);

      try {
        const response = await apiCall(`/contacts/twitter?userId=${encodeURIComponent(userId)}`, {
          method: 'GET',
        });

        console.log('Server response:', response);

        if (response.success && response.contacts) {
          console.log(`Loaded ${response.contacts.length} Twitter contacts from server`);
          setTwitterContacts(response.contacts);
        } else {
          console.warn('Server endpoint returned unsuccessful response:', response);
          setTwitterContacts([]);
        }
      } catch (serverError) {
        console.error('Server endpoint error:', serverError);
        try {
          const twitterData = await getTwitterContacts(userId);
          console.log(`Loaded ${twitterData.length} Twitter contacts from direct query`);
          setTwitterContacts(twitterData);
        } catch (fallbackError) {
          console.error('Direct query also failed (likely RLS issue):', fallbackError);
          setTwitterContacts([]);
        }
      }
    } catch (error) {
      console.error('Error loading Twitter contacts:', error);
      setTwitterContacts([]);
    } finally {
      setLoadingTwitterContacts(false);
    }
  };

  const loadTelegramContacts = async () => {
    const userId = getUserId(address);
    if (!authenticated || !userId || !hasTelegram) return;

    try {
      setLoadingTelegramContacts(true);

      try {
        const response = await apiCall(`/contacts/telegram?userId=${encodeURIComponent(userId)}`, {
          method: 'GET',
        });

        if (response.success && Array.isArray(response.contacts)) {
          setTelegramContacts(response.contacts as TelegramContact[]);
        } else {
          console.warn('Telegram contacts endpoint returned unexpected response:', response);
          setTelegramContacts([]);
        }
      } catch (serverError) {
        console.error('Telegram server endpoint error:', serverError);
        try {
          const telegramData = await getTelegramContacts(userId);
          console.log(`Loaded ${telegramData.length} Telegram contacts from direct query`);
          setTelegramContacts(telegramData);
        } catch (fallbackError) {
          console.error('Telegram direct query failed:', fallbackError);
          setTelegramContacts([]);
        }
      }
    } catch (error) {
      console.error('Error loading Telegram contacts:', error);
      setTelegramContacts([]);
    } finally {
      setLoadingTelegramContacts(false);
    }
  };

  const loadTwitchContacts = async () => {
    const userId = getUserId(address);
    // Note: Twitch contacts require Privy OAuth, but we use wallet address as user_id
    if (!authenticated || !userId) return;

    try {
      setLoadingTwitchContacts(true);
      
      // Use wallet address as user_id for loading contacts
      console.log('Loading Twitch contacts for wallet address (user_id):', userId);

      // Use server endpoint to get contacts (bypasses RLS issues)
      // The server uses service_role key and can read all data
      try {
        const response = await apiCall(`/contacts/twitch?userId=${encodeURIComponent(userId)}`, {
          method: 'GET',
        });

        console.log('Server response:', response);

        if (response.success && response.contacts) {
          console.log(`Loaded ${response.contacts.length} Twitch contacts from server`);
          setTwitchContacts(response.contacts);
        } else {
          console.warn('Server endpoint returned unsuccessful response:', response);
          setTwitchContacts([]);
        }
      } catch (serverError) {
        console.error('Server endpoint error:', serverError);
        // Fallback: try direct Supabase query with wallet address
        console.log('Trying direct Supabase query with wallet address (user_id):', userId);
        try {
          // Note: This might fail due to RLS, but worth trying
          const twitchData = await getTwitchContacts(userId);
          console.log(`Loaded ${twitchData.length} Twitch contacts from direct query`);
          setTwitchContacts(twitchData);
        } catch (fallbackError) {
          console.error('Direct query also failed (likely RLS issue):', fallbackError);
          setTwitchContacts([]);
        }
      }
    } catch (error) {
      console.error('Error loading Twitch contacts:', error);
      setTwitchContacts([]);
    } finally {
      setLoadingTwitchContacts(false);
    }
  };

  // Migration: Migrate contacts from old user_id (Privy ID or anonymous ID) to wallet address
  useEffect(() => {
    const migrateContactsToWallet = async () => {
      const currentUserId = getUserId(address);
      if (!currentUserId) return;
      
      // Check if we have old contacts with different user_id
      // This will be handled automatically by the Edge Function when searching by wallet
      // But we can proactively migrate if needed
      console.log('[ContactsManager] Current user_id (wallet):', currentUserId);
    };

    migrateContactsToWallet();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address]);

  useEffect(() => {
    // Always load contacts (from DB if wallet connected, from localStorage if not)
    loadSocialContacts();
    
    // Load social media contacts only if authenticated via Privy (for Twitch/Twitter OAuth)
    // Personal contacts work with just wallet connection (no Privy needed)
    if (authenticated) {
      if (hasTwitch) {
        loadTwitchContacts();
      }
      if (hasTwitter) {
        loadTwitterContacts();
      }
      if (hasTelegram) {
        loadTelegramContacts();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticated, hasTwitch, hasTwitter, hasTelegram, address]);

  const handleSyncTwitch = async () => {
    if (!authenticated || !user || !twitchAccount) {
      toast.error('Twitch account not connected');
      return;
    }

    const twitchUserId = twitchAccount.subject;
    if (!twitchUserId) {
      toast.error('Twitch user ID not found');
      return;
    }

    setSyncing(true);
    try {
      const twitchClientId = import.meta.env.VITE_TWITCH_CLIENT_ID;
      if (!twitchClientId) {
        throw new Error('Twitch Client ID not configured');
      }

      // First, try to get token from server via Privy API (this works correctly)
      let accessToken: string | null = null;
      let effectiveTwitchUserId = twitchUserId;

      try {
        console.log('Requesting Twitch token from server via Privy API...');
        console.log('User ID:', user.id);
        
        const tokenResponse = await apiCall('/contacts/get-twitch-token', {
          method: 'POST',
          body: JSON.stringify({
            privyUserId: user.id,
          }),
        });

        console.log('Server response:', JSON.stringify(tokenResponse, null, 2));

        if (tokenResponse.success && tokenResponse.accessToken) {
          accessToken = tokenResponse.accessToken;
          effectiveTwitchUserId = tokenResponse.twitchUserId || twitchUserId;
          console.log('✅ Token received from server via Privy API');
          
          // Save token to localStorage for future use
          if (accessToken) {
            localStorage.setItem('twitch_oauth', accessToken);
            localStorage.setItem('twitch_oauth_token', accessToken);
            console.log('Token saved to localStorage');
          }
        } else {
          // Server didn't return token - Privy doesn't provide OAuth tokens via API
          console.log('Server response indicates no token available');
          console.log('Response details:', {
            success: tokenResponse.success,
            error: tokenResponse.error,
            message: tokenResponse.message,
            twitchUserId: tokenResponse.twitchUserId
          });
          
          // Show helpful message to user
         /* if (tokenResponse.error?.includes('not available')) {
            toast.error(
              'Twitch OAuth token not available through Privy API. ' +
              'Privy does not provide OAuth tokens for security reasons. ' +
              'Please use the Privy dashboard to configure Twitch OAuth scopes.',
              { duration: 6000 }
            );
          }*/
        }
      } catch (error) {
        console.error('Failed to get token from server:', error);
        toast.error('Failed to get Twitch token from server. Please try again later.');
      }

      // If server didn't return token, try localStorage as fallback
      if (!accessToken) {
        const possibleKeys = [
          'twitch_oauth_token',
          'twitch_oauth',
          'twitch_token',
          'twitch_access_token'
        ];
        
        for (const key of possibleKeys) {
          const token = localStorage.getItem(key);
          if (token && token.length > 10) {
            accessToken = token;
            console.log(`Using saved token from localStorage (key: ${key})`);
            break;
          }
        }
      }

      // If still no token, use Implicit Grant Flow (according to Twitch docs)
      // This is for client-side apps without a server
      if (!accessToken) {
        console.log('No token found, starting Twitch Implicit Grant Flow...');
        accessToken = await requestTwitchOAuthTokenImplicitFlow(twitchClientId);
        
        if (accessToken) {
          localStorage.setItem('twitch_oauth', accessToken);
          localStorage.setItem('twitch_oauth_token', accessToken);
          console.log('Token saved to localStorage after OAuth');
        }
      }

      if (!accessToken) {
        throw new Error('Failed to get Twitch access token. Please try again.');
      }

      try {
        // Set wallet address as user_id for saving to DB as user_id
        const walletAddress = getUserId(address);
        const response = await apiCall('/contacts/sync', {
          method: 'POST',
          body: JSON.stringify({
            platform: 'twitch',
            userId: effectiveTwitchUserId, // Twitch user ID for API
            walletAddress: walletAddress, // Wallet for db 
            accessToken: accessToken,
            clientId: twitchClientId,
            privyUserId: user.id,
          }),
        });

        if (response.success) {
          toast.success(`Synced ${response.contactsCount || 0} Twitch contacts`);
          await loadSocialContacts();
          await loadTwitchContacts();
        } else {
          // If error suggests token is invalid, remove it
          if (response.error?.includes('401') || response.error?.includes('unauthorized') || response.error?.includes('invalid token')) {
            console.log('Token appears to be invalid, removing from localStorage');
            localStorage.removeItem('twitch_oauth_token');
            throw new Error('Token expired. Please sync again.');
          }
          throw new Error(response.error || 'Sync failed');
        }
      } catch (syncError: any) {
        // If sync fails with 401, token might be invalid
        if (syncError?.message?.includes('401') || syncError?.message?.includes('unauthorized')) {
          console.log('Sync failed with 401, token might be invalid. Removing from localStorage');
          localStorage.removeItem('twitch_oauth_token');
          throw new Error('Token expired. Please sync again.');
        }
        throw syncError;
      }
    } catch (error) {
      console.error('Error syncing Twitch contacts:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to sync contacts';
      toast.error(errorMessage);
    } finally {
      setSyncing(false);
    }
  };

  // Twitch Implicit Grant Flow (for client-side apps)
  // According to Twitch docs: https://dev.twitch.tv/docs/authentication/getting-tokens-oauth/#implicit-grant-flow
  const requestTwitchOAuthTokenImplicitFlow = async (clientId: string): Promise<string | null> => {
    return new Promise((resolve) => {
      // IMPORTANT: redirect_uri must be registered in Twitch Developer Console
      // Go to https://dev.twitch.tv/console/apps and add this redirect URI to your app
      const redirectUri = `${window.location.origin}/auth/twitch/callback`;
      const scopes = 'user:read:follows';
      const state = Math.random().toString(36).substring(7);
      
      // Store state for validation
      sessionStorage.setItem('twitch_oauth_state', state);
      sessionStorage.setItem('twitch_oauth_redirect', window.location.href);

      // Implicit grant flow uses response_type=token
      const authUrl = `https://id.twitch.tv/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=${encodeURIComponent(scopes)}&state=${state}`;

      console.log('Opening Twitch OAuth (Implicit Grant Flow)...');
      console.log('Make sure redirect_uri is registered in Twitch Developer Console:', redirectUri);
      toast.info('Opening Twitch authorization...');
      
      // Open OAuth window
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      
      const popup = window.open(
        authUrl,
        'Twitch OAuth',
        `width=${width},height=${height},left=${left},top=${top},toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes`
      );

      if (!popup) {
        toast.error('Popup blocked. Please allow popups for this site.');
        resolve(null);
        return;
      }

      // Listen for message from popup callback route
      const messageHandler = (event: MessageEvent) => {
        // Filter out MetaMask and other extension messages
        if (event.data?.target === 'metamask-inpage' || event.data?.name === 'metamask-provider') {
          return;
        }
        
        if (event.origin !== window.location.origin) {
          return;
        }
        
        if (event.data && typeof event.data === 'object' && event.data.type === 'twitch_oauth_token' && event.data.accessToken) {
          const token = event.data.accessToken;
          console.log('✅ Received token via postMessage:', token.substring(0, 20) + '...');
          
          localStorage.setItem('twitch_oauth', token);
          localStorage.setItem('twitch_oauth_token', token);
          
          window.removeEventListener('message', messageHandler);
          if (popup) popup.close();
          resolve(token);
        } else if (event.data && typeof event.data === 'object' && event.data.type === 'twitch_oauth_error') {
          console.error('OAuth error received:', event.data);
          window.removeEventListener('message', messageHandler);
          if (popup) popup.close();
          resolve(null);
        }
      };

      window.addEventListener('message', messageHandler);

      // Check localStorage periodically (callback route saves token there)
      const checkStorage = setInterval(() => {
        const token = localStorage.getItem('twitch_oauth_token') || localStorage.getItem('twitch_oauth');
        if (token && token.length > 10) {
          console.log('Token found in localStorage during polling');
          clearInterval(checkStorage);
          window.removeEventListener('message', messageHandler);
          if (popup) popup.close();
          resolve(token);
        }
      }, 500);

      // Check if popup was closed
      const checkPopup = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkPopup);
          clearInterval(checkStorage);
          window.removeEventListener('message', messageHandler);
          const token = localStorage.getItem('twitch_oauth_token') || localStorage.getItem('twitch_oauth');
          if (token && token.length > 10) {
            resolve(token);
          } else {
            console.log('Popup closed without token');
            resolve(null);
          }
        }
      }, 1000);
    });
  };

  const handleSyncTwitter = async () => {
    if (!authenticated || !user || !twitterAccount) {
      toast.error('Twitter account not connected');
      return;
    }

    const twitterUserId = twitterAccount.subject;
    if (!twitterUserId) {
      toast.error('Twitter user ID not found');
      return;
    }

    setSyncingTwitter(true);
    try {
      let accessToken: string | null = null;
      let effectiveTwitterUserId = twitterUserId;

      try {
        console.log('Requesting Twitter token from server via Privy API...');
        
        const tokenResponse = await apiCall('/contacts/get-twitter-token', {
          method: 'POST',
          body: JSON.stringify({
            privyUserId: user.id,
          }),
        });

        console.log('Server response:', JSON.stringify(tokenResponse, null, 2));

        if (tokenResponse.success && tokenResponse.accessToken) {
          accessToken = tokenResponse.accessToken;
          effectiveTwitterUserId = tokenResponse.twitterUserId || twitterUserId;
          console.log('✅ Token received from server via Privy API');
          
          if (accessToken) {
            localStorage.setItem('twitter_oauth', accessToken);
            localStorage.setItem('twitter_oauth_token', accessToken);
            console.log('Token saved to localStorage');
          }
        } else {
          console.log('Server response indicates no token available');
        }
      } catch (error) {
        console.error('Failed to get token from server:', error);
      }

      if (!accessToken) {
        const possibleKeys = [
          'twitter_oauth_token',
          'twitter_oauth',
          'twitter_token',
          'twitter_access_token'
        ];
        
        for (const key of possibleKeys) {
          const token = localStorage.getItem(key);
          if (token && token.length > 10) {
            accessToken = token;
            console.log(`Using saved token from localStorage (key: ${key})`);
            break;
          }
        }
      }

      if (!accessToken) {
        console.log('No token found, attempting to use Privy for Twitter authorization...');
        
        // Try to use Privy's linkTwitter method if available
        // This will use Privy's redirect URI which is already configured
        try {
          // Check if Privy SDK has linkTwitter method
          if (typeof window !== 'undefined' && (window as any).privy) {
            toast.info('Redirecting to Twitter authorization via Privy...');
            // Privy will handle the OAuth flow with their redirect URI
            // After authorization, the token should be available through Privy
            // Note: Privy doesn't expose tokens directly, so we'll need to fallback
            // to direct OAuth if this doesn't work
          }
        } catch (privyError) {
          console.log('Privy linkTwitter not available, using direct OAuth flow');
        }
        
        // Fallback to direct OAuth flow
        console.log('Starting direct Twitter OAuth flow...');
        accessToken = await requestTwitterOAuthTokenFlow();
        
        if (accessToken) {
          localStorage.setItem('twitter_oauth', accessToken);
          localStorage.setItem('twitter_oauth_token', accessToken);
          console.log('Token saved to localStorage after OAuth');
        }
      }

      if (!accessToken) {
        throw new Error('Failed to get Twitter access token. Please try again.');
      }

      try {
        // Set wallet address as user_id for saving to DB as user_id
        const walletAddress = getUserId(address);
        const response = await apiCall('/contacts/sync', {
          method: 'POST',
          body: JSON.stringify({
            platform: 'twitter',
            userId: effectiveTwitterUserId, // Twitter user ID for API
            walletAddress: walletAddress, // Wallet for db 
            accessToken: accessToken,
            privyUserId: user.id,
          }),
        });

        if (response.success) {
          toast.success(`Synced ${response.contactsCount || 0} Twitter contacts`);
          await loadSocialContacts();
          await loadTwitterContacts();
                  } else {
            if (response.error?.includes('401') || response.error?.includes('403') || response.error?.includes('unauthorized') || response.error?.includes('Forbidden') || response.error?.includes('invalid token')) {
              console.log('Token appears to be invalid or missing required scopes, removing from localStorage');
              localStorage.removeItem('twitter_oauth_token');
              localStorage.removeItem('twitter_oauth');
              throw new Error('Token expired or missing required permissions. Please authorize Twitter again with required scopes (users.read, follows.read).');
            }
            throw new Error(response.error || 'Sync failed');
          }
        } catch (syncError: any) {
          if (syncError?.message?.includes('401') || syncError?.message?.includes('403') || syncError?.message?.includes('unauthorized') || syncError?.message?.includes('Forbidden')) {
            console.log('Sync failed with 401/403, token might be invalid or missing scopes. Removing from localStorage');
            localStorage.removeItem('twitter_oauth_token');
            localStorage.removeItem('twitter_oauth');
            throw new Error('Twitter token expired or missing required permissions (follows.read scope). Please click "Sync Twitter" again to re-authorize.');
          }
          throw syncError;
      }
    } catch (error) {
      console.error('Error syncing Twitter contacts:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to sync contacts';
      toast.error(errorMessage);
    } finally {
      setSyncingTwitter(false);
    }
  };

  const handleSyncTelegram = async () => {
    if (!authenticated || !user || !telegramAccount) {
      toast.error('Telegram account not connected');
      return;
    }

    const telegramUserId = telegramAccount.telegramUserId || telegramAccount.id || telegramAccount.subject;
    if (!telegramUserId) {
      toast.error('Telegram user ID not found');
      return;
    }

    const walletAddress = getUserId(address);
    if (!walletAddress) {
      toast.error('Wallet address not found. Please connect your wallet.');
      return;
    }

    setSyncingTelegram(true);

    try {
      const requestBody: Record<string, unknown> = {
        platform: 'telegram',
        userId: telegramUserId,
        walletAddress,
        privyUserId: user.id,
        telegramUsername: telegramAccount.username || null,
        telegramProfile: telegramAccount,
      };

      if (telegramAccount.authData) {
        requestBody.authData = telegramAccount.authData;
      } else if (telegramAccount.auth) {
        requestBody.authData = telegramAccount.auth;
      }

      if (telegramAccount.accessToken) {
        requestBody.accessToken = telegramAccount.accessToken;
      }

      if (telegramAccount.session) {
        requestBody.session = telegramAccount.session;
      }

      if (Array.isArray(telegramAccount.contacts)) {
        requestBody.contacts = telegramAccount.contacts;
      }

      if (telegramAccount.initDataRaw) {
        requestBody.telegramAuthData = telegramAccount.initDataRaw;
      }

      const response = await apiCall('/contacts/sync', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      if (response.success) {
        toast.success(`Synced ${response.contactsCount || 0} Telegram contacts`);
        await loadSocialContacts();
        await loadTelegramContacts();
      } else {
        throw new Error(response.error || 'Telegram sync failed');
      }
    } catch (error) {
      console.error('Error syncing Telegram contacts:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to sync Telegram contacts';
      toast.error(errorMessage);
    } finally {
      setSyncingTelegram(false);
    }
  };

  const requestTwitterOAuthTokenFlow = async (): Promise<string | null> => {
    return new Promise((resolve) => {
      const twitterClientId = import.meta.env.VITE_TWITTER_CLIENT_ID;
      if (!twitterClientId) {
        toast.error('Twitter Client ID not configured');
        resolve(null);
        return;
      }

      const redirectUri = `${window.location.origin}/auth/twitter/callback`;
      // Twitter requires scopes to be space-separated in the URL, not plus-separated
      // But we encode it, so it doesn't matter
      const scopes = 'users.read follows.read offline.access';
      const state = Math.random().toString(36).substring(7);
      
      // Generate code_verifier for PKCE (43-128 characters, URL-safe)
      const generateCodeVerifier = (): string => {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return btoa(String.fromCharCode(...array))
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=/g, '');
      };

      // Generate code_challenge using S256 (SHA256)
      const generateCodeChallenge = async (verifier: string): Promise<string> => {
        const encoder = new TextEncoder();
        const data = encoder.encode(verifier);
        const digest = await crypto.subtle.digest('SHA-256', data);
        return btoa(String.fromCharCode(...new Uint8Array(digest)))
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=/g, '');
      };

      const codeVerifier = generateCodeVerifier();
      
      generateCodeChallenge(codeVerifier).then((codeChallenge) => {
        sessionStorage.setItem('twitter_oauth_state', state);
        sessionStorage.setItem('twitter_oauth_redirect', window.location.href);
        sessionStorage.setItem('twitter_code_verifier', codeVerifier);

        const authUrl = `https://x.com/i/oauth2/authorize?redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scopes)}&state=${state}&code_challenge=${codeChallenge}&code_challenge_method=S256&client_id=${encodeURIComponent(twitterClientId)}`;

        console.log('Opening Twitter OAuth...');
        console.log('Redirect URI:', redirectUri);
        console.log('Full auth URL:', authUrl);
        console.log('Client ID:', twitterClientId);
        console.log('Scopes:', scopes);
        console.log('State:', state);
        console.log('Code Challenge:', codeChallenge);
        console.log('⚠️ IMPORTANT: Make sure the following is configured in Twitter Developer Console:');
        console.log('  1. Redirect URI is registered:', redirectUri);
        console.log('  2. App type is set to "OAuth 2.0"');
        console.log('  3. Client ID matches:', twitterClientId);
        console.log('  4. App permissions include: users.read, follows.read');
        console.log('');
        console.log('💡 NOTE: If you want to avoid registering your own redirect URI,');
        console.log('   you can use Privy SDK to link Twitter account (but Privy doesn\'t expose tokens).');
        console.log('   You need to register this redirect URI for your Twitter app:', redirectUri);
        toast.info('Opening Twitter authorization...');
        
        const width = 600;
        const height = 700;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;
        
        const popup = window.open(
          authUrl,
          'Twitter OAuth',
          `width=${width},height=${height},left=${left},top=${top},toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes`
        );

        if (!popup) {
          toast.error('Popup blocked. Please allow popups for this site.');
          resolve(null);
          return;
        }

        const messageHandler = (event: MessageEvent) => {
          if (event.data?.target === 'metamask-inpage' || event.data?.name === 'metamask-provider') {
            return;
          }
          
          if (event.origin !== window.location.origin) {
            return;
          }
          
          if (event.data && typeof event.data === 'object' && event.data.type === 'twitter_oauth_token' && event.data.accessToken) {
            const token = event.data.accessToken;
            console.log('✅ Received token via postMessage:', token.substring(0, 20) + '...');
            
            localStorage.setItem('twitter_oauth', token);
            localStorage.setItem('twitter_oauth_token', token);
            
            window.removeEventListener('message', messageHandler);
            if (popup) popup.close();
            resolve(token);
          } else if (event.data && typeof event.data === 'object' && event.data.type === 'twitter_oauth_error') {
            console.error('OAuth error received:', event.data);
            window.removeEventListener('message', messageHandler);
            if (popup) popup.close();
            resolve(null);
          }
        };

        window.addEventListener('message', messageHandler);

        const checkStorage = setInterval(() => {
          const token = localStorage.getItem('twitter_oauth_token') || localStorage.getItem('twitter_oauth');
          if (token && token.length > 10) {
            console.log('Token found in localStorage during polling');
            clearInterval(checkStorage);
            window.removeEventListener('message', messageHandler);
            if (popup) popup.close();
            resolve(token);
          }
        }, 500);

        const checkPopup = setInterval(() => {
          if (popup?.closed) {
            clearInterval(checkPopup);
            clearInterval(checkStorage);
            window.removeEventListener('message', messageHandler);
            const token = localStorage.getItem('twitter_oauth_token') || localStorage.getItem('twitter_oauth');
            if (token && token.length > 10) {
              resolve(token);
            } else {
              console.log('Popup closed without token');
              resolve(null);
            }
          }
        }, 1000);
      }).catch((error) => {
        console.error('Error generating code challenge:', error);
        toast.error('Failed to initialize Twitter OAuth');
        resolve(null);
      });
    });
  };

  const handleAddContact = async () => {
    if (!newContact.name.trim() || !newContact.wallet?.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    if (!newContact.wallet?.startsWith('0x') || newContact.wallet.length !== 42) {
      toast.error('Invalid wallet address format (must start with 0x and be 42 characters)');
      return;
    }

    const contact: Contact = {
      name: newContact.name.trim(),
      wallet: newContact.wallet.trim(),
      source: 'manual',
    };

    try {
      // Use wallet address as user_id (doesn't depend on Privy)
      // If no wallet connected, use the contact's wallet as user_id (for anonymous users)
      const userId = getUserId(address) || contact.wallet?.toLowerCase();
      
      if (!userId || !contact.wallet) {
        throw new Error('Wallet address is required. Please connect your wallet or provide a wallet address.');
      }
      
      try {
        console.log('Attempting to save contact to DB:', { userId, authenticated, contact });
        await syncPersonalContact(userId, {
          name: contact.name,
          wallet: contact.wallet,
        });
        console.log('Contact saved to DB successfully');
      } catch (dbError) {
        console.error('Failed to save to DB, falling back to localStorage:', dbError);
        // Fallback to localStorage if DB save fails
        const saved = localStorage.getItem('sendly_contacts');
        const existingContacts = saved ? JSON.parse(saved) as Contact[] : [];
        const updatedContacts = [...existingContacts, contact];
        localStorage.setItem('sendly_contacts', JSON.stringify(updatedContacts));
        toast.warning('Contact saved locally (database unavailable)');
      }

      const updated = [...contacts, contact];
      onContactsChange(updated);
      setNewContact({ name: '', wallet: '' });
      setIsDialogOpen(false);
      toast.success('Contact added');
    } catch (error) {
      console.error('Error adding contact:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to add contact');
    }
  };

  const handleDeleteContact = async (index: number) => {
    const contact = contacts[index];
    if (contact.source && contact.source !== 'manual') {
      toast.error('Social contacts cannot be deleted. Unfollow them on the platform.');
      return;
    }

    if (!contact.wallet) {
      toast.error('Cannot delete contact: wallet address missing');
      return;
    }

    try {
      // Use wallet address as user_id (doesn't depend on Privy)
      const userId = getUserId(address) || contact.wallet?.toLowerCase();
      
      if (!userId) {
        throw new Error('Cannot identify user. Please connect your wallet.');
      }
      
      try {
        await deletePersonalContact(userId, contact.wallet);
      } catch (dbError) {
        console.error('Failed to delete from DB, trying localStorage:', dbError);
        // Fallback to localStorage if DB delete fails
        const saved = localStorage.getItem('sendly_contacts');
        if (saved) {
          try {
            const existingContacts = JSON.parse(saved) as Contact[];
            const updatedContacts = existingContacts.filter(
              c => c.wallet !== contact.wallet
            );
            localStorage.setItem('sendly_contacts', JSON.stringify(updatedContacts));
          } catch (e) {
            console.error('Error updating localStorage:', e);
          }
        }
      }

      const updated = contacts.filter((_, i) => i !== index);
      onContactsChange(updated);
      toast.success('Contact deleted');
    } catch (error) {
      console.error('Error deleting contact:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete contact');
    }
  };

  const handleToggleFavorite = async (contact: Contact) => {
    // Use wallet address as user_id (doesn't depend on Privy)
    const userId = getUserId(address);
    
    if (!userId || !isConnected) {
      toast.error('Please connect your wallet to mark contacts as favorite');
      return;
    }

    const newFavoriteStatus = !contact.isFavorite;

    try {
      if (contact.source === 'manual' && contact.wallet) {
        // Personal contact - use wallet address as user_id
        await toggleFavoritePersonalContact(userId, contact.wallet, newFavoriteStatus);
      } else if (contact.source && contact.source !== 'manual' && contact.socialId) {
        // Social contact - use wallet address as user_id
        await toggleFavoriteSocialContact(
          userId,
          contact.source,
          contact.socialId,
          newFavoriteStatus
        );
      } else {
        toast.error('Cannot update favorite status for this contact');
        return;
      }

      // Reload contacts to get updated order from DB
      await loadSocialContacts();
      
      if (contact.source === 'twitch') {
        await loadTwitchContacts();
      } else if (contact.source === 'twitter') {
        await loadTwitterContacts();
      } else if (contact.source === 'telegram') {
        await loadTelegramContacts();
      }
      
      toast.success(newFavoriteStatus ? 'Contact added to favorites' : 'Contact removed from favorites');
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update favorite status');
    }
  };

  return (
    <Card className="bg-white/90 backdrop-blur-sm border border-gray-200 shadow-circle-card">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-50 border border-blue-100">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold">Contacts</CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Manage your contacts for voice commands
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isOpen && hasTwitch && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSyncTwitch}
                  disabled={syncing || !authenticated}
                  className="h-8"
                >
                  {syncing ? <Spinner className="w-3.5 h-3.5 mr-1.5" /> : <RefreshCw className="w-3.5 h-3.5 mr-1.5" />}
                  Sync Twitch
                </Button>
              )}
              {isOpen && hasTelegram && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleSyncTelegram}
                        disabled
                        className="h-8 pointer-events-none"
                      >
                        {syncingTelegram ? <Spinner className="w-3.5 h-3.5 mr-1.5" /> : <RefreshCw className="w-3.5 h-3.5 mr-1.5" />}
                        Sync Telegram
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    Oops! This feature is taking a short break. Come back soon!
                  </TooltipContent>
                </Tooltip>
              )}
              {isOpen && hasTwitter && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleSyncTwitter}
                        disabled
                        className="h-8 pointer-events-none"
                      >
                        {syncingTwitter ? <Spinner className="w-3.5 h-3.5 mr-1.5" /> : <RefreshCw className="w-3.5 h-3.5 mr-1.5" />}
                        Sync Twitter
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                  Oops! This feature is taking a short break. Come back soon!
                  </TooltipContent>
                </Tooltip>
              )}
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                >
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>
        </CardHeader>
        
        <CollapsibleContent>
          <CardContent className="space-y-5 pt-0">
            {hasTwitch && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded bg-purple-50">
                    <Twitch className="w-4 h-4 text-purple-600" />
                  </div>
                  <p className="text-sm font-semibold">Twitch</p>
                </div>
                {loadingTwitchContacts ? (
                  <Alert>
                    <AlertDescription>Loading Twitch contacts...</AlertDescription>
                  </Alert>
                ) : twitchContacts.length === 0 ? (
                  <Alert>
                    <AlertDescription>
                      No contacts found. Click "Sync Twitch" to sync.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <ScrollArea className="h-[200px]">
                    <div className="space-y-2 pr-4">
                      {twitchContacts.map((contact, index) => {
                        const isFavorite = (contact as any).is_favorite || false;
                        return (
                          <div key={`twitch-${contact.broadcaster_name}-${index}`}>
                            <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors">
                              <div className="flex items-center gap-3 flex-1">
                                <Avatar className="h-10 w-10">
                                  <AvatarFallback className="bg-purple-500 text-white">
                                    {getInitials(contact.broadcaster_name)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span 
                                      className="font-medium cursor-pointer hover:text-purple-600 transition-colors"
                                      onClick={() => {
                                        localStorage.setItem('selectedGiftCardRecipient', JSON.stringify({
                                          type: 'twitch',
                                          username: contact.broadcaster_login,
                                          displayName: contact.broadcaster_name
                                        }));
                                        navigate('/create');
                                        toast.success(`Selected ${contact.broadcaster_name} for gift card`);
                                      }}
                                    >
                                      {contact.broadcaster_name}
                                    </span>
                                    <Badge variant="outline" className="bg-purple-100 text-purple-800 text-xs">
                                      <Twitch className="w-3 h-3 mr-1" />
                                      Twitch
                                    </Badge>
                                  </div>
                                  <div 
                                    className="text-sm text-gray-500 cursor-pointer hover:text-purple-600 transition-colors"
                                    onClick={() => {
                                      localStorage.setItem('selectedGiftCardRecipient', JSON.stringify({
                                        type: 'twitch',
                                        username: contact.broadcaster_login,
                                        displayName: contact.broadcaster_name
                                      }));
                                      navigate('/create');
                                      toast.success(`Selected ${contact.broadcaster_login} for gift card`);
                                    }}
                                  >
                                    {contact.broadcaster_login}
                                  </div>
                                </div>
                              </div>
                              {isConnected && address && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    const contactObj: Contact = {
                                      name: contact.broadcaster_name,
                                      source: 'twitch',
                                      socialId: contact.broadcaster_id,
                                      username: contact.broadcaster_login,
                                      displayName: contact.broadcaster_name,
                                      isFavorite: isFavorite,
                                    };
                                    handleToggleFavorite(contactObj);
                                  }}
                                  className={`p-1 ${isFavorite ? 'text-red-500 hover:text-red-600' : 'text-gray-400 hover:text-red-500'}`}
                                >
                                  <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
                                </Button>
                              )}
                            </div>
                            {index < twitchContacts.length - 1 && <Separator className="my-2" />}
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                )}
              </div>
            )}
            {hasTelegram && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded bg-sky-50">
                    <Send className="w-4 h-4 text-sky-600" />
                  </div>
                  <p className="text-sm font-semibold">Telegram</p>
                </div>
                {loadingTelegramContacts ? (
                  <Alert>
                    <AlertDescription>Loading Telegram contacts...</AlertDescription>
                  </Alert>
                ) : telegramContacts.length === 0 ? (
                  <Alert>
                    <AlertDescription>
                      No contacts found. Click "Sync Telegram" to sync.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <ScrollArea className="h-[200px]">
                    <div className="space-y-2 pr-4">
                      {telegramContacts.map((contact, index) => {
                        const isFavorite = (contact as any).is_favorite || contact.is_favorite || false;
                        const usernameLabel = contact.username ? `@${contact.username}` : contact.telegram_user_id;
                        const displayLabel = contact.display_name || usernameLabel;
                        return (
                          <div key={`telegram-${contact.telegram_user_id}-${index}`}>
                            <div className="flex items-center justify-between p-3 bg-sky-50 rounded-lg hover:bg-sky-100 transition-colors">
                              <div className="flex items-center gap-3 flex-1">
                                <Avatar className="h-10 w-10">
                                  <AvatarFallback className="bg-sky-500 text-white">
                                    {getInitials(displayLabel)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span
                                      className="font-medium cursor-pointer hover:text-sky-600 transition-colors"
                                      onClick={() => {
                                        localStorage.setItem('selectedGiftCardRecipient', JSON.stringify({
                                          type: 'telegram',
                                          username: contact.username || contact.telegram_user_id,
                                          displayName: displayLabel,
                                        }));
                                        navigate('/create');
                                        toast.success(`Selected ${displayLabel} for gift card`);
                                      }}
                                    >
                                      {displayLabel}
                                    </span>
                                    <Badge variant="outline" className="bg-sky-100 text-sky-800 text-xs">
                                      <Send className="w-3 h-3 mr-1" />
                                      Telegram
                                    </Badge>
                                  </div>
                                  <div className="flex flex-wrap gap-2 text-sm text-gray-500">
                                    <span className="cursor-pointer hover:text-sky-600 transition-colors"
                                      onClick={() => {
                                        localStorage.setItem('selectedGiftCardRecipient', JSON.stringify({
                                          type: 'telegram',
                                          username: contact.username || contact.telegram_user_id,
                                          displayName: displayLabel,
                                        }));
                                        navigate('/create');
                                        toast.success(`Selected ${usernameLabel} for gift card`);
                                      }}
                                    >
                                      {usernameLabel}
                                    </span>
                                    {contact.phone_number && (
                                      <span className="text-xs text-gray-400">
                                        {contact.phone_number}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              {isConnected && address && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    const contactObj: Contact = {
                                      name: displayLabel,
                                      source: 'telegram',
                                      socialId: contact.telegram_user_id,
                                      username: contact.username || contact.telegram_user_id,
                                      displayName: displayLabel,
                                      avatarUrl: contact.avatar_url || undefined,
                                      isFavorite: isFavorite,
                                    };
                                    handleToggleFavorite(contactObj);
                                  }}
                                  className={`p-1 ${isFavorite ? 'text-red-500 hover:text-red-600' : 'text-gray-400 hover:text-red-500'}`}
                                >
                                  <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
                                </Button>
                              )}
                            </div>
                            {index < telegramContacts.length - 1 && <Separator className="my-2" />}
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                )}
              </div>
            )}
            
            {hasTwitter && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded bg-blue-50">
                    <Twitter className="w-4 h-4 text-blue-600" />
                  </div>
                  <p className="text-sm font-semibold">Twitter</p>
                </div>
                {loadingTwitterContacts ? (
                  <Alert>
                    <AlertDescription>Loading Twitter contacts...</AlertDescription>
                  </Alert>
                ) : twitterContacts.length === 0 ? (
                  <Alert>
                    <AlertDescription>
                      No contacts found. Click "Sync Twitter" to sync.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <ScrollArea className="h-[200px]">
                    <div className="space-y-2 pr-4">
                      {twitterContacts.map((contact, index) => {
                        const isFavorite = (contact as any).is_favorite || false;
                        return (
                          <div key={`twitter-${contact.username}-${index}`}>
                            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                              <div className="flex items-center gap-3 flex-1">
                                <Avatar className="h-10 w-10">
                                  <AvatarFallback className="bg-blue-500 text-white">
                                    {getInitials(contact.display_name)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span 
                                      className="font-medium cursor-pointer hover:text-blue-600 transition-colors"
                                      onClick={() => {
                                        localStorage.setItem('selectedGiftCardRecipient', JSON.stringify({
                                          type: 'twitter',
                                          username: contact.username,
                                          displayName: contact.display_name
                                        }));
                                        navigate('/create');
                                        toast.success(`Selected ${contact.display_name} for gift card`);
                                      }}
                                    >
                                      {contact.display_name}
                                    </span>
                                    <Badge variant="outline" className="bg-blue-100 text-blue-800 text-xs">
                                      <Twitter className="w-3 h-3 mr-1" />
                                      Twitter
                                    </Badge>
                                  </div>
                                  <div 
                                    className="text-sm text-gray-500 cursor-pointer hover:text-blue-600 transition-colors"
                                    onClick={() => {
                                      localStorage.setItem('selectedGiftCardRecipient', JSON.stringify({
                                        type: 'twitter',
                                        username: contact.username,
                                        displayName: contact.display_name
                                      }));
                                      navigate('/create');
                                      toast.success(`Selected @${contact.username} for gift card`);
                                    }}
                                  >
                                    @{contact.username}
                                  </div>
                                </div>
                              </div>
                              {isConnected && address && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    const contactObj: Contact = {
                                      name: contact.display_name,
                                      source: 'twitter',
                                      socialId: contact.twitter_user_id,
                                      username: contact.username,
                                      displayName: contact.display_name,
                                      isFavorite: isFavorite,
                                    };
                                    handleToggleFavorite(contactObj);
                                  }}
                                  className={`p-1 ${isFavorite ? 'text-red-500 hover:text-red-600' : 'text-gray-400 hover:text-red-500'}`}
                                >
                                  <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
                                </Button>
                              )}
                            </div>
                            {index < twitterContacts.length - 1 && <Separator className="my-2" />}
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                )}
              </div>
            )}
            
            <Separator />
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded bg-gray-50">
                    <User className="w-4 h-4 text-gray-600" />
                  </div>
                  <p className="text-sm font-semibold">Personal Contacts</p>
                </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Add
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Contact</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <Label htmlFor="contact-name">Name</Label>
                    <Input
                      id="contact-name"
                      placeholder="Alice"
                      value={newContact.name}
                      onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="contact-wallet">Wallet Address</Label>
                    <Input
                      id="contact-wallet"
                      placeholder="0x..."
                      value={newContact.wallet || ''}
                      onChange={(e) => setNewContact({ ...newContact, wallet: e.target.value })}
                      className="mt-2"
                    />
                  </div>
                  <Button onClick={handleAddContact} className="w-full">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add Contact
                  </Button>
                </div>
              </DialogContent>
              </Dialog>
            </div>
            {loadingContacts ? (
              <Alert>
                <AlertDescription>Loading contacts...</AlertDescription>
              </Alert>
            ) : contacts.length === 0 ? (
              <Alert>
                <AlertDescription>
                  You don't have any Personal contacts yet. Add contacts manually or sync from social media.
                </AlertDescription>
              </Alert>
            ) : (
              <ScrollArea className="h-[300px]">
                <div className="space-y-2 pr-4">
                  {contacts.map((contact, index) => (
                    <div key={`${contact.source || 'manual'}-${contact.socialId || contact.name}-${index}`}>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <div className="flex items-center gap-3 flex-1">
                          <Avatar className="h-10 w-10">
                            {contact.avatarUrl ? (
                              <img src={contact.avatarUrl} alt={contact.name} />
                            ) : (
                              <AvatarFallback className="bg-primary text-primary-foreground">
                                {getInitials(contact.name)}
                              </AvatarFallback>
                            )}
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span 
                                className="font-medium cursor-pointer hover:text-blue-600 transition-colors"
                                onClick={() => {
                                  if (contact.wallet) {
                                    localStorage.setItem('selectedGiftCardRecipient', JSON.stringify({
                                      type: 'address',
                                      address: contact.wallet,
                                      displayName: contact.name
                                    }));
                                    navigate('/create');
                                    toast.success(`Selected ${contact.name} for gift card`);
                                  }
                                }}
                              >
                                {contact.name}
                              </span>
                              {getSourceBadge(contact.source)}
                            </div>
                            {contact.wallet ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div 
                                    className="text-sm text-gray-500 font-mono cursor-pointer hover:text-blue-600 transition-colors"
                                    onClick={() => {
                                      if (contact.wallet) {
                                        localStorage.setItem('selectedGiftCardRecipient', JSON.stringify({
                                          type: 'address',
                                          address: contact.wallet,
                                          displayName: contact.name
                                        }));
                                        navigate('/create');
                                        toast.success(`Selected ${contact.wallet.slice(0, 6)}...${contact.wallet.slice(-4)} for gift card`);
                                      }
                                    }}
                                  >
                                    {contact.wallet.slice(0, 6)}...{contact.wallet.slice(-4)}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {contact.wallet}
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              <div className="text-sm text-gray-400 italic">Not linked</div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {isConnected && address && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleToggleFavorite(contact)}
                              className={`p-1 ${contact.isFavorite ? 'text-red-500 hover:text-red-600' : 'text-gray-400 hover:text-red-500'}`}
                            >
                              <Heart className={`w-4 h-4 ${contact.isFavorite ? 'fill-current' : ''}`} />
                            </Button>
                          )}
                          {contact.source === 'manual' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteContact(index)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                      {index < contacts.length - 1 && <Separator className="my-2" />}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
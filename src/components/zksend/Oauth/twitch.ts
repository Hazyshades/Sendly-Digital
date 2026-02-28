import { toast } from 'sonner';
import { createPopupWindow } from './utils';

/**
 * Request Twitch OAuth token using implicit flow (response_type=token).
 * 
 * ⚠️ IMPORTANT: If Privy intercepts the OAuth flow and redirects to auth.privy.io, 
 * this is because the Twitch OAuth app has a redirect_uri configured to Privy.
 * 
 * To fix this:
 * 1. Go to Twitch Developer Console: https://dev.twitch.tv/console/apps
 * 2. Find your app (Client ID: qcum1p3m4kwchaf238bh69dw2y2dqd)
 * 3. In "OAuth Redirect URLs" section:
 *    - REMOVE: https://auth.privy.io/api/v1/oauth/callback
 *    - ADD: http://zk.localhost:3000/auth/twitch/callback
 * 4. Save changes
 * 5. Verify that the Client ID matches VITE_TWITCH_CLIENT_ID in your .env file
 * 
 * The redirect URL MUST match exactly what's configured in Twitch Developer Console.
 * If Privy URL is present, Twitch will redirect there instead of your app.
 */
export const requestTwitchOAuthTokenImplicitFlow = async (clientId: string): Promise<string | null> => {
  return new Promise((resolve) => {
    // Twitch requires HTTPS for redirect URIs, so use https:// even for localhost
    // Convert http://zk.localhost:3000 to https://zk.localhost:3000 for Twitch OAuth
    const origin = window.location.origin;
    const redirectUri = origin.startsWith('http://') && (origin.includes('localhost') || origin.includes('zk.localhost'))
      ? origin.replace('http://', 'https://') + '/auth/twitch/callback'
      : `${origin}/auth/twitch/callback`;
    const scopes = 'user:read:email';
    const state = Math.random().toString(36).substring(7);
    
    console.log('[zkSEND] Twitch OAuth redirect URI:', redirectUri, '(original origin:', origin, ')');

    sessionStorage.setItem('twitch_oauth_state', state);
    sessionStorage.setItem('twitch_oauth_redirect', window.location.href);

    const authUrl = `https://id.twitch.tv/oauth2/authorize?client_id=${encodeURIComponent(
      clientId
    )}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&response_type=token&scope=${encodeURIComponent(scopes)}&state=${state}`;

    console.log('[zkSEND] Starting Twitch OAuth flow:', {
      clientId: clientId.substring(0, 10) + '...',
      redirectUri,
      authUrl: authUrl.substring(0, 100) + '...',
      currentOrigin: window.location.origin,
    });

    toast.info('Opening Twitch authorization...');

    const popup = createPopupWindow(authUrl, 'Twitch OAuth');

    if (!popup) {
      toast.error('Popup blocked. Please allow popups for this site.');
      resolve(null);
      return;
    }

    // Monitor popup URL changes to detect Privy interception
    let urlCheckInterval: NodeJS.Timeout | null = null;
    let privyDetected = false;
    
    try {
      urlCheckInterval = setInterval(() => {
        try {
          if (popup?.closed) {
            if (urlCheckInterval) clearInterval(urlCheckInterval);
            return;
          }
          
          // Try to access popup location (may fail due to CORS, which is expected)
          const popupUrl = popup?.location?.href || '';
          if (popupUrl && popupUrl.includes('auth.privy.io')) {
            if (!privyDetected) {
              privyDetected = true;
              console.warn('[zkSEND] ⚠️ Privy detected intercepting Twitch OAuth flow!');
              console.warn('[zkSEND] Popup URL:', popupUrl);
              toast.error('Privy is intercepting Twitch OAuth. Please check Twitch app settings.');
            }
          } else if (popupUrl && popupUrl.includes('id.twitch.tv')) {
            console.log('[zkSEND] ✅ Popup is on Twitch OAuth page');
          }
        } catch (e) {
          // CORS error is expected when checking popup location from different origin
          // This is normal and not an error
        }
      }, 1000);
    } catch (e) {
      // Ignore errors when checking popup location
    }

    const messageHandler = (event: MessageEvent) => {
      if (event.data?.target === 'metamask-inpage' || event.data?.name === 'metamask-provider') {
        return;
      }

      if (event.origin !== window.location.origin) {
        return;
      }

      if (event.data && typeof event.data === 'object' && event.data.type === 'twitch_oauth_token' && event.data.accessToken) {
        const token = String(event.data.accessToken);
        console.log('[zkSEND] ✅ Received Twitch OAuth token via postMessage');
        if (urlCheckInterval) clearInterval(urlCheckInterval);
        window.removeEventListener('message', messageHandler);
        if (popup) popup.close();
        resolve(token);
      } else if (event.data && typeof event.data === 'object' && event.data.type === 'twitch_oauth_error') {
        console.error('[zkSEND] ❌ Twitch OAuth error received:', event.data);
        if (urlCheckInterval) clearInterval(urlCheckInterval);
        window.removeEventListener('message', messageHandler);
        if (popup) popup.close();
        resolve(null);
      }
    };

    window.addEventListener('message', messageHandler);

    const checkStorage = setInterval(() => {
      const token = localStorage.getItem('twitch_oauth_token') || localStorage.getItem('twitch_oauth');
      if (token && token.length > 10) {
        console.log('[zkSEND] ✅ Twitch OAuth token found in localStorage');
        if (urlCheckInterval) clearInterval(urlCheckInterval);
        clearInterval(checkStorage);
        window.removeEventListener('message', messageHandler);
        if (popup) popup.close();
        resolve(token);
      }
    }, 500);

    const checkPopup = setInterval(() => {
      if (popup?.closed) {
        console.log('[zkSEND] Popup window was closed by user');
        if (urlCheckInterval) clearInterval(urlCheckInterval);
        clearInterval(checkPopup);
        clearInterval(checkStorage);
        window.removeEventListener('message', messageHandler);
        resolve(null);
      }
    }, 500);
  });
};

/**
 * Connect to Twitch OAuth
 */
export const connectTwitch = async (): Promise<string | null> => {
  try {
    const twitchClientId = import.meta.env.VITE_TWITCH_CLIENT_ID as string | undefined;
    if (!twitchClientId) {
      throw new Error('Twitch Client ID not configured');
    }
    const token = await requestTwitchOAuthTokenImplicitFlow(twitchClientId);
    if (!token) {
      throw new Error('Twitch authorization failed or was cancelled');
    }
    localStorage.setItem('twitch_oauth', token);
    localStorage.setItem('twitch_oauth_token', token);
    toast.success('Twitch connected');
    return token;
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to connect Twitch';
    toast.error(msg);
    return null;
  }
};

/**
 * Clear Twitch OAuth token from storage
 */
export const clearTwitchToken = (): void => {
  try {
    localStorage.removeItem('twitch_oauth');
    localStorage.removeItem('twitch_oauth_token');
    localStorage.removeItem('twitch_access_token');
    sessionStorage.removeItem('twitch_oauth_state');
    sessionStorage.removeItem('twitch_oauth_redirect');
    toast.success('Twitch token cleared');
  } catch (error) {
    console.error('[zkSEND] Failed to clear Twitch token:', error);
    toast.error('Failed to clear Twitch token');
  }
};

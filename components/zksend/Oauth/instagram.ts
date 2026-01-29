import { toast } from 'sonner';
import { createPopupWindow } from './utils';

/**
 * Request Instagram OAuth token
 */
export const requestInstagramOAuthTokenFlow = async (): Promise<string | null> => {
  return new Promise((resolve) => {
    const instagramClientId = import.meta.env.VITE_INSTAGRAM_CLIENT_ID as string | undefined;
    if (!instagramClientId) {
      toast.error('Instagram Client ID not configured');
      resolve(null);
      return;
    }

    const redirectUri = `${window.location.origin}/auth/instagram/callback`;
    const scopes = 'user_profile,user_media';
    const state = Math.random().toString(36).substring(7);

    sessionStorage.setItem('instagram_oauth_state', state);
    sessionStorage.setItem('instagram_oauth_redirect', window.location.href);

    const authUrl = `https://api.instagram.com/oauth/authorize?client_id=${encodeURIComponent(
      instagramClientId
    )}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}&response_type=code&state=${state}`;

    toast.info('Opening Instagram authorization...');

    const popup = createPopupWindow(authUrl, 'Instagram OAuth');

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

      if (event.data && typeof event.data === 'object' && event.data.type === 'instagram_oauth_token' && event.data.accessToken) {
        const token = event.data.accessToken as string;
        localStorage.setItem('instagram_oauth', token);
        localStorage.setItem('instagram_oauth_token', token);

        window.removeEventListener('message', messageHandler);
        if (popup) popup.close();
        resolve(token);
      } else if (event.data && typeof event.data === 'object' && event.data.type === 'instagram_oauth_error') {
        window.removeEventListener('message', messageHandler);
        if (popup) popup.close();
        resolve(null);
      }
    };

    window.addEventListener('message', messageHandler);

    const checkStorage = setInterval(() => {
      const token = localStorage.getItem('instagram_oauth_token') || localStorage.getItem('instagram_oauth');
      if (token && token.length > 10) {
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
        resolve(null);
      }
    }, 500);
  });
};

/**
 * Connect to Instagram OAuth
 */
export const connectInstagram = async (): Promise<string | null> => {
  try {
    const token = await requestInstagramOAuthTokenFlow();
    if (!token) {
      throw new Error('Instagram authorization failed or was cancelled');
    }
    toast.success('Instagram connected');
    return token;
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to connect Instagram';
    toast.error(msg);
    return null;
  }
};

/**
 * Clear Instagram OAuth token from storage
 */
export const clearInstagramToken = (): void => {
  try {
    localStorage.removeItem('instagram_oauth');
    localStorage.removeItem('instagram_oauth_token');
    localStorage.removeItem('instagram_access_token');
    sessionStorage.removeItem('instagram_oauth_state');
    sessionStorage.removeItem('instagram_oauth_redirect');
    sessionStorage.removeItem('instagram_code_verifier');
    toast.success('Instagram token cleared');
  } catch (error) {
    console.error('[zkSEND] Failed to clear Instagram token:', error);
    toast.error('Failed to clear Instagram token');
  }
};

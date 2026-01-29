import { toast } from 'sonner';
import { generateCodeVerifier, generateCodeChallenge, createPopupWindow } from './utils';

/**
 * Request Twitter OAuth token using PKCE flow
 */
export const requestTwitterOAuthTokenFlow = async (): Promise<string | null> => {
  return new Promise((resolve) => {
    const twitterClientId = import.meta.env.VITE_TWITTER_CLIENT_ID as string | undefined;
    if (!twitterClientId) {
      toast.error('Twitter Client ID not configured');
      resolve(null);
      return;
    }

    const redirectUri = `${window.location.origin}/auth/twitter/callback`;
    const scopes = 'users.read follows.read offline.access';
    const state = Math.random().toString(36).substring(7);

    const codeVerifier = generateCodeVerifier();

    generateCodeChallenge(codeVerifier).then((codeChallenge) => {
      sessionStorage.setItem('twitter_oauth_state', state);
      sessionStorage.setItem('twitter_oauth_redirect', window.location.href);
      sessionStorage.setItem('twitter_code_verifier', codeVerifier);

      const authUrl = `https://x.com/i/oauth2/authorize?redirect_uri=${encodeURIComponent(
        redirectUri
      )}&response_type=code&scope=${encodeURIComponent(
        scopes
      )}&state=${state}&code_challenge=${codeChallenge}&code_challenge_method=S256&client_id=${encodeURIComponent(
        twitterClientId
      )}`;

      toast.info('Opening Twitter authorization...');

      const popup = createPopupWindow(authUrl, 'Twitter OAuth');

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
          const token = event.data.accessToken as string;
          localStorage.setItem('twitter_oauth', token);
          localStorage.setItem('twitter_oauth_token', token);

          window.removeEventListener('message', messageHandler);
          if (popup) popup.close();
          resolve(token);
        } else if (event.data && typeof event.data === 'object' && event.data.type === 'twitter_oauth_error') {
          window.removeEventListener('message', messageHandler);
          if (popup) popup.close();
          resolve(null);
        }
      };

      window.addEventListener('message', messageHandler);

      const checkStorage = setInterval(() => {
        const token = localStorage.getItem('twitter_oauth_token') || localStorage.getItem('twitter_oauth');
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
  });
};

/**
 * Connect to Twitter OAuth
 */
export const connectTwitter = async (): Promise<string | null> => {
  try {
    const token = await requestTwitterOAuthTokenFlow();
    if (!token) {
      throw new Error('Twitter authorization failed or was cancelled');
    }
    toast.success('Twitter connected');
    return token;
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to connect Twitter';
    toast.error(msg);
    return null;
  }
};

/**
 * Clear Twitter OAuth token from storage
 */
export const clearTwitterToken = (): void => {
  try {
    localStorage.removeItem('twitter_oauth');
    localStorage.removeItem('twitter_oauth_token');
    localStorage.removeItem('twitter_oauth_scope');
    localStorage.removeItem('twitter_refresh_token');
    sessionStorage.removeItem('twitter_oauth_state');
    sessionStorage.removeItem('twitter_oauth_redirect');
    sessionStorage.removeItem('twitter_code_verifier');
    toast.success('Twitter token cleared');
  } catch (error) {
    console.error('[zkSEND] Failed to clear Twitter token:', error);
    toast.error('Failed to clear Twitter token');
  }
};

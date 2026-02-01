/* TikTok OAuth - commented out
import { toast } from 'sonner';
import { generateCodeVerifier, generateCodeChallenge, createPopupWindow } from './utils';

/**
 * Request TikTok OAuth token using PKCE flow
 */
export const requestTiktokOAuthTokenFlow = async (): Promise<string | null> => {
  return new Promise((resolve) => {
    const tiktokClientId = import.meta.env.VITE_TIKTOK_CLIENT_ID as string | undefined;
    if (!tiktokClientId) {
      toast.error('TikTok Client ID not configured');
      resolve(null);
      return;
    }

    const redirectUri = `${window.location.origin}/auth/tiktok/callback`;
    const scopes = 'user.info.basic';
    const state = Math.random().toString(36).substring(7);

    const codeVerifier = generateCodeVerifier();

    generateCodeChallenge(codeVerifier).then((codeChallenge) => {
      sessionStorage.setItem('tiktok_oauth_state', state);
      sessionStorage.setItem('tiktok_oauth_redirect', window.location.href);
      sessionStorage.setItem('tiktok_code_verifier', codeVerifier);

      const authUrl = `https://www.tiktok.com/v2/auth/authorize?client_key=${encodeURIComponent(
        tiktokClientId
      )}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}&response_type=code&state=${state}&code_challenge=${codeChallenge}&code_challenge_method=S256`;

      toast.info('Opening TikTok authorization...');

      const popup = createPopupWindow(authUrl, 'TikTok OAuth');

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

        if (event.data && typeof event.data === 'object' && event.data.type === 'tiktok_oauth_token' && event.data.accessToken) {
          const token = event.data.accessToken as string;
          localStorage.setItem('tiktok_oauth', token);
          localStorage.setItem('tiktok_oauth_token', token);

          window.removeEventListener('message', messageHandler);
          if (popup) popup.close();
          resolve(token);
        } else if (event.data && typeof event.data === 'object' && event.data.type === 'tiktok_oauth_error') {
          window.removeEventListener('message', messageHandler);
          if (popup) popup.close();
          resolve(null);
        }
      };

      window.addEventListener('message', messageHandler);

      const checkStorage = setInterval(() => {
        const token = localStorage.getItem('tiktok_oauth_token') || localStorage.getItem('tiktok_oauth');
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
 * Connect to TikTok OAuth
 */
export const connectTiktok = async (): Promise<string | null> => {
  try {
    const token = await requestTiktokOAuthTokenFlow();
    if (!token) {
      throw new Error('TikTok authorization failed or was cancelled');
    }
    toast.success('TikTok connected');
    return token;
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to connect TikTok';
    toast.error(msg);
    return null;
  }
};

/**
 * Clear TikTok OAuth token from storage
 */
export const clearTiktokToken = (): void => {
  try {
    localStorage.removeItem('tiktok_oauth');
    localStorage.removeItem('tiktok_oauth_token');
    localStorage.removeItem('tiktok_access_token');
    sessionStorage.removeItem('tiktok_oauth_state');
    sessionStorage.removeItem('tiktok_oauth_redirect');
    sessionStorage.removeItem('tiktok_code_verifier');
    toast.success('TikTok token cleared');
  } catch (error) {
    console.error('[zkSEND] Failed to clear TikTok token:', error);
    toast.error('Failed to clear TikTok token');
  }
};
*/

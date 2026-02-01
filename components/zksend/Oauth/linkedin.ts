import { toast } from 'sonner';
import { generateCodeVerifier, generateCodeChallenge, createPopupWindow } from './utils';

/**
 * Request LinkedIn OAuth token using PKCE flow
 */
export const requestLinkedInOAuthTokenFlow = async (): Promise<string | null> => {
  return new Promise((resolve) => {
    const linkedInClientId = import.meta.env.VITE_LINKEDIN_CLIENT_ID as string | undefined;
    if (!linkedInClientId) {
      toast.error('LinkedIn Client ID not configured');
      resolve(null);
      return;
    }

    const redirectUri = `${window.location.origin}/auth/linkedin/callback`;
    const scopes = 'openid profile email';
    const state = Math.random().toString(36).substring(7);

    const codeVerifier = generateCodeVerifier();

    generateCodeChallenge(codeVerifier).then((codeChallenge) => {
      localStorage.setItem('linkedin_oauth_state', state);
      localStorage.setItem('linkedin_oauth_redirect', window.location.href);
      localStorage.setItem('linkedin_code_verifier', codeVerifier);

      const authUrl = `https://www.linkedin.com/oauth/v2/authorization?client_id=${encodeURIComponent(
        linkedInClientId
      )}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}&state=${state}&response_type=code&code_challenge=${codeChallenge}&code_challenge_method=S256`;

      toast.info('Opening LinkedIn authorization...');

      const popup = createPopupWindow(authUrl, 'LinkedIn OAuth');

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

        if (event.data && typeof event.data === 'object' && event.data.type === 'linkedin_oauth_token' && event.data.accessToken) {
          const token = event.data.accessToken as string;
          localStorage.setItem('linkedin_oauth', token);
          localStorage.setItem('linkedin_oauth_token', token);

          window.removeEventListener('message', messageHandler);
          if (popup) popup.close();
          resolve(token);
        } else if (event.data && typeof event.data === 'object' && event.data.type === 'linkedin_oauth_error') {
          const errorMsg = event.data.error as string | undefined;
          window.removeEventListener('message', messageHandler);
          if (popup) popup.close();
          if (errorMsg) toast.error(errorMsg);
          resolve(null);
        }
      };

      window.addEventListener('message', messageHandler);

      const checkStorage = setInterval(() => {
        const token = localStorage.getItem('linkedin_oauth_token') || localStorage.getItem('linkedin_oauth');
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
 * Connect to LinkedIn OAuth
 */
export const connectLinkedIn = async (): Promise<string | null> => {
  try {
    const token = await requestLinkedInOAuthTokenFlow();
    if (!token) {
      throw new Error('LinkedIn authorization failed or was cancelled. Check the Authorization callback URL in LinkedIn app settings.');
    }
    toast.success('LinkedIn connected');
    return token;
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to connect LinkedIn';
    toast.error(msg);
    return null;
  }
};

/**
 * Clear LinkedIn OAuth token from storage
 */
export const clearLinkedInToken = (): void => {
  try {
    localStorage.removeItem('linkedin_oauth');
    localStorage.removeItem('linkedin_oauth_token');
    localStorage.removeItem('linkedin_access_token');
    localStorage.removeItem('linkedin_oauth_state');
    localStorage.removeItem('linkedin_oauth_redirect');
    localStorage.removeItem('linkedin_code_verifier');
    sessionStorage.removeItem('linkedin_oauth_state');
    sessionStorage.removeItem('linkedin_oauth_redirect');
    sessionStorage.removeItem('linkedin_code_verifier');
    toast.success('LinkedIn token cleared');
  } catch (error) {
    console.error('[zkSEND] Failed to clear LinkedIn token:', error);
    toast.error('Failed to clear LinkedIn token');
  }
};

import { toast } from 'sonner';
import { generateCodeVerifier, generateCodeChallenge, createPopupWindow } from './utils';

/**
 * Request GitHub OAuth token using PKCE flow
 */
export const requestGithubOAuthTokenFlow = async (): Promise<string | null> => {
  return new Promise((resolve) => {
    const githubClientId = import.meta.env.VITE_GITHUB_CLIENT_ID as string | undefined;
    if (!githubClientId) {
      toast.error('GitHub Client ID not configured');
      resolve(null);
      return;
    }

    const redirectUri = `${window.location.origin}/auth/github/callback`;
    const scopes = 'read:user';
    const state = Math.random().toString(36).substring(7);

    const codeVerifier = generateCodeVerifier();

    generateCodeChallenge(codeVerifier).then((codeChallenge) => {
      // Use localStorage so the callback page (loaded in popup) can read them;
      // sessionStorage is not shared between parent and popup.
      localStorage.setItem('github_oauth_state', state);
      localStorage.setItem('github_oauth_redirect', window.location.href);
      localStorage.setItem('github_code_verifier', codeVerifier);

      const authUrl = `https://github.com/login/oauth/authorize?client_id=${encodeURIComponent(
        githubClientId
      )}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}&state=${state}&code_challenge=${codeChallenge}&code_challenge_method=S256`;

      toast.info('Opening GitHub authorization...');

      const popup = createPopupWindow(authUrl, 'GitHub OAuth');

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

        if (event.data && typeof event.data === 'object' && event.data.type === 'github_oauth_token' && event.data.accessToken) {
          const token = event.data.accessToken as string;
          localStorage.setItem('github_oauth', token);
          localStorage.setItem('github_oauth_token', token);

          window.removeEventListener('message', messageHandler);
          if (popup) popup.close();
          resolve(token);
        } else if (event.data && typeof event.data === 'object' && event.data.type === 'github_oauth_error') {
          const errorMsg = event.data.error as string | undefined;
          window.removeEventListener('message', messageHandler);
          if (popup) popup.close();
          if (errorMsg) toast.error(errorMsg);
          resolve(null);
        }
      };

      window.addEventListener('message', messageHandler);

      const checkStorage = setInterval(() => {
        const token = localStorage.getItem('github_oauth_token') || localStorage.getItem('github_oauth');
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
 * Connect to GitHub OAuth
 */
export const connectGithub = async (): Promise<string | null> => {
  try {
    const token = await requestGithubOAuthTokenFlow();
    if (!token) {
      throw new Error('GitHub authorization failed or was cancelled. Check the Authorization callback URL in GitHub OAuth App settings.');
    }
    toast.success('GitHub connected');
    return token;
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to connect GitHub';
    toast.error(msg);
    return null;
  }
};

/**
 * Clear GitHub OAuth token from storage
 */
export const clearGithubToken = (): void => {
  try {
    localStorage.removeItem('github_oauth');
    localStorage.removeItem('github_oauth_token');
    localStorage.removeItem('github_access_token');
    localStorage.removeItem('github_oauth_state');
    localStorage.removeItem('github_oauth_redirect');
    localStorage.removeItem('github_code_verifier');
    sessionStorage.removeItem('github_oauth_state');
    sessionStorage.removeItem('github_oauth_redirect');
    sessionStorage.removeItem('github_code_verifier');
    toast.success('GitHub token cleared');
  } catch (error) {
    console.error('[zkSEND] Failed to clear GitHub token:', error);
    toast.error('Failed to clear GitHub token');
  }
};

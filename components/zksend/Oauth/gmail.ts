import { toast } from 'sonner';
import { generateCodeVerifier, generateCodeChallenge, createPopupWindow } from './utils';

/**
 * Request Gmail OAuth token using PKCE flow
 */
export const requestGmailOAuthTokenFlow = async (): Promise<string | null> => {
  return new Promise((resolve) => {
    const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
    if (!googleClientId) {
      toast.error('Google Client ID not configured');
      resolve(null);
      return;
    }

    // Google does not allow localhost/zk.localhost in redirect URI (requires public TLD).
    // When on localhost or zk.localhost, use production callback URL so Google accepts the request;
    // callback page will postMessage token back to opener.
    const origin = window.location.origin;
    const isLocalOrigin = /^https?:\/\/(localhost|[\w-]+\.localhost)(:\d+)?$/i.test(origin);
    const envRedirect = (import.meta.env.VITE_GMAIL_REDIRECT_URI as string | undefined)?.trim();
    const appOrigin = (import.meta.env.VITE_APP_ORIGIN as string | undefined)?.trim();
    const productionCallback =
      envRedirect ||
      (appOrigin ? `${appOrigin.replace(/\/$/, '')}/auth/gmail/callback` : 'https://sendly.digital/auth/gmail/callback');
    const redirectUri = isLocalOrigin ? productionCallback : `${origin}/auth/gmail/callback`;
    // Only request email address to verify ownership; no access to read Gmail messages
    const scopes = 'https://www.googleapis.com/auth/userinfo.email';
    const randomPart = Math.random().toString(36).substring(7);
    // Include opener origin in state so callback (e.g. on sendly.digital) can postMessage back to opener (e.g. zk.localhost)
    const state = `${randomPart}:${encodeURIComponent(window.location.origin)}`;

    const codeVerifier = generateCodeVerifier();

    generateCodeChallenge(codeVerifier).then((codeChallenge) => {
      // Use localStorage so the callback page (loaded in popup) can read them;
      // sessionStorage is not shared between parent and popup.
      localStorage.setItem('gmail_oauth_state', state);
      localStorage.setItem('gmail_oauth_redirect', window.location.href);
      localStorage.setItem('gmail_code_verifier', codeVerifier);

      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
        googleClientId
      )}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(
        scopes
      )}&state=${state}&code_challenge=${codeChallenge}&code_challenge_method=S256&access_type=offline&prompt=consent`;

      console.log('[zkSEND] Starting Gmail OAuth flow:', {
        clientId: googleClientId.substring(0, 10) + '...',
        redirectUri,
        scopes,
      });

      toast.info('Opening Gmail authorization...');

      const popup = createPopupWindow(authUrl, 'Gmail OAuth');

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

        if (event.data && typeof event.data === 'object' && event.data.type === 'gmail_oauth_token' && event.data.accessToken) {
          const token = event.data.accessToken as string;
          localStorage.setItem('gmail_oauth', token);
          localStorage.setItem('gmail_oauth_token', token);

          window.removeEventListener('message', messageHandler);
          if (popup) popup.close();
          resolve(token);
        } else if (event.data && typeof event.data === 'object' && event.data.type === 'gmail_oauth_error') {
          const errorMsg = event.data.error as string | undefined;
          window.removeEventListener('message', messageHandler);
          if (popup) popup.close();
          if (errorMsg) toast.error(errorMsg);
          resolve(null);
        }
      };

      window.addEventListener('message', messageHandler);

      const checkStorage = setInterval(() => {
        const token = localStorage.getItem('gmail_oauth_token') || localStorage.getItem('gmail_oauth');
        if (token && token.length > 10) {
          console.log('[zkSEND] ✅ Gmail OAuth token found in localStorage');
          clearInterval(checkStorage);
          window.removeEventListener('message', messageHandler);
          if (popup) popup.close();
          resolve(token);
        }
      }, 500);

      const checkPopup = setInterval(() => {
        try {
          // Cross-Origin-Opener-Policy can block popup.closed when popup navigates to another origin (e.g. sendly.digital)
          if (popup?.closed) {
            console.log('[zkSEND] Popup window was closed by user');
            clearInterval(checkPopup);
            clearInterval(checkStorage);
            window.removeEventListener('message', messageHandler);
            resolve(null);
          }
        } catch {
          // Ignore when COOP blocks access to cross-origin popup
        }
      }, 500);
    });
  });
};

/**
 * Connect to Gmail OAuth
 */
export const connectGmail = async (): Promise<string | null> => {
  try {
    const token = await requestGmailOAuthTokenFlow();
    if (!token) {
      throw new Error('Gmail authorization failed or was cancelled');
    }
    toast.success('Gmail connected');
    return token;
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to connect Gmail';
    toast.error(msg);
    return null;
  }
};

/**
 * Clear Gmail OAuth token from storage
 */
export const clearGmailToken = (): void => {
  try {
    localStorage.removeItem('gmail_oauth');
    localStorage.removeItem('gmail_oauth_token');
    localStorage.removeItem('gmail_access_token');
    localStorage.removeItem('gmail_oauth_state');
    localStorage.removeItem('gmail_oauth_redirect');
    localStorage.removeItem('gmail_code_verifier');
    sessionStorage.removeItem('gmail_oauth_state');
    sessionStorage.removeItem('gmail_oauth_redirect');
    sessionStorage.removeItem('gmail_code_verifier');
    toast.success('Gmail token cleared');
  } catch (error) {
    console.error('[zkSEND] Failed to clear Gmail token:', error);
    toast.error('Failed to clear Gmail token');
  }
};

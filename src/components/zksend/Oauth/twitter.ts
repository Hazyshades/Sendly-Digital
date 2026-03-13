import { toast } from 'sonner';
import { createPopupWindow } from './utils';
import { toZkHostname } from '@/lib/runtime/zkHost';

const getZkTlsApiUrl = (): string => {
  // В проде используем явный API-хост (api.sendly.digital),
  // чтобы не упираться в TLS-сертификат фронтенд-домена.
  const envUrl =
    (import.meta.env.VITE_ZKTLS_SERVICE_URL as string | undefined) ||
    (import.meta.env.VITE_ZKTLS_API_URL as string | undefined);
  if (envUrl) return envUrl;

  if (typeof window !== 'undefined' && window.location?.origin) {
    try {
      const url = new URL(window.location.origin);
      let hostname = url.hostname.toLowerCase();

      // Normalize www-prefixed hostnames (e.g. www.zk.sendly.digital -> zk.sendly.digital)
      if (hostname.startsWith('www.')) {
        hostname = hostname.slice(4);
        url.hostname = hostname;
        return url.origin;
      }

      return window.location.origin;
    } catch {
      return window.location.origin;
    }
  }

  return 'http://localhost:3001';
};

export type TwitterOAuth1Tokens = {
  oauthToken: string;
  oauthTokenSecret: string;
  screenName?: string;
};

/**
 * Request Twitter OAuth 1.0a token (request token -> authorize -> access token)
 */
export const requestTwitterOAuth1Flow = async (): Promise<TwitterOAuth1Tokens | null> => {
  return new Promise((resolve) => {
    const apiUrl = getZkTlsApiUrl().replace(/\/$/, '');
    const origin = window.location.origin;

    // Default callback: same origin but normalized to zk-host
    const originUrl = new URL(origin);
    originUrl.hostname = toZkHostname(originUrl.hostname);
    const defaultCallback = `${originUrl.origin}/auth/twitter-oauth1/callback`;

    const envCallback = import.meta.env.VITE_TWITTER_OAUTH1_CALLBACK as string | undefined;
    const isLocalOrigin = originUrl.hostname.includes('localhost');

    // Use env callback only when:
    // - it is set AND
    //   - or this not localhost
    // else in prode ingone callback zk.localhost + defaultCallback.
    const baseCallback =
      envCallback && (!envCallback.includes('localhost') || isLocalOrigin)
        ? envCallback
        : defaultCallback;

    let callbackUrl = baseCallback.replace(/\/$/, '');

    // Normalize callback hostname as zk-host (e.g. strip www., ensure zk.*)
    try {
      const cbUrl = new URL(callbackUrl);
      cbUrl.hostname = toZkHostname(cbUrl.hostname);
      callbackUrl = cbUrl.toString().replace(/\/$/, '');
    } catch {
      // ignore, fall back to raw callbackUrl
    }

    const run = async () => {
      try {
        const res = await fetch(`${apiUrl}/api/twitter/oauth1/request-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ callbackUrl }),
        });

        if (!res.ok) {
          const text = await res.text().catch(() => '');
          let errMsg = `Request token failed: ${res.status}`;
          try {
            const errJson = JSON.parse(text) as { error?: string; hint?: string };
            if (errJson.error) errMsg = errJson.error;
            if (errJson.hint) errMsg += `. ${errJson.hint}`;
          } catch {
            if (text) errMsg += `: ${text.slice(0, 100)}`;
          }
          toast.error(errMsg);
          resolve(null);
          return;
        }

        const data = (await res.json()) as { success?: boolean; oauthToken?: string };
        if (!data.oauthToken) {
          toast.error('No oauth_token in response');
          resolve(null);
          return;
        }

        const authorizeUrl = `https://api.x.com/oauth/authorize?oauth_token=${encodeURIComponent(data.oauthToken)}`;

        toast.info('Opening Twitter authorization...');

        const popup = createPopupWindow(authorizeUrl, 'Twitter OAuth 1.0a');

        if (!popup) {
          toast.error('Popup blocked. Please allow popups for this site.');
          resolve(null);
          return;
        }

        const messageHandler = (event: MessageEvent) => {
          if (event.data?.target === 'metamask-inpage' || event.data?.name === 'metamask-provider') {
            return;
          }

          if (
            event.data &&
            typeof event.data === 'object' &&
            event.data.type === 'twitter_oauth1_token' &&
            event.data.oauthToken &&
            event.data.oauthTokenSecret
          ) {
            window.removeEventListener('message', messageHandler);
            if (popup) popup.close();
            resolve({
              oauthToken: event.data.oauthToken as string,
              oauthTokenSecret: event.data.oauthTokenSecret as string,
              screenName: event.data.screenName as string | undefined,
            });
          }
        };

        window.addEventListener('message', messageHandler);

        const checkStorage = setInterval(() => {
          const token = localStorage.getItem('twitter_oauth1_token');
          const secret = localStorage.getItem('twitter_oauth1_secret');
          if (token && secret) {
            clearInterval(checkStorage);
            window.removeEventListener('message', messageHandler);
            if (popup) popup.close();
            resolve({ oauthToken: token, oauthTokenSecret: secret });
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
      } catch (error) {
        console.error('[Twitter OAuth1] request token error:', error);
        toast.error('Failed to start Twitter authorization');
        resolve(null);
      }
    };

    run();
  });
};

/**
 * Connect to Twitter via OAuth 1.0a
 */
export const connectTwitter = async (): Promise<string | null> => {
  try {
    const tokens = await requestTwitterOAuth1Flow();
    if (!tokens) {
      throw new Error('Twitter authorization failed or was cancelled');
    }

    localStorage.setItem('twitter_oauth1_token', tokens.oauthToken);
    localStorage.setItem('twitter_oauth1_secret', tokens.oauthTokenSecret);
    if (tokens.screenName) {
      localStorage.setItem('twitter_oauth1_screen_name', tokens.screenName);
    }

    toast.success('Twitter connected');
    return tokens.oauthToken;
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to connect Twitter';
    toast.error(msg);
    return null;
  }
};

/**
 * Clear Twitter OAuth 1.0a tokens from storage
 */
export const clearTwitterToken = (): void => {
  try {
    localStorage.removeItem('twitter_oauth1_token');
    localStorage.removeItem('twitter_oauth1_secret');
    localStorage.removeItem('twitter_oauth1_screen_name');
    localStorage.removeItem('twitter_oauth1_redirect');
  } catch (error) {
    console.error('[zkSEND] Failed to clear Twitter token:', error);
  }
};

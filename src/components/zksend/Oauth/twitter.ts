import { toast } from 'sonner';
import { createPopupWindow } from './utils';

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

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : null;

const firstString = (...values: unknown[]): string | undefined => {
  for (const value of values) {
    if (typeof value === 'string' && value.length > 0) return value;
  }
  return undefined;
};

const parseOAuth1AccessTokenResponse = (raw: unknown): TwitterOAuth1Tokens | null => {
  const root = asRecord(raw);
  if (!root) return null;

  const nested = asRecord(root.data) ?? asRecord(root.result) ?? asRecord(root.payload);

  const oauthToken = firstString(
    root.oauthToken,
    root.oauth_token,
    root.accessToken,
    root.access_token,
    nested?.oauthToken,
    nested?.oauth_token,
    nested?.accessToken,
    nested?.access_token
  );
  const oauthTokenSecret = firstString(
    root.oauthTokenSecret,
    root.oauth_token_secret,
    root.accessTokenSecret,
    root.access_token_secret,
    nested?.oauthTokenSecret,
    nested?.oauth_token_secret,
    nested?.accessTokenSecret,
    nested?.access_token_secret
  );
  const screenName = firstString(
    root.screenName,
    root.screen_name,
    root.username,
    nested?.screenName,
    nested?.screen_name,
    nested?.username
  );

  if (!oauthToken || !oauthTokenSecret) return null;

  return { oauthToken, oauthTokenSecret, screenName };
};

const isCallbackNotApprovedError = (status: number, bodyText: string): boolean => {
  if (status !== 403) return false;
  const text = bodyText.toLowerCase();
  return text.includes('callback url not approved') || text.includes('error code="415"');
};

const stripWwwHostname = (urlString: string): string | null => {
  try {
    const url = new URL(urlString);
    if (!url.hostname.toLowerCase().startsWith('www.')) return null;
    url.hostname = url.hostname.slice(4);
    return url.toString().replace(/\/$/, '');
  } catch {
    return null;
  }
};

const exchangeTwitterOAuth1AccessToken = async (
  apiUrl: string,
  oauthToken: string,
  oauthVerifier: string
): Promise<TwitterOAuth1Tokens | null> => {
  const res = await fetch(`${apiUrl}/api/twitter/oauth1/access-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ oauthToken, oauthVerifier }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`OAuth1 access-token failed: ${res.status}${text ? ` ${text}` : ''}`);
  }

  const raw = (await res.json()) as unknown;
  const parsed = parseOAuth1AccessTokenResponse(raw);
  if (!parsed) {
    throw new Error('Missing oauth token/secret in OAuth1 access-token response');
  }

  return parsed;
};

/**
 * Request Twitter OAuth 1.0a token (request token -> authorize -> access token)
 */
export const requestTwitterOAuth1Flow = async (): Promise<TwitterOAuth1Tokens | null> => {
  return new Promise((resolve) => {
    const apiUrl = getZkTlsApiUrl().replace(/\/$/, '');
    const origin = window.location.origin;

    // Default callback must stay on the exact current origin (including www)
    // so popup/localStorage/postMessage all use the same site context.
    const originUrl = new URL(origin);
    const defaultCallback = `${originUrl.origin}/auth/twitter-oauth1/callback`;

    const envCallback = import.meta.env.VITE_TWITTER_OAUTH1_CALLBACK as string | undefined;
    const isLocalOrigin = originUrl.hostname.includes('localhost');

    // Prefer runtime origin callback in production to avoid www/non-www mismatch.
    // Env callback is only allowed for local development override, or when host matches exactly.
    let baseCallback = defaultCallback;
    if (envCallback) {
      try {
        const envUrl = new URL(envCallback);
        const sameHost = envUrl.hostname.toLowerCase() === originUrl.hostname.toLowerCase();
        if (isLocalOrigin || sameHost) {
          baseCallback = envCallback;
        }
      } catch {
        // Invalid env callback format - ignore and use default callback.
      }
    }

    let callbackUrl = baseCallback.replace(/\/$/, '');

    // Keep callback origin as-is; rewriting host can break OAuth completion
    // when app runs on www vs non-www subdomains.

    const run = async () => {
      try {
        let requestTokenRes = await fetch(`${apiUrl}/api/twitter/oauth1/request-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ callbackUrl }),
        });

        let requestTokenText = '';
        if (!requestTokenRes.ok) {
          requestTokenText = await requestTokenRes.text().catch(() => '');
          const fallbackCallback = stripWwwHostname(callbackUrl);
          if (fallbackCallback && isCallbackNotApprovedError(requestTokenRes.status, requestTokenText)) {
            console.warn('[Twitter OAuth1] Callback not approved, retrying without www host:', {
              original: callbackUrl,
              fallback: fallbackCallback,
            });
            callbackUrl = fallbackCallback;
            requestTokenRes = await fetch(`${apiUrl}/api/twitter/oauth1/request-token`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ callbackUrl }),
            });
            requestTokenText = requestTokenRes.ok ? '' : await requestTokenRes.text().catch(() => '');
          }
        }

        if (!requestTokenRes.ok) {
          let errMsg = `Request token failed: ${requestTokenRes.status}`;
          try {
            const errJson = JSON.parse(requestTokenText) as { error?: string; hint?: string };
            if (errJson.error) errMsg = errJson.error;
            if (errJson.hint) errMsg += `. ${errJson.hint}`;
          } catch {
            if (requestTokenText) errMsg += `: ${requestTokenText.slice(0, 160)}`;
          }
          toast.error(errMsg);
          resolve(null);
          return;
        }

        const data = (await requestTokenRes.json()) as { success?: boolean; oauthToken?: string };
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

        let settled = false;
        let checkStorage: ReturnType<typeof setInterval> | null = null;
        let checkPopup: ReturnType<typeof setInterval> | null = null;
        let checkPopupOAuthParams: ReturnType<typeof setInterval> | null = null;
        let flowTimeout: ReturnType<typeof setTimeout> | null = null;
        let sawSameOriginWithoutOAuth = false;
        let fallbackExchangeInFlight = false;
        let fallbackExchangeAttemptKey: string | null = null;
        let lastSeenOauthToken: string | null = null;
        let lastSeenOauthVerifier: string | null = null;
        let popupCloseRescueAttempted = false;
        let popupClosedAtMs: number | null = null;

        const readStoredOAuth1Tokens = (): TwitterOAuth1Tokens | null => {
          const token = localStorage.getItem('twitter_oauth1_token');
          const secret = localStorage.getItem('twitter_oauth1_secret');
          const screenName = localStorage.getItem('twitter_oauth1_screen_name') ?? undefined;
          if (!token || !secret) return null;
          return { oauthToken: token, oauthTokenSecret: secret, screenName };
        };

        const cleanup = () => {
          window.removeEventListener('message', messageHandler);
          if (checkStorage) {
            clearInterval(checkStorage);
            checkStorage = null;
          }
          if (checkPopup) {
            clearInterval(checkPopup);
            checkPopup = null;
          }
          if (checkPopupOAuthParams) {
            clearInterval(checkPopupOAuthParams);
            checkPopupOAuthParams = null;
          }
          if (flowTimeout) {
            clearTimeout(flowTimeout);
            flowTimeout = null;
          }
        };

        const settle = (value: TwitterOAuth1Tokens | null, closePopup = false) => {
          if (settled) return;
          settled = true;
          cleanup();
          if (closePopup && popup && !popup.closed) {
            try {
              popup.close();
            } catch {
              // ignore
            }
          }
          resolve(value);
        };

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
            settle({
              oauthToken: event.data.oauthToken as string,
              oauthTokenSecret: event.data.oauthTokenSecret as string,
              screenName: event.data.screenName as string | undefined,
            }, true);
          }
        };

        window.addEventListener('message', messageHandler);

        checkStorage = setInterval(() => {
          const stored = readStoredOAuth1Tokens();
          if (stored) {
            settle(stored, true);
          }
        }, 500);

        checkPopupOAuthParams = setInterval(() => {
          if (!popup || popup.closed || settled) return;
          try {
            const popupUrl = new URL(popup.location.href);
            const isSameOrigin = popupUrl.origin === originUrl.origin;
            if (!isSameOrigin) return;

            const oauthToken = popupUrl.searchParams.get('oauth_token');
            const oauthVerifier = popupUrl.searchParams.get('oauth_verifier');
            const isCallbackRoute = popupUrl.pathname === '/auth/twitter-oauth1/callback';

            if (oauthToken && oauthVerifier) {
              lastSeenOauthToken = oauthToken;
              lastSeenOauthVerifier = oauthVerifier;
            }

            if (oauthToken && oauthVerifier) {
              // When popup is already on callback route, that route performs exchange itself.
              // Avoid duplicate access-token exchange from parent, it causes 400 "Unknown oauthToken".
              if (isCallbackRoute) return;

              const attemptKey = `${oauthToken}:${oauthVerifier}`;
              if (fallbackExchangeInFlight || fallbackExchangeAttemptKey === attemptKey) return;
              fallbackExchangeInFlight = true;
              fallbackExchangeAttemptKey = attemptKey;

              void exchangeTwitterOAuth1AccessToken(apiUrl, oauthToken, oauthVerifier)
                .then((tokens) => {
                  settle(tokens, true);
                })
                .catch((error) => {
                  const message = error instanceof Error ? error.message : String(error);
                  // Benign duplicate exchange after popup callback already succeeded.
                  if (message.includes('Unknown oauthToken')) {
                    console.warn('[Twitter OAuth1] Ignoring duplicate fallback exchange:', message);
                    return;
                  }
                  console.error('[Twitter OAuth1] fallback exchange error:', error);
                  toast.error('Twitter callback returned, but token exchange failed');
                })
                .finally(() => {
                  fallbackExchangeInFlight = false;
                });
              return;
            }

            const hasKnownOAuthSignal =
              popupUrl.searchParams.has('oauth_token') ||
              popupUrl.searchParams.has('oauth_verifier') ||
              popupUrl.searchParams.has('denied');
            if (!hasKnownOAuthSignal) {
              // Popup returned to our origin (often /payments) without OAuth params:
              // this usually means callback URL is misconfigured and flow can hang.
              if (sawSameOriginWithoutOAuth) {
                toast.error('Twitter callback URL seems misconfigured. Please verify OAuth callback settings.');
                settle(null, true);
              } else {
                sawSameOriginWithoutOAuth = true;
              }
            }
          } catch {
            // Cross-origin popup page (Twitter/X) - ignore until it returns to our origin.
          }
        }, 700);

        checkPopup = setInterval(() => {
          if (settled) return;
          if (popup?.closed) {
            if (popupClosedAtMs === null) {
              popupClosedAtMs = Date.now();
            }

            const stored = readStoredOAuth1Tokens();
            if (stored) {
              settle(stored);
              return;
            }

            if (!popupCloseRescueAttempted && lastSeenOauthToken && lastSeenOauthVerifier) {
              popupCloseRescueAttempted = true;
              void exchangeTwitterOAuth1AccessToken(apiUrl, lastSeenOauthToken, lastSeenOauthVerifier)
                .then((tokens) => {
                  if (tokens) {
                    localStorage.setItem('twitter_oauth1_token', tokens.oauthToken);
                    localStorage.setItem('twitter_oauth1_secret', tokens.oauthTokenSecret);
                    if (tokens.screenName) {
                      localStorage.setItem('twitter_oauth1_screen_name', tokens.screenName);
                    }
                    settle(tokens);
                    return;
                  }
                  settle(null);
                })
                .catch((error) => {
                  console.error('[Twitter OAuth1] popup-close rescue exchange error:', error);
                  settle(null);
                });
              return;
            }

            // Popup can close slightly earlier than storage/message propagation.
            // Give a short grace period before declaring "cancelled".
            if (Date.now() - popupClosedAtMs < 2500) {
              return;
            }

            settle(null);
          }
        }, 500);

        flowTimeout = setTimeout(() => {
          if (!settled) {
            toast.error('Twitter connection timed out. Please try again.');
            settle(null, true);
          }
        }, 120000);
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

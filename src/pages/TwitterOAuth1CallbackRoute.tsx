import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : null;

const firstString = (...values: unknown[]): string | undefined => {
  for (const value of values) {
    if (typeof value === 'string' && value.length > 0) return value;
  }
  return undefined;
};

const parseOAuth1AccessTokenResponse = (
  raw: unknown
): { oauthToken: string; oauthTokenSecret: string; screenName?: string } | null => {
  const root = asRecord(raw);
  if (!root) return null;

  const nested = asRecord(root.data) ?? asRecord(root.result) ?? asRecord(root.payload);

  const token = firstString(
    root.oauthToken,
    root.oauth_token,
    root.accessToken,
    root.access_token,
    nested?.oauthToken,
    nested?.oauth_token,
    nested?.accessToken,
    nested?.access_token
  );
  const secret = firstString(
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

  if (!token || !secret) return null;
  return { oauthToken: token, oauthTokenSecret: secret, screenName };
};

const getPostMessageTargetOrigin = (): string => {
  if (typeof document !== 'undefined' && document.referrer) {
    try {
      return new URL(document.referrer).origin;
    } catch {
      // ignore and fallback to wildcard
    }
  }
  return '*';
};

const getZkTlsApiUrl = (): string => {
  if (typeof window !== 'undefined' && window.location?.origin) return window.location.origin;
  const envUrl =
    (import.meta.env.VITE_ZKTLS_SERVICE_URL as string | undefined) ||
    (import.meta.env.VITE_ZKTLS_API_URL as string | undefined);
  if (envUrl) return envUrl;
  return 'http://localhost:3001';
};

export function TwitterOAuth1CallbackRoute() {
  const location = useLocation();
  const navigate = useNavigate();
  const hasExchangedRef = useRef(false);

  useEffect(() => {
    if (hasExchangedRef.current) return;
    hasExchangedRef.current = true;

    const params = new URLSearchParams(location.search);
    const oauthToken = params.get('oauth_token');
    const oauthVerifier = params.get('oauth_verifier');

    const exchange = async () => {
      if (!oauthToken || !oauthVerifier) {
        // if no needed parameters — simply close the popup, if not opened from the popup, redirect to the main page.
        if (window.opener && !window.opener.closed) {
          window.close();
        } else {
          navigate('/');
        }
        return;
      }

      try {
        const apiUrl = getZkTlsApiUrl().replace(/\/$/, '');
        const res = await fetch(`${apiUrl}/api/twitter/oauth1/access-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            oauthToken,
            oauthVerifier,
          }),
        });

        if (!res.ok) {
          const text = await res.text().catch(() => '');
          throw new Error(`OAuth1 access-token failed: ${res.status} ${text}`);
        }

        const raw = (await res.json()) as unknown;
        const parsed = parseOAuth1AccessTokenResponse(raw);

        if (parsed?.oauthToken && parsed.oauthTokenSecret) {
          localStorage.setItem('twitter_oauth1_token', parsed.oauthToken);
          localStorage.setItem('twitter_oauth1_secret', parsed.oauthTokenSecret);
          if (parsed.screenName) {
            localStorage.setItem('twitter_oauth1_screen_name', parsed.screenName);
          }

          if (window.opener && !window.opener.closed) {
            const targetOrigin = getPostMessageTargetOrigin();
            window.opener.postMessage(
              {
                type: 'twitter_oauth1_token',
                oauthToken: parsed.oauthToken,
                oauthTokenSecret: parsed.oauthTokenSecret,
                screenName: parsed.screenName,
              },
              targetOrigin
            );
            window.close();
            return;
          }
        } else {
          console.error('[OAuth1 Callback] Unexpected access-token response shape:', raw);
        }
      } catch (error) {
        console.error('[OAuth1 Callback] exchange failed:', error);
      }

      // If popup opened not from the parent window (opener is not accessible) — redirect to the main page.
      if (!window.opener || window.opener.closed) {
        navigate('/');
      } else {
        // In normal flow the popup is simply closed above.
        window.close();
      }
    };

    exchange();
  }, [location, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-2">Processing Twitter OAuth1...</h2>
        <p className="text-gray-600">Please wait while we complete the authorization.</p>
      </div>
    </div>
  );
}

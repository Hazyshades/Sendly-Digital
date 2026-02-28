import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

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
    const redirectUrl = localStorage.getItem('twitter_oauth1_redirect') || '/dashboard';

    const exchange = async () => {
      if (!oauthToken || !oauthVerifier) {
        navigate(redirectUrl);
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

        const data = (await res.json()) as {
          oauthToken?: string;
          oauthTokenSecret?: string;
          screenName?: string;
        };

        if (data.oauthToken && data.oauthTokenSecret) {
          localStorage.setItem('twitter_oauth1_token', data.oauthToken);
          localStorage.setItem('twitter_oauth1_secret', data.oauthTokenSecret);
          if (data.screenName) {
            localStorage.setItem('twitter_oauth1_screen_name', data.screenName);
          }

          if (window.opener && !window.opener.closed) {
            localStorage.removeItem('twitter_oauth1_redirect');
            window.opener.postMessage(
              {
                type: 'twitter_oauth1_token',
                oauthToken: data.oauthToken,
                oauthTokenSecret: data.oauthTokenSecret,
                screenName: data.screenName,
              },
              window.location.origin
            );
            window.close();
            return;
          }
        }
      } catch (error) {
        console.error('[OAuth1 Callback] exchange failed:', error);
      }

      localStorage.removeItem('twitter_oauth1_redirect');
      navigate(redirectUrl);
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

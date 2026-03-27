import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const getZkTlsApiUrl = (): string => {
  const envUrl =
    (import.meta.env.VITE_ZKTLS_SERVICE_URL as string | undefined) ||
    (import.meta.env.VITE_ZKTLS_API_URL as string | undefined);
  if (envUrl) return envUrl;
  // Fallback to same-origin only when API URL is not configured
  // (Vite dev server proxy can forward /api in local setup).
  if (typeof window !== 'undefined' && window.location?.origin) return window.location.origin;
  return 'http://localhost:3001';
};

function clearGmailOAuthStorage(): void {
  localStorage.removeItem('gmail_oauth_state');
  localStorage.removeItem('gmail_oauth_redirect');
  localStorage.removeItem('gmail_code_verifier');
  sessionStorage.removeItem('gmail_oauth_state');
  sessionStorage.removeItem('gmail_oauth_redirect');
  sessionStorage.removeItem('gmail_code_verifier');
}

export function GmailCallbackRoute() {
  const navigate = useNavigate();
  const location = useLocation();
  const hasExchangedRef = useRef(false);

  useEffect(() => {
    if (hasExchangedRef.current) {
      console.log('[POPUP] Gmail code exchange already completed, skipping...');
      return;
    }

    console.log('[POPUP] GmailCallbackRoute mounted');
    console.log('[POPUP] Location:', location.pathname + location.search);

    const params = new URLSearchParams(location.search);

    const code = params.get('code');
    const error = params.get('error');
    const errorDescription = params.get('error_description');
    const state = params.get('state');
    // Read from localStorage: callback runs in popup, which doesn't share sessionStorage with parent
    const storedState = localStorage.getItem('gmail_oauth_state') || sessionStorage.getItem('gmail_oauth_state');
    const redirectUrl = localStorage.getItem('gmail_oauth_redirect') || sessionStorage.getItem('gmail_oauth_redirect') || '/dashboard';
    const codeVerifier = localStorage.getItem('gmail_code_verifier') || sessionStorage.getItem('gmail_code_verifier');

    // Parse target origin from state (format "random:encodedOrigin") for cross-origin callback (e.g. production redirect from local)
    const targetOrigin = (() => {
      if (!state || !storedState) return window.location.origin;
      const colonIdx = state.indexOf(':');
      if (colonIdx === -1) return window.location.origin;
      try {
        return decodeURIComponent(state.slice(colonIdx + 1));
      } catch {
        return window.location.origin;
      }
    })();

    // Allow postMessage only to known app origins (security)
    const allowedOrigins = [
      window.location.origin,
      'https://zk.localhost:3000',
      'http://zk.localhost:3000',
      'https://localhost:3000',
      'http://localhost:3000',
      'https://sendly.digital',
    ];
    const safeTargetOrigin = allowedOrigins.includes(targetOrigin) ? targetOrigin : window.location.origin;

    if (error) {
      console.error('Gmail OAuth error:', error, errorDescription);
      clearGmailOAuthStorage();

      if (window.opener && !window.opener.closed) {
        window.opener.postMessage(
          {
            type: 'gmail_oauth_error',
            error: errorDescription || error,
          },
          safeTargetOrigin
        );
      }

      navigate(redirectUrl);
      return;
    }

    if (!code) {
      console.error('No authorization code received from Gmail');
      clearGmailOAuthStorage();
      navigate(redirectUrl);
      return;
    }

    // State validation: when callback is cross-origin (e.g. production), we can't read opener's localStorage,
    // so accept state if it has "random:origin" format and origin is in allow list.
    const stateValid =
      state &&
      (state === storedState ||
        (state.includes(':') && allowedOrigins.includes(targetOrigin)));
    if (!stateValid) {
      console.error('State mismatch in OAuth callback');
      clearGmailOAuthStorage();
      navigate(redirectUrl);
      return;
    }

    hasExchangedRef.current = true;

    const exchangeCodeForToken = async () => {
      try {
        const redirectUri = `${window.location.origin}/auth/gmail/callback`;

        const apiUrl = getZkTlsApiUrl().replace(/\/$/, '');
        const fullUrl = `${apiUrl}/api/gmail/oauth/exchange`;

        const response = await fetch(fullUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            code,
            redirectUri,
            codeVerifier: codeVerifier || undefined,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to exchange code: ${response.status} ${errorText}`);
        }

        const tokenData = await response.json();

        if (!tokenData.success || !tokenData.accessToken) {
          throw new Error('Failed to get access token from exchange');
        }

        const accessToken = tokenData.accessToken;
        localStorage.setItem('gmail_oauth', accessToken);
        localStorage.setItem('gmail_oauth_token', accessToken);
        if (tokenData.scope) {
          localStorage.setItem('gmail_oauth_scope', tokenData.scope);
        }

        clearGmailOAuthStorage();

        if (window.opener && !window.opener.closed) {
          window.opener.postMessage(
            {
              type: 'gmail_oauth_token',
              accessToken,
            },
            safeTargetOrigin
          );
          setTimeout(() => window.close(), 500);
        } else {
          navigate(redirectUrl);
        }
      } catch (err) {
        console.error('[POPUP] Gmail code exchange error:', err);
        clearGmailOAuthStorage();

        if (window.opener && !window.opener.closed) {
          window.opener.postMessage(
            {
              type: 'gmail_oauth_error',
              error: err instanceof Error ? err.message : 'Failed to exchange code',
            },
            safeTargetOrigin
          );
        }

        navigate(redirectUrl);
      }
    };

    exchangeCodeForToken();
  }, [location, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-2">Processing Gmail authorization...</h2>
        <p className="text-gray-600">Please wait while we complete the authorization process.</p>
      </div>
    </div>
  );
}

import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const getZkTlsApiUrl = (): string => {
  if (typeof window !== 'undefined' && window.location?.origin) return window.location.origin;
  const envUrl =
    (import.meta.env.VITE_ZKTLS_SERVICE_URL as string | undefined) ||
    (import.meta.env.VITE_ZKTLS_API_URL as string | undefined);
  if (envUrl) return envUrl;
  return 'http://localhost:3001';
};

export function LinkedInCallbackRoute() {
  const navigate = useNavigate();
  const location = useLocation();
  const hasExchangedRef = useRef(false);

  useEffect(() => {
    if (hasExchangedRef.current) {
      console.log('[POPUP] LinkedIn code exchange already completed, skipping...');
      return;
    }

    console.log('[POPUP] LinkedInCallbackRoute mounted');
    console.log('[POPUP] Location:', location.pathname + location.search);

    const params = new URLSearchParams(location.search);

    const code = params.get('code');
    const error = params.get('error');
    const errorDescription = params.get('error_description');
    const state = params.get('state');
    const storedState = localStorage.getItem('linkedin_oauth_state') || sessionStorage.getItem('linkedin_oauth_state');
    const redirectUrl = localStorage.getItem('linkedin_oauth_redirect') || sessionStorage.getItem('linkedin_oauth_redirect') || '/dashboard';
    const codeVerifier = localStorage.getItem('linkedin_code_verifier') || sessionStorage.getItem('linkedin_code_verifier');

    if (error) {
      console.error('LinkedIn OAuth error:', error, errorDescription);
      localStorage.removeItem('linkedin_oauth_state');
      localStorage.removeItem('linkedin_oauth_redirect');
      localStorage.removeItem('linkedin_code_verifier');
      sessionStorage.removeItem('linkedin_oauth_state');
      sessionStorage.removeItem('linkedin_oauth_redirect');
      sessionStorage.removeItem('linkedin_code_verifier');

      if (window.opener && !window.opener.closed) {
        window.opener.postMessage(
          {
            type: 'linkedin_oauth_error',
            error: errorDescription || error,
          },
          window.location.origin
        );
      }

      navigate(redirectUrl);
      return;
    }

    if (!code) {
      console.error('No authorization code received from LinkedIn');
      localStorage.removeItem('linkedin_oauth_state');
      localStorage.removeItem('linkedin_oauth_redirect');
      localStorage.removeItem('linkedin_code_verifier');
      sessionStorage.removeItem('linkedin_oauth_state');
      sessionStorage.removeItem('linkedin_oauth_redirect');
      sessionStorage.removeItem('linkedin_code_verifier');
      navigate(redirectUrl);
      return;
    }

    if (state && storedState && state !== storedState) {
      console.error('State mismatch in OAuth callback');
      localStorage.removeItem('linkedin_oauth_state');
      localStorage.removeItem('linkedin_oauth_redirect');
      localStorage.removeItem('linkedin_code_verifier');
      sessionStorage.removeItem('linkedin_oauth_state');
      sessionStorage.removeItem('linkedin_oauth_redirect');
      sessionStorage.removeItem('linkedin_code_verifier');
      navigate(redirectUrl);
      return;
    }

    hasExchangedRef.current = true;

    const exchangeCodeForToken = async () => {
      try {
        const redirectUri = `${window.location.origin}/auth/linkedin/callback`;

        const apiUrl = getZkTlsApiUrl().replace(/\/$/, '');
        const fullUrl = `${apiUrl}/api/linkedin/oauth/exchange`;

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
        localStorage.setItem('linkedin_oauth', accessToken);
        localStorage.setItem('linkedin_oauth_token', accessToken);
        if (tokenData.scope) {
          localStorage.setItem('linkedin_oauth_scope', tokenData.scope);
        }

        localStorage.removeItem('linkedin_oauth_state');
        localStorage.removeItem('linkedin_oauth_redirect');
        localStorage.removeItem('linkedin_code_verifier');
        sessionStorage.removeItem('linkedin_oauth_state');
        sessionStorage.removeItem('linkedin_oauth_redirect');
        sessionStorage.removeItem('linkedin_code_verifier');

        if (window.opener && !window.opener.closed) {
          window.opener.postMessage(
            {
              type: 'linkedin_oauth_token',
              accessToken,
            },
            window.location.origin
          );
          setTimeout(() => window.close(), 500);
        } else {
          navigate(redirectUrl);
        }
      } catch (err) {
        console.error('[POPUP] LinkedIn code exchange error:', err);
        localStorage.removeItem('linkedin_oauth_state');
        localStorage.removeItem('linkedin_oauth_redirect');
        localStorage.removeItem('linkedin_code_verifier');
        sessionStorage.removeItem('linkedin_oauth_state');
        sessionStorage.removeItem('linkedin_oauth_redirect');
        sessionStorage.removeItem('linkedin_code_verifier');

        if (window.opener && !window.opener.closed) {
          window.opener.postMessage(
            {
              type: 'linkedin_oauth_error',
              error: err instanceof Error ? err.message : 'Failed to exchange code',
            },
            window.location.origin
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
        <h2 className="text-xl font-semibold mb-2">Processing LinkedIn authorization...</h2>
        <p className="text-gray-600">Please wait while we complete the authorization process.</p>
      </div>
    </div>
  );
}

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

export function TwitterCallbackRoute() {
  const navigate = useNavigate();
  const location = useLocation();
  const hasExchangedRef = useRef(false);

  useEffect(() => {
    if (hasExchangedRef.current) {
      return;
    }
    
    const params = new URLSearchParams(location.search);
    
    const code = params.get('code');
    const error = params.get('error');
    const state = params.get('state');
    const storedState = sessionStorage.getItem('twitter_oauth_state');
    const redirectUrl = sessionStorage.getItem('twitter_oauth_redirect') || '/dashboard';
    const codeVerifier = sessionStorage.getItem('twitter_code_verifier');
    
    const closeOrRedirect = () => {
      if (window.opener && !window.opener.closed) {
        setTimeout(() => {
          try {
            window.close();
          } catch {
            // ignore
          }
        }, 300);
      } else {
        navigate(redirectUrl);
      }
    };

    if (error) {
      console.error('Twitter OAuth error:', error);
      sessionStorage.removeItem('twitter_oauth_state');
      sessionStorage.removeItem('twitter_oauth_redirect');
      sessionStorage.removeItem('twitter_code_verifier');
      
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage({
          type: 'twitter_oauth_error',
          error: error
        }, window.location.origin);
      }
      
      closeOrRedirect();
      return;
    }

    if (!code) {
      console.error('No authorization code received from Twitter');
      sessionStorage.removeItem('twitter_oauth_state');
      sessionStorage.removeItem('twitter_oauth_redirect');
      sessionStorage.removeItem('twitter_code_verifier');
      closeOrRedirect();
      return;
    }

    if (state && storedState && state !== storedState) {
      console.error('State mismatch in OAuth callback');
      sessionStorage.removeItem('twitter_oauth_state');
      sessionStorage.removeItem('twitter_oauth_redirect');
      sessionStorage.removeItem('twitter_code_verifier');
      closeOrRedirect();
      return;
    }

    hasExchangedRef.current = true;

    const exchangeCodeForToken = async () => {
      
      try {
        const redirectUri = `${window.location.origin}/auth/twitter/callback`;
        
        const apiUrl = getZkTlsApiUrl().replace(/\/$/, '');
        const fullUrl = `${apiUrl}/api/twitter/oauth/exchange`;
        
        const requestBody = {
          code: code,
          redirectUri: redirectUri,
          codeVerifier: codeVerifier || undefined,
        };
        
        const response = await fetch(fullUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        }).catch(async (err) => {
          console.error('[POPUP] Fetch error:', err);
          console.error('[POPUP] Error details:', {
            name: err?.name,
            message: err?.message,
            stack: err?.stack,
          });
          throw err;
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
        const hasOpener = window.opener && !window.opener.closed;

        if (!hasOpener) {
          localStorage.setItem('twitter_oauth', accessToken);
          localStorage.setItem('twitter_oauth_token', accessToken);
          if (tokenData.tokenType) {
            localStorage.setItem('twitter_oauth_token_type', tokenData.tokenType);
          }
          if (tokenData.scope) {
            localStorage.setItem('twitter_oauth_scope', tokenData.scope);
          }
          if (tokenData.refreshToken) {
            localStorage.setItem('twitter_refresh_token', tokenData.refreshToken);
          }
        }
        
        sessionStorage.removeItem('twitter_oauth_state');
        sessionStorage.removeItem('twitter_oauth_redirect');
        sessionStorage.removeItem('twitter_code_challenge');

        if (hasOpener) {
          const messageData = {
            type: 'twitter_oauth_token',
            accessToken: accessToken
          };
          
          try {
            window.opener.postMessage(messageData, window.location.origin);
          } catch (error) {
            console.error('[POPUP] Error sending postMessage:', error);
          }
        }

        closeOrRedirect();
      } catch (error) {
        console.error('[POPUP] Error exchanging code for token:', error);
        sessionStorage.removeItem('twitter_oauth_state');
        sessionStorage.removeItem('twitter_oauth_redirect');
        sessionStorage.removeItem('twitter_code_challenge');
        
        if (window.opener && !window.opener.closed) {
          window.opener.postMessage({
            type: 'twitter_oauth_error',
            error: error instanceof Error ? error.message : 'Failed to exchange code'
          }, window.location.origin);
        }
        
        closeOrRedirect();
      }
    };

    exchangeCodeForToken();
  }, [location, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-2">Processing Twitter authorization...</h2>
        <p className="text-gray-600">Please wait while we complete the authorization process.</p>
      </div>
    </div>
  );
}


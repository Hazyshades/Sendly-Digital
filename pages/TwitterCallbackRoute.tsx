import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
const getZkTlsApiUrl = (): string => {
  if (typeof window !== 'undefined' && window.location?.origin) return window.location.origin;
  const envUrl =
    (import.meta.env.VITE_RECLAIM_API_URL as string | undefined) ||
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
      console.log('[POPUP] Code exchange already completed, skipping...');
      return;
    }

    console.log('[POPUP] TwitterCallbackRoute mounted');
    console.log('[POPUP] Location:', location.pathname + location.search);
    console.log('[POPUP] Location search:', location.search);
    console.log('[POPUP] Window opener exists:', !!window.opener);
    console.log('[POPUP] Window opener closed:', window.opener?.closed);
    
    const params = new URLSearchParams(location.search);
    
    const code = params.get('code');
    const error = params.get('error');
    const state = params.get('state');
    const storedState = sessionStorage.getItem('twitter_oauth_state');
    const redirectUrl = sessionStorage.getItem('twitter_oauth_redirect') || '/dashboard';
    const codeVerifier = sessionStorage.getItem('twitter_code_verifier');
    
    console.log('[POPUP] Authorization code found:', !!code);
    console.log('[POPUP] Error:', error);
    console.log('[POPUP] State:', state);
    console.log('[POPUP] Stored state:', storedState);

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
      
      navigate(redirectUrl);
      return;
    }

    if (!code) {
      console.error('No authorization code received from Twitter');
      sessionStorage.removeItem('twitter_oauth_state');
      sessionStorage.removeItem('twitter_oauth_redirect');
      sessionStorage.removeItem('twitter_code_verifier');
      navigate(redirectUrl);
      return;
    }

    if (state && storedState && state !== storedState) {
      console.error('State mismatch in OAuth callback');
      sessionStorage.removeItem('twitter_oauth_state');
      sessionStorage.removeItem('twitter_oauth_redirect');
      sessionStorage.removeItem('twitter_code_verifier');
      navigate(redirectUrl);
      return;
    }

    hasExchangedRef.current = true;
    console.log('[POPUP] 🔒 Lock set to prevent duplicate code exchange');

    const exchangeCodeForToken = async () => {
      
      try {
        const redirectUri = `${window.location.origin}/auth/twitter/callback`;
        
        const apiUrl = getZkTlsApiUrl().replace(/\/$/, '');
        const fullUrl = `${apiUrl}/api/twitter/oauth/exchange`;
        
        console.log('[POPUP] Exchange code for token:');
        console.log('[POPUP] API URL:', apiUrl);
        console.log('[POPUP] Full URL:', fullUrl);
        console.log('[POPUP] Redirect URI:', redirectUri);
        console.log('[POPUP] Has code verifier:', !!codeVerifier);
        console.log('[POPUP] Code (first 10 chars):', code?.substring(0, 10) + '...');
        
        const requestBody = {
          code: code,
          redirectUri: redirectUri,
          codeVerifier: codeVerifier || undefined,
        };
        
        console.log('[POPUP] Request body (without code):', { ...requestBody, code: '[REDACTED]' });
        
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
        
        console.log('[POPUP] Response received:', {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
          headers: Object.fromEntries(response.headers.entries()),
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
        console.log('[POPUP] ✅ Code exchange successful! Token received.');
        console.log('[POPUP] Saving Twitter token to popup localStorage:', accessToken.substring(0, 20) + '...');
        if (tokenData.tokenType) {
          console.log('[POPUP] Twitter token type:', tokenData.tokenType);
        }
        if (tokenData.scope) {
          console.log('[POPUP] Twitter token scopes:', tokenData.scope);
        }
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
        
        console.log('[POPUP] Token saved in popup. Verifying:', localStorage.getItem('twitter_oauth') ? 'Token found (key: twitter_oauth)' : 'Token NOT found!');
        
        sessionStorage.removeItem('twitter_oauth_state');
        sessionStorage.removeItem('twitter_oauth_redirect');
        sessionStorage.removeItem('twitter_code_challenge');

        if (window.opener && !window.opener.closed) {
          console.log('[POPUP] Sending token to parent window via postMessage...');
          
          const messageData = {
            type: 'twitter_oauth_token',
            accessToken: accessToken
          };
          
          try {
            window.opener.postMessage(messageData, window.location.origin);
            console.log('[POPUP] ✅ postMessage sent successfully to:', window.location.origin);
          } catch (error) {
            console.error('[POPUP] ❌ Error sending postMessage:', error);
          }
          
          setTimeout(() => {
            console.log('[POPUP] Closing popup window...');
            window.close();
          }, 1000);
        } else {
          console.log('[POPUP] No window.opener or opener is closed, navigating instead...');
          navigate(redirectUrl);
        }
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
        
        navigate(redirectUrl);
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


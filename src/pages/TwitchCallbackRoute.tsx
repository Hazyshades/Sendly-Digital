import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export function TwitchCallbackRoute() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const hash = location.hash.substring(1);
    const params = new URLSearchParams(hash);
    
    const accessToken = params.get('access_token');
    const error = params.get('error');
    const state = params.get('state');
    const storedState = sessionStorage.getItem('twitch_oauth_state');
    const redirectUrl = sessionStorage.getItem('twitch_oauth_redirect') || '/dashboard';

    if (error) {
      console.error('Twitch OAuth error:', error);
      sessionStorage.removeItem('twitch_oauth_state');
      sessionStorage.removeItem('twitch_oauth_redirect');
      navigate(redirectUrl);
      return;
    }

    if (!accessToken) {
      console.error('No access token received from Twitch');
      sessionStorage.removeItem('twitch_oauth_state');
      sessionStorage.removeItem('twitch_oauth_redirect');
      navigate(redirectUrl);
      return;
    }

    if (state && storedState && state !== storedState) {
      console.error('State mismatch in OAuth callback');
      sessionStorage.removeItem('twitch_oauth_state');
      sessionStorage.removeItem('twitch_oauth_redirect');
      navigate(redirectUrl);
      return;
    }

    const hasOpener = window.opener && !window.opener.closed;
    if (!hasOpener) {
      localStorage.setItem('twitch_oauth', accessToken);
      localStorage.setItem('twitch_oauth_token', accessToken);
    }
    
    // Clean up temporary OAuth flow data
    sessionStorage.removeItem('twitch_oauth_state');
    sessionStorage.removeItem('twitch_oauth_redirect');

    // Notify parent window about successful authorization
    // IMPORTANT: This must happen BEFORE window.close() to ensure message is received
    if (hasOpener) {
      const messageData = {
        type: 'twitch_oauth_token',
        accessToken: accessToken
      };

      try {
        window.opener.postMessage(messageData, window.location.origin);
      } catch (error) {
        console.error('[POPUP] Error sending postMessage:', error);
      }

      // Give parent window time to receive and save the token
      setTimeout(() => {
        window.close();
      }, 1000);
    } else {
      navigate(redirectUrl);
    }
  }, [location, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-2">Processing Twitch authorization...</h2>
        <p className="text-gray-600">Please wait while we complete the authorization process.</p>
      </div>
    </div>
  );
}


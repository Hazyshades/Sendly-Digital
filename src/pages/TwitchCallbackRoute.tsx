import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export function TwitchCallbackRoute() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    console.log('[POPUP] TwitchCallbackRoute mounted');
    console.log('[POPUP] Location:', window.location.href);
    console.log('[POPUP] Location hash:', location.hash);
    console.log('[POPUP] Window opener exists:', !!window.opener);
    console.log('[POPUP] Window opener closed:', window.opener?.closed);
    
    const hash = location.hash.substring(1);
    const params = new URLSearchParams(hash);
    
    const accessToken = params.get('access_token');
    const error = params.get('error');
    const state = params.get('state');
    const storedState = sessionStorage.getItem('twitch_oauth_state');
    const redirectUrl = sessionStorage.getItem('twitch_oauth_redirect') || '/dashboard';
    
    console.log('[POPUP] Access token found:', !!accessToken);
    console.log('[POPUP] Error:', error);
    console.log('[POPUP] State:', state);
    console.log('[POPUP] Stored state:', storedState);

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

    // Save token to localStorage in popup window (will be copied to main window via postMessage)
    // Use key 'twitch_oauth' as user suggested
    console.log('[POPUP] Saving Twitch token to popup localStorage:', accessToken.substring(0, 20) + '...');
    localStorage.setItem('twitch_oauth', accessToken);
    // Also save with standard key for compatibility
    localStorage.setItem('twitch_oauth_token', accessToken);
    console.log('[POPUP] Token saved in popup. Verifying:', localStorage.getItem('twitch_oauth') ? 'Token found (key: twitch_oauth)' : 'Token NOT found!');
    
    // Clean up temporary OAuth flow data
    sessionStorage.removeItem('twitch_oauth_state');
    sessionStorage.removeItem('twitch_oauth_redirect');

    // Notify parent window about successful authorization
    // IMPORTANT: This must happen BEFORE window.close() to ensure message is received
    if (window.opener && !window.opener.closed) {
      console.log('[POPUP] Sending token to parent window via postMessage...');
      console.log('[POPUP] Parent window origin:', window.opener.location.origin);
      console.log('[POPUP] Current window origin:', window.location.origin);
      console.log('[POPUP] Token to send:', accessToken.substring(0, 20) + '...');
      
      const messageData = {
        type: 'twitch_oauth_token',
        accessToken: accessToken
      };
      
      console.log('[POPUP] Message data:', messageData);
      
      try {
        window.opener.postMessage(messageData, window.location.origin);
        console.log('[POPUP] ✅ postMessage sent successfully to:', window.location.origin);
      } catch (error) {
        console.error('[POPUP] ❌ Error sending postMessage:', error);
      }
      
      console.log('[POPUP] Waiting 1 second before closing to ensure message is received...');
      
      // Give parent window time to receive and save the token
      setTimeout(() => {
        console.log('[POPUP] Closing popup window...');
        window.close();
      }, 1000);
    } else {
      console.log('[POPUP] No window.opener or opener is closed, navigating instead...');
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


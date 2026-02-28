import { useState, useEffect, useCallback } from 'react';
import { connectTwitch, clearTwitchToken } from '@/components/zksend/Oauth/twitch';

export function useTwitchConnection() {
  const [isConnected, setIsConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    const token =
      localStorage.getItem('twitch_oauth_token') ||
      localStorage.getItem('twitch_oauth') ||
      localStorage.getItem('twitch_access_token');
    if (token && token.length > 10) {
      setIsConnected(true);
      setAccessToken(token);
    } else {
      setIsConnected(false);
      setAccessToken(null);
    }
  }, []);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (
        e.key === 'twitch_oauth_token' ||
        e.key === 'twitch_oauth' ||
        e.key === 'twitch_access_token'
      ) {
        const token =
          e.newValue ||
          localStorage.getItem('twitch_oauth_token') ||
          localStorage.getItem('twitch_oauth');
        if (token && token.length > 10) {
          setIsConnected(true);
          setAccessToken(token);
        } else {
          setIsConnected(false);
          setAccessToken(null);
        }
      }
    };
    const handleCustom = () => {
      const token =
        localStorage.getItem('twitch_oauth_token') ||
        localStorage.getItem('twitch_oauth');
      if (token && token.length > 10) {
        setIsConnected(true);
        setAccessToken(token);
      } else {
        setIsConnected(false);
        setAccessToken(null);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('twitch-oauth-updated', handleCustom);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('twitch-oauth-updated', handleCustom);
    };
  }, []);

  const connect = useCallback(async () => {
    if (connecting) return;
    setConnecting(true);
    try {
      const token = await connectTwitch();
      if (token) {
        setIsConnected(true);
        setAccessToken(token);
        window.dispatchEvent(new CustomEvent('twitch-oauth-updated'));
      } else {
        setIsConnected(false);
        setAccessToken(null);
      }
    } catch (error) {
      console.error('[useTwitchConnection] Connect error:', error);
      setIsConnected(false);
      setAccessToken(null);
    } finally {
      setConnecting(false);
    }
  }, [connecting]);

  const disconnect = useCallback(() => {
    if (clearing) return;
    setClearing(true);
    try {
      clearTwitchToken();
      setIsConnected(false);
      setAccessToken(null);
      window.dispatchEvent(new CustomEvent('twitch-oauth-updated'));
    } catch (error) {
      console.error('[useTwitchConnection] Disconnect error:', error);
    } finally {
      setClearing(false);
    }
  }, [clearing]);

  return {
    isConnected,
    connecting,
    clearing,
    connect,
    disconnect,
    accessToken,
  };
}

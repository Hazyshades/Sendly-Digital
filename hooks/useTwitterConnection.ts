import { useState, useEffect, useCallback } from 'react';
import { connectTwitter, clearTwitterToken } from '../components/zksend/Oauth/twitter';

export function useTwitterConnection() {
  const [isConnected, setIsConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    const oauth1Token = localStorage.getItem('twitter_oauth1_token');
    const oauth1Secret = localStorage.getItem('twitter_oauth1_secret');
    if (oauth1Token && oauth1Secret) {
      setIsConnected(true);
      setAccessToken(oauth1Token);
      return;
    }
    const raw = localStorage.getItem('twitter_oauth_token') || localStorage.getItem('twitter_oauth');
    if (!raw) {
      setIsConnected(false);
      setAccessToken(null);
      return;
    }
    let token: string | null = raw;
    if (raw.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(raw) as { access_token?: string; token?: string };
        token = parsed.access_token ?? parsed.token ?? null;
      } catch {
        token = raw;
      }
    }
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
        e.key === 'twitter_oauth_token' ||
        e.key === 'twitter_oauth' ||
        e.key === 'twitter_oauth1_token' ||
        e.key === 'twitter_oauth1_secret'
      ) {
        const oauth1Token = localStorage.getItem('twitter_oauth1_token');
        const oauth1Secret = localStorage.getItem('twitter_oauth1_secret');
        if (oauth1Token && oauth1Secret) {
          setIsConnected(true);
          setAccessToken(oauth1Token);
          return;
        }
        const token = localStorage.getItem('twitter_oauth_token') || localStorage.getItem('twitter_oauth');
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
      const oauth1Token = localStorage.getItem('twitter_oauth1_token');
      const oauth1Secret = localStorage.getItem('twitter_oauth1_secret');
      if (oauth1Token && oauth1Secret) {
        setIsConnected(true);
        setAccessToken(oauth1Token);
        return;
      }
      const token = localStorage.getItem('twitter_oauth_token') || localStorage.getItem('twitter_oauth');
      if (token && token.length > 10) {
        setIsConnected(true);
        setAccessToken(token);
      } else {
        setIsConnected(false);
        setAccessToken(null);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('twitter-oauth-updated', handleCustom);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('twitter-oauth-updated', handleCustom);
    };
  }, []);

  const connect = useCallback(async () => {
    if (connecting) return;
    setConnecting(true);
    try {
      const token = await connectTwitter();
      if (token) {
        setIsConnected(true);
        setAccessToken(token);
        window.dispatchEvent(new CustomEvent('twitter-oauth-updated'));
      } else {
        setIsConnected(false);
        setAccessToken(null);
      }
    } catch (error) {
      console.error('[useTwitterConnection] Connect error:', error);
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
      clearTwitterToken();
      setIsConnected(false);
      setAccessToken(null);
      window.dispatchEvent(new CustomEvent('twitter-oauth-updated'));
    } catch (error) {
      console.error('[useTwitterConnection] Disconnect error:', error);
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

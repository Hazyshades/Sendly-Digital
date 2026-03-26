import { useState, useEffect, useCallback } from 'react';
import { connectGmail, clearGmailToken } from '@/components/zksend/Oauth/gmail';

export function useGmailConnection() {
  const [isConnected, setIsConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('gmail_oauth_token') || localStorage.getItem('gmail_oauth');
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
      if (e.key === 'gmail_oauth_token' || e.key === 'gmail_oauth') {
        const token = e.newValue || localStorage.getItem('gmail_oauth_token') || localStorage.getItem('gmail_oauth');
        if (token && token.length > 10) {
          setIsConnected(true);
          setAccessToken(token);
        } else {
          setIsConnected(false);
          setAccessToken(null);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);

    const handleCustomEvent = () => {
      const token = localStorage.getItem('gmail_oauth_token') || localStorage.getItem('gmail_oauth');
      if (token && token.length > 10) {
        setIsConnected(true);
        setAccessToken(token);
      } else {
        setIsConnected(false);
        setAccessToken(null);
      }
    };

    window.addEventListener('gmail-oauth-updated', handleCustomEvent);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('gmail-oauth-updated', handleCustomEvent);
    };
  }, []);

  const connect = useCallback(async () => {
    if (connecting) return;
    setConnecting(true);
    try {
      const token = await connectGmail();
      if (token) {
        setIsConnected(true);
        setAccessToken(token);
        window.dispatchEvent(new CustomEvent('gmail-oauth-updated'));
      } else {
        setIsConnected(false);
        setAccessToken(null);
      }
    } catch (error) {
      console.error('[useGmailConnection] Connect error:', error);
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
      clearGmailToken();
      setIsConnected(false);
      setAccessToken(null);
      window.dispatchEvent(new CustomEvent('gmail-oauth-updated'));
    } catch (error) {
      console.error('[useGmailConnection] Disconnect error:', error);
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

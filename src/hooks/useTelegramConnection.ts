import { useState, useEffect, useCallback } from 'react';
import { connectTelegram, clearTelegramToken } from '@/components/zksend/Oauth/telegram';
const STORAGE_KEYS = ['telegram_oauth_token', 'telegram_oauth'] as const;
const UPDATE_EVENT = 'telegram-oauth-updated';

function readTelegramToken(): string | null {
  for (const key of STORAGE_KEYS) {
    const token = localStorage.getItem(key);
    if (token && token.length > 10) return token;
  }
  return null;
}

export function useTelegramConnection() {
  const [isConnected, setIsConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const syncFromStorage = useCallback(() => {
    const token = readTelegramToken();
    setIsConnected(!!token);
    setAccessToken(token);
  }, []);

  useEffect(() => {
    syncFromStorage();
  }, [syncFromStorage]);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key && STORAGE_KEYS.includes(e.key as (typeof STORAGE_KEYS)[number])) {
        syncFromStorage();
      }
    };
    const handleCustom = () => syncFromStorage();

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener(UPDATE_EVENT, handleCustom);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener(UPDATE_EVENT, handleCustom);
    };
  }, [syncFromStorage]);

  const connect = useCallback(async () => {
    if (connecting) return;
    setConnecting(true);
    try {
      const token = await connectTelegram();
      if (token) {
        setIsConnected(true);
        setAccessToken(token);
        window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
      } else {
        setIsConnected(false);
        setAccessToken(null);
      }
    } catch (error) {
      console.error('[useTelegramConnection] Connect error:', error);
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
      clearTelegramToken();
      setIsConnected(false);
      setAccessToken(null);
      window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
    } catch (error) {
      console.error('[useTelegramConnection] Disconnect error:', error);
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

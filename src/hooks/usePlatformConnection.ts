import { useState, useEffect, useCallback, useMemo } from 'react';

export type PlatformConnectionDescriptor = {
  id: string;
  storageKeys: readonly string[];
  updateEvent: string;
  connect: () => Promise<string | null>;
  clear: () => void;
  readToken?: () => string | null;
};

function defaultReadToken(storageKeys: readonly string[]): string | null {
  if (typeof window === 'undefined') return null;
  for (const key of storageKeys) {
    const token = localStorage.getItem(key);
    if (token && token.length > 10) return token;
  }
  return null;
}

export function usePlatformConnection(descriptor: PlatformConnectionDescriptor) {
  const { id, storageKeys, updateEvent, connect: connectFn, clear: clearFn, readToken } = descriptor;

  const [isConnected, setIsConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const read = useCallback(() => {
    return readToken ? readToken() : defaultReadToken(storageKeys);
  }, [readToken, storageKeys]);

  const syncFromStorage = useCallback(() => {
    const token = read();
    setIsConnected(!!token);
    setAccessToken(token);
  }, [read]);

  useEffect(() => {
    syncFromStorage();
  }, [syncFromStorage]);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key && (storageKeys as readonly string[]).includes(e.key)) {
        syncFromStorage();
      }
    };
    const handleCustom = () => syncFromStorage();

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener(updateEvent, handleCustom);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener(updateEvent, handleCustom);
    };
  }, [storageKeys, updateEvent, syncFromStorage]);

  const connect = useCallback(async () => {
    if (connecting) return;
    setConnecting(true);
    try {
      const token = await connectFn();
      if (token) {
        setIsConnected(true);
        setAccessToken(token);
        window.dispatchEvent(new CustomEvent(updateEvent));
      } else {
        setIsConnected(false);
        setAccessToken(null);
      }
    } catch (error) {
      console.error(`[usePlatformConnection:${id}] Connect error:`, error);
      setIsConnected(false);
      setAccessToken(null);
    } finally {
      setConnecting(false);
    }
  }, [connecting, connectFn, updateEvent, id]);

  const disconnect = useCallback(() => {
    if (clearing) return;
    setClearing(true);
    try {
      clearFn();
      setIsConnected(false);
      setAccessToken(null);
      window.dispatchEvent(new CustomEvent(updateEvent));
    } catch (error) {
      console.error(`[usePlatformConnection:${id}] Disconnect error:`, error);
    } finally {
      setClearing(false);
    }
  }, [clearing, clearFn, updateEvent, id]);

  return useMemo(
    () => ({
      isConnected,
      connecting,
      clearing,
      connect,
      disconnect,
      accessToken,
    }),
    [isConnected, connecting, clearing, connect, disconnect, accessToken],
  );
}

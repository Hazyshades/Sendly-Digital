import { useCallback, useEffect, useState } from 'react';
import { isZkHost } from '@/lib/runtime/zkHost';
import type { ZkOAuthIdentity } from './types';
import { ZK_OAUTH_IDENTITY_UPDATED_EVENT } from './tokenStorage';
import { resolveZkOAuthIdentity } from './resolveZkOAuthIdentity';

export function useZkOAuthIdentity() {
  const zk = isZkHost();
  const [identity, setIdentity] = useState<ZkOAuthIdentity | null>(null);
  const [loading, setLoading] = useState(zk);
  const [version, setVersion] = useState(0);

  const refresh = useCallback(() => {
    setVersion((v) => v + 1);
  }, []);

  useEffect(() => {
    if (!zk) {
      setIdentity(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    void resolveZkOAuthIdentity()
      .then((resolved) => {
        if (!cancelled) setIdentity(resolved);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [zk, version]);

  useEffect(() => {
    if (!zk) return;

    const onStorage = (event: StorageEvent) => {
      if (
        event.key?.includes('twitter_oauth') ||
        event.key?.includes('twitch_oauth') ||
        event.key?.includes('telegram_oauth')
      ) {
        refresh();
      }
    };

    const onIdentityUpdated = () => refresh();

    window.addEventListener('storage', onStorage);
    window.addEventListener(ZK_OAUTH_IDENTITY_UPDATED_EVENT, onIdentityUpdated);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(ZK_OAUTH_IDENTITY_UPDATED_EVENT, onIdentityUpdated);
    };
  }, [zk, refresh]);

  return { identity, loading, isZkHost: zk };
}

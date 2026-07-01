import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTwitterConnection } from '@/hooks/useTwitterConnection';
import { useTwitchConnection } from '@/hooks/useTwitchConnection';
import { useGithubConnection } from '@/hooks/useGithubConnection';
import { useTelegramConnection } from '@/hooks/useTelegramConnection';
import { useGmailConnection } from '@/hooks/useGmailConnection';
import { useLinkedInConnection } from '@/hooks/useLinkedInConnection';
import { notifyZkOAuthIdentityUpdated } from '@/lib/zk-oauth/notifyIdentityUpdated';
import { ZK_OAUTH_IDENTITY_UPDATED_EVENT } from '@/lib/zk-oauth/tokenStorage';
import { resolveGithubDisplayName } from '@/lib/zk-oauth/resolveGithubDisplayName';
import { resolveGmailDisplayName } from '@/lib/zk-oauth/resolveGmailDisplayName';
import { resolveLinkedInDisplayName } from '@/lib/zk-oauth/resolveLinkedInDisplayName';
import { readTwitterOAuthTokens } from '@/lib/zk-oauth/tokenStorage';

export type ZkPanelPlatformId =
  | 'twitter'
  | 'twitch'
  | 'github'
  | 'telegram'
  | 'gmail'
  | 'linkedin'
  | 'instagram';

export type ZkPlatformConnectionState = {
  id: ZkPanelPlatformId;
  label: string;
  isConnected: boolean;
  connecting: boolean;
  clearing: boolean;
  disabled: boolean;
  walletSupported: boolean;
  displayName: string | null;
  displayNameLoading: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
};

const PLATFORM_LABELS: Record<ZkPanelPlatformId, string> = {
  twitter: 'Twitter / X',
  twitch: 'Twitch',
  github: 'GitHub',
  telegram: 'Telegram',
  gmail: 'Gmail',
  linkedin: 'LinkedIn',
  instagram: 'Instagram',
};

const WALLET_SUPPORTED: Record<ZkPanelPlatformId, boolean> = {
  twitter: true,
  twitch: true,
  github: true,
  telegram: true,
  gmail: true,
  linkedin: true,
  instagram: false,
};

type OAuthPlatformId = Exclude<ZkPanelPlatformId, 'instagram'>;

async function resolveTwitterDisplayName(accessToken: string | null): Promise<string | null> {
  const tokens = readTwitterOAuthTokens();
  if (!tokens) return null;
  if (tokens.kind === 'oauth1' && tokens.screenName) {
    return `@${tokens.screenName.replace(/^@/, '')}`;
  }
  if (tokens.kind === 'oauth2' && accessToken) {
    try {
      const response = await fetch('https://api.x.com/2/users/me?user.fields=username', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!response.ok) return null;
      const data = (await response.json()) as { data?: { username?: string } };
      return data.data?.username ? `@${data.data.username}` : null;
    } catch {
      return null;
    }
  }
  return null;
}

async function resolveTwitchDisplayName(accessToken: string | null): Promise<string | null> {
  if (!accessToken) return null;
  const clientId = import.meta.env.VITE_TWITCH_CLIENT_ID as string | undefined;
  if (!clientId) return null;
  try {
    const response = await fetch('https://api.twitch.tv/helix/users', {
      headers: { Authorization: `Bearer ${accessToken}`, 'Client-Id': clientId },
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { data?: Array<{ login?: string }> };
    const login = data.data?.[0]?.login;
    return login ? login : null;
  } catch {
    return null;
  }
}

async function resolveTelegramDisplayName(accessToken: string | null): Promise<string | null> {
  if (!accessToken) return null;
  const parts = accessToken.split('.');
  if (parts.length === 3) {
    try {
      const json = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
      const payload = JSON.parse(json) as { username?: string };
      if (payload.username) return `@${payload.username.replace(/^@/, '')}`;
    } catch {
      // fall through
    }
  }
  return null;
}

const DISPLAY_RESOLVERS: Record<OAuthPlatformId, (accessToken: string | null) => Promise<string | null>> = {
  twitter: resolveTwitterDisplayName,
  twitch: resolveTwitchDisplayName,
  github: async () => resolveGithubDisplayName(),
  telegram: resolveTelegramDisplayName,
  gmail: async () => resolveGmailDisplayName(),
  linkedin: async () => resolveLinkedInDisplayName(),
};

function cacheKey(platform: OAuthPlatformId, token: string | null): string {
  return `${platform}:${token ?? 'none'}`;
}

function patchRecord<T>(prev: Partial<Record<OAuthPlatformId, T>>, id: OAuthPlatformId, value: T): Partial<Record<OAuthPlatformId, T>> {
  if (Object.is(prev[id], value)) return prev;
  return { ...prev, [id]: value };
}

export function useZkPlatformConnections() {
  const twitter = useTwitterConnection();
  const twitch = useTwitchConnection();
  const github = useGithubConnection();
  const telegram = useTelegramConnection();
  const gmail = useGmailConnection();
  const linkedin = useLinkedInConnection();

  const [displayNames, setDisplayNames] = useState<Partial<Record<OAuthPlatformId, string | null>>>({});
  const [displayNameLoading, setDisplayNameLoading] = useState<Partial<Record<OAuthPlatformId, boolean>>>({});
  const displayCacheRef = useRef<Partial<Record<OAuthPlatformId, { key: string; name: string | null }>>>({});

  const wrapConnect = useCallback(
    (connectFn: () => Promise<unknown>) => async () => {
      await connectFn();
      notifyZkOAuthIdentityUpdated();
    },
    [],
  );

  const wrapDisconnect = useCallback(
    (disconnectFn: () => void) => () => {
      disconnectFn();
      notifyZkOAuthIdentityUpdated();
    },
    [],
  );

  const connectionState = useMemo(
    () =>
      ({
        twitter: {
          isConnected: twitter.isConnected,
          connecting: twitter.connecting,
          clearing: twitter.clearing,
          accessToken: twitter.accessToken,
          connect: twitter.connect,
          disconnect: twitter.disconnect,
        },
        twitch: {
          isConnected: twitch.isConnected,
          connecting: twitch.connecting,
          clearing: twitch.clearing,
          accessToken: twitch.accessToken,
          connect: twitch.connect,
          disconnect: twitch.disconnect,
        },
        github: {
          isConnected: github.isConnected,
          connecting: github.connecting,
          clearing: github.clearing,
          accessToken: github.accessToken,
          connect: github.connect,
          disconnect: github.disconnect,
        },
        telegram: {
          isConnected: telegram.isConnected,
          connecting: telegram.connecting,
          clearing: telegram.clearing,
          accessToken: telegram.accessToken,
          connect: telegram.connect,
          disconnect: telegram.disconnect,
        },
        gmail: {
          isConnected: gmail.isConnected,
          connecting: gmail.connecting,
          clearing: gmail.clearing,
          accessToken: gmail.accessToken,
          connect: gmail.connect,
          disconnect: gmail.disconnect,
        },
        linkedin: {
          isConnected: linkedin.isConnected,
          connecting: linkedin.connecting,
          clearing: linkedin.clearing,
          accessToken: linkedin.accessToken,
          connect: linkedin.connect,
          disconnect: linkedin.disconnect,
        },
      }) as const,
    [
      twitter.isConnected,
      twitter.connecting,
      twitter.clearing,
      twitter.accessToken,
      twitter.connect,
      twitter.disconnect,
      twitch.isConnected,
      twitch.connecting,
      twitch.clearing,
      twitch.accessToken,
      twitch.connect,
      twitch.disconnect,
      github.isConnected,
      github.connecting,
      github.clearing,
      github.accessToken,
      github.connect,
      github.disconnect,
      telegram.isConnected,
      telegram.connecting,
      telegram.clearing,
      telegram.accessToken,
      telegram.connect,
      telegram.disconnect,
      gmail.isConnected,
      gmail.connecting,
      gmail.clearing,
      gmail.accessToken,
      gmail.connect,
      gmail.disconnect,
      linkedin.isConnected,
      linkedin.connecting,
      linkedin.clearing,
      linkedin.accessToken,
      linkedin.connect,
      linkedin.disconnect,
    ],
  );

  useEffect(() => {
    const oauthPlatformIds: OAuthPlatformId[] = [
      'twitter',
      'twitch',
      'github',
      'telegram',
      'gmail',
      'linkedin',
    ];

    let cancelled = false;

    for (const id of oauthPlatformIds) {
      const hook = connectionState[id];

      if (!hook.isConnected) {
        delete displayCacheRef.current[id];
        setDisplayNames((prev) => patchRecord(prev, id, null));
        setDisplayNameLoading((prev) => patchRecord(prev, id, false));
        continue;
      }

      const key = cacheKey(id, hook.accessToken);
      const cached = displayCacheRef.current[id];
      if (cached?.key === key) {
        setDisplayNames((prev) => patchRecord(prev, id, cached.name));
        setDisplayNameLoading((prev) => patchRecord(prev, id, false));
        continue;
      }

      setDisplayNameLoading((prev) => {
        if (prev[id] === true) return prev;
        return patchRecord(prev, id, true);
      });

      void DISPLAY_RESOLVERS[id](hook.accessToken).then((name) => {
        if (cancelled) return;
        displayCacheRef.current[id] = { key, name };
        setDisplayNames((prev) => patchRecord(prev, id, name));
        setDisplayNameLoading((prev) => patchRecord(prev, id, false));
      });
    }

    return () => {
      cancelled = true;
    };
  }, [connectionState]);

  useEffect(() => {
    const invalidate = () => {
      displayCacheRef.current = {};
    };
    window.addEventListener(ZK_OAUTH_IDENTITY_UPDATED_EVENT, invalidate);
    return () => window.removeEventListener(ZK_OAUTH_IDENTITY_UPDATED_EVENT, invalidate);
  }, []);

  const platforms: ZkPlatformConnectionState[] = useMemo(() => {
    const oauthPlatforms: ZkPlatformConnectionState[] = (
      ['twitter', 'twitch', 'github', 'telegram', 'gmail', 'linkedin'] as const
    ).map((id) => {
      const hook = connectionState[id];
      return {
        id,
        label: PLATFORM_LABELS[id],
        isConnected: hook.isConnected,
        connecting: hook.connecting,
        clearing: hook.clearing,
        disabled: false,
        walletSupported: WALLET_SUPPORTED[id],
        displayName: displayNames[id] ?? null,
        displayNameLoading: displayNameLoading[id] ?? false,
        connect: wrapConnect(hook.connect),
        disconnect: wrapDisconnect(hook.disconnect),
      };
    });

    return [
      ...oauthPlatforms,
      {
        id: 'instagram' as const,
        label: PLATFORM_LABELS.instagram,
        isConnected: false,
        connecting: false,
        clearing: false,
        disabled: true,
        walletSupported: false,
        displayName: null,
        displayNameLoading: false,
        connect: async () => {},
        disconnect: () => {},
      },
    ];
  }, [connectionState, displayNames, displayNameLoading, wrapConnect, wrapDisconnect]);

  const connectedCount = platforms.filter((p) => p.isConnected).length;
  const totalCount = platforms.length;

  return { platforms, connectedCount, totalCount };
}

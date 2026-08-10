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
import { resolveTwitterDisplayName } from '@/lib/zk-oauth/resolveTwitterDisplayName';
import { resolveTwitchDisplayName } from '@/lib/zk-oauth/resolveTwitchDisplayName';
import { resolveTelegramDisplayName } from '@/lib/zk-oauth/resolveTelegramDisplayName';

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

const OAUTH_PLATFORM_IDS = [
  'twitter',
  'twitch',
  'github',
  'telegram',
  'gmail',
  'linkedin',
] as const satisfies readonly OAuthPlatformId[];

const DISPLAY_RESOLVERS: Record<OAuthPlatformId, () => Promise<string | null>> = {
  twitter: resolveTwitterDisplayName,
  twitch: resolveTwitchDisplayName,
  github: resolveGithubDisplayName,
  telegram: resolveTelegramDisplayName,
  gmail: resolveGmailDisplayName,
  linkedin: resolveLinkedInDisplayName,
};

function cacheKey(platform: OAuthPlatformId, token: string | null): string {
  return `${platform}:${token ?? 'none'}`;
}

function patchRecord<T>(
  prev: Partial<Record<OAuthPlatformId, T>>,
  id: OAuthPlatformId,
  value: T,
): Partial<Record<OAuthPlatformId, T>> {
  if (Object.is(prev[id], value)) return prev;
  return { ...prev, [id]: value };
}

type PlatformHookState = {
  isConnected: boolean;
  connecting: boolean;
  clearing: boolean;
  accessToken: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
};

export function useZkPlatformConnections() {
  const twitter = useTwitterConnection();
  const twitch = useTwitchConnection();
  const github = useGithubConnection();
  const telegram = useTelegramConnection();
  const gmail = useGmailConnection();
  const linkedin = useLinkedInConnection();

  const hooksById = useMemo(
    () =>
      ({
        twitter,
        twitch,
        github,
        telegram,
        gmail,
        linkedin,
      }) satisfies Record<OAuthPlatformId, PlatformHookState>,
    [twitter, twitch, github, telegram, gmail, linkedin],
  );

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

  useEffect(() => {
    let cancelled = false;

    for (const id of OAUTH_PLATFORM_IDS) {
      const hook = hooksById[id];

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

      void DISPLAY_RESOLVERS[id]().then((name) => {
        if (cancelled) return;
        displayCacheRef.current[id] = { key, name };
        setDisplayNames((prev) => patchRecord(prev, id, name));
        setDisplayNameLoading((prev) => patchRecord(prev, id, false));
      });
    }

    return () => {
      cancelled = true;
    };
  }, [hooksById]);

  useEffect(() => {
    const invalidate = () => {
      displayCacheRef.current = {};
    };
    window.addEventListener(ZK_OAUTH_IDENTITY_UPDATED_EVENT, invalidate);
    return () => window.removeEventListener(ZK_OAUTH_IDENTITY_UPDATED_EVENT, invalidate);
  }, []);

  const platforms: ZkPlatformConnectionState[] = useMemo(() => {
    const oauthPlatforms: ZkPlatformConnectionState[] = OAUTH_PLATFORM_IDS.map((id) => {
      const hook = hooksById[id];
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
  }, [hooksById, displayNames, displayNameLoading, wrapConnect, wrapDisconnect]);

  const connectedCount = platforms.filter((p) => p.isConnected).length;
  const totalCount = platforms.length;

  return { platforms, connectedCount, totalCount };
}

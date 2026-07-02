import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ChevronLeft,
  Github,
  Instagram,
  Linkedin,
  Loader2,
  Mail,
  MessageCircle,
  Twitch,
  Twitter,
  Wallet,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useCircleWallet } from '@/hooks/useCircleWallet';
import {
  readZkAccountsPanelExpanded,
  writeZkAccountsPanelExpanded,
} from '@/hooks/useZkAccountsPanelLayout';
import {
  useZkPlatformConnections,
  type ZkPanelPlatformId,
  type ZkPlatformConnectionState,
} from '@/hooks/useZkPlatformConnections';
import { useMotionSafe } from '@/hooks/useMotionSafe';
import { notifyZkOAuthIdentityUpdated } from '@/lib/zk-oauth/notifyIdentityUpdated';
import { PRIMARY_IDENTITY_KEY } from '@/lib/zk-oauth/primaryIdentity';
import { cn } from '@/components/ui/utils';

const PLATFORM_ICONS: Record<ZkPanelPlatformId, LucideIcon> = {
  twitter: Twitter,
  twitch: Twitch,
  github: Github,
  telegram: MessageCircle,
  gmail: Mail,
  linkedin: Linkedin,
  instagram: Instagram,
};

const PLATFORM_HINTS: Record<ZkPanelPlatformId, string> = {
  twitter: 'Receive by @handle',
  twitch: 'Receive by username',
  github: 'Receive by username',
  telegram: 'Receive by username',
  gmail: 'Receive by email',
  linkedin: 'Professional identity',
  instagram: 'Coming soon',
};

const MOTION_CLASS =
  'transition-[transform,opacity,width] duration-[180ms] ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none';

export const NAV_PILL_BASE =
  'rounded-2xl transition-[background-color,color,box-shadow] duration-200 ease-[var(--ease-out)] active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100';

export const NAV_PILL_ACTIVE = 'bg-white text-blue-600 shadow-circle-card';
export const NAV_PILL_INACTIVE = 'bg-white/70 text-gray-700 hover:bg-white/90 backdrop-blur-sm';

const CONNECT_BUTTON_CLASS =
  'h-8 min-w-[4.5rem] rounded-full border border-gray-200/80 bg-white/75 px-3 text-xs font-medium text-gray-700 shadow-none hover:bg-white active:scale-[0.97] motion-reduce:active:scale-100';

function isZkPanelPlatformId(value: string): value is ZkPanelPlatformId {
  return value in PLATFORM_ICONS;
}

function readPrimaryIdentity(): ZkPanelPlatformId | null {
  try {
    const stored = localStorage.getItem(PRIMARY_IDENTITY_KEY);
    if (stored && isZkPanelPlatformId(stored)) return stored;
  } catch {
    // ignore
  }
  return null;
}

function writePrimaryIdentity(id: ZkPanelPlatformId) {
  try {
    localStorage.setItem(PRIMARY_IDENTITY_KEY, id);
  } catch {
    // ignore
  }
}

function clearPrimaryIdentity() {
  try {
    localStorage.removeItem(PRIMARY_IDENTITY_KEY);
  } catch {
    // ignore
  }
}

function usePrimaryIdentity(connectedPlatforms: ZkPlatformConnectionState[]) {
  const [primaryId, setPrimaryId] = useState<ZkPanelPlatformId | null>(readPrimaryIdentity);

  const connectedIds = useMemo(
    () => connectedPlatforms.map((platform) => platform.id),
    [connectedPlatforms],
  );

  const effectivePrimaryId = useMemo(() => {
    if (primaryId && connectedIds.includes(primaryId)) return primaryId;
    return connectedIds[0] ?? null;
  }, [primaryId, connectedIds]);

  useEffect(() => {
    if (connectedIds.length === 0) {
      if (primaryId !== null) setPrimaryId(null);
      clearPrimaryIdentity();
      return;
    }

    if (primaryId && connectedIds.includes(primaryId)) return;

    const fallback = connectedIds[0];
    setPrimaryId(fallback);
    writePrimaryIdentity(fallback);
  }, [connectedIds, primaryId]);

  const setPrimary = (id: ZkPanelPlatformId) => {
    setPrimaryId(id);
    writePrimaryIdentity(id);
    notifyZkOAuthIdentityUpdated();
  };

  return { primaryId: effectivePrimaryId, setPrimary };
}

export function useZkSocialPanelState() {
  const [expanded, setExpandedInternal] = useState(readZkAccountsPanelExpanded);

  const setExpanded = (value: boolean) => {
    setExpandedInternal(value);
    writeZkAccountsPanelExpanded(value);
  };

  return {
    expanded,
    setExpanded,
    toggleExpanded: () => setExpanded(!expanded),
  };
}

type ZkSocialConnectionsPanelProps = {
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  className?: string;
  /** Sheet / embedded mode: always expanded rows, no collapse chrome */
  embedded?: boolean;
};

function truncateWalletAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function buildConnectedStatus(_platform: ZkPlatformConnectionState, isPrimary: boolean): string {
  const parts: string[] = [];
  if (isPrimary) parts.push('Primary');
  parts.push('Connected');
  return parts.join(' · ');
}

function PlatformIcon({
  platform,
  connected,
}: {
  platform: ZkPlatformConnectionState;
  connected: boolean;
}) {
  const Icon = PLATFORM_ICONS[platform.id];

  return (
    <div
      className={cn(
        'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
        connected ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-500',
        platform.disabled && 'opacity-40',
      )}
    >
      <Icon className="h-[1.125rem] w-[1.125rem]" aria-hidden />
    </div>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="px-1 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500 first:pt-1">
      {children}
    </p>
  );
}

function ConnectedPlatformRow({
  platform,
  isPrimary,
  onSetPrimary,
}: {
  platform: ZkPlatformConnectionState;
  isPrimary: boolean;
  onSetPrimary: (id: ZkPanelPlatformId) => void;
}) {
  const busy = platform.connecting || platform.clearing;
  const identityLine = platform.displayNameLoading
    ? 'Loading identity…'
    : platform.displayName ?? platform.label;

  return (
    <div
      className={cn(
        'flex min-h-[4.25rem] items-center gap-3 rounded-xl border px-3 py-2.5',
        'bg-white/65 hover:bg-white/80',
        isPrimary ? 'border-blue-200/90 bg-white/85' : 'border-gray-200/70',
        'hover:bg-white/80 motion-reduce:transition-none',
      )}
    >
      <PlatformIcon platform={platform} connected />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-gray-900">{platform.label}</div>
        <div className="truncate text-sm text-gray-700">{identityLine}</div>
        <div className="truncate text-xs text-emerald-700">
          {buildConnectedStatus(platform, isPrimary)}
        </div>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 shrink-0 px-2.5 text-xs text-gray-600 active:scale-[0.97] motion-reduce:active:scale-100"
            disabled={busy}
            aria-label={`Manage ${platform.label}`}
          >
            {platform.clearing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              'Manage'
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[10rem]">
          {!isPrimary ? (
            <DropdownMenuItem onClick={() => onSetPrimary(platform.id)}>
              Set as primary
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem
            variant="destructive"
            onClick={platform.disconnect}
            disabled={busy}
          >
            Disconnect
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function AvailablePlatformRow({ platform }: { platform: ZkPlatformConnectionState }) {
  const busy = platform.connecting || platform.clearing;

  return (
    <div className="flex min-h-[4rem] items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-white/45">
      <PlatformIcon platform={platform} connected={false} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-gray-900">{platform.label}</div>
        <div className="truncate text-xs text-gray-500">{PLATFORM_HINTS[platform.id]}</div>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={CONNECT_BUTTON_CLASS}
        onClick={() => void platform.connect()}
        disabled={busy}
      >
        {platform.connecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Connect'}
      </Button>
    </div>
  );
}

// function ComingSoonPlatformRow({ platform }: { platform: ZkPlatformConnectionState }) {
//   const row = (
//     <div className="flex min-h-[3.75rem] items-center gap-3 rounded-xl px-3 py-2 opacity-60">
//       <PlatformIcon platform={platform} connected={false} />
//       <div className="min-w-0 flex-1">
//         <div className="truncate text-sm font-medium text-gray-900">{platform.label}</div>
//         <div className="truncate text-xs text-gray-500">Coming soon</div>
//       </div>
//     </div>
//   );
//
//   return (
//     <Tooltip>
//       <TooltipTrigger asChild>
//         <div>{row}</div>
//       </TooltipTrigger>
//       <TooltipContent>Instagram connect is coming soon</TooltipContent>
//     </Tooltip>
//   );
// }

function PlatformRow({
  platform,
  compact,
}: {
  platform: ZkPlatformConnectionState;
  compact: boolean;
}) {
  const Icon = PLATFORM_ICONS[platform.id];
  const busy = platform.connecting || platform.clearing;
  const subtitle = platform.disabled
    ? 'Coming soon'
    : platform.isConnected
      ? platform.displayNameLoading
        ? 'Connected'
        : platform.displayName ?? 'Connected'
      : 'Not linked';

  if (compact) {
    const row = (
      <button
        type="button"
        className={cn(
          'relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white shadow-circle-card',
          platform.isConnected ? 'text-blue-600' : 'text-gray-500',
          'hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
          'active:scale-[0.97] motion-reduce:active:scale-100',
          platform.disabled && 'cursor-not-allowed opacity-50',
        )}
        disabled={platform.disabled || busy}
        onClick={() => {
          if (platform.disabled || platform.isConnected) return;
          void platform.connect();
        }}
        aria-label={`${platform.label}: ${subtitle}`}
        title={platform.disabled ? 'Coming soon' : subtitle}
      >
        <Icon className="h-4 w-4" />
        <span
          className={cn(
            'absolute bottom-0.5 right-0.5 h-2 w-2 rounded-full border border-white',
            platform.isConnected ? 'bg-emerald-500' : 'bg-gray-300',
          )}
          aria-hidden
        />
      </button>
    );

    if (platform.disabled) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>{row}</TooltipTrigger>
          <TooltipContent side="right">Coming soon</TooltipContent>
        </Tooltip>
      );
    }

    return row;
  }

  return null;
}

// Temporarily hidden — uncomment render in ZkSocialConnectionsPanel to restore
export function InternalWalletRow({ compact }: { compact: boolean }) {
  const { developerWallet, hasDeveloperWallet, checkingWallet } = useCircleWallet();

  if (compact) {
    return (
      <Link
        to="/dashboard"
        className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-gray-500 shadow-circle-card hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        aria-label={
          hasDeveloperWallet
            ? `Internal Wallet: ${developerWallet?.wallet_address ? truncateWalletAddress(developerWallet.wallet_address) : 'Active'}`
            : 'Internal Wallet: not created'
        }
        title={hasDeveloperWallet ? 'Internal Wallet active' : 'Create on Dashboard'}
      >
        <Wallet className="h-4 w-4" />
        <span
          className={cn(
            'absolute bottom-0.5 right-0.5 h-2 w-2 rounded-full border border-white',
            hasDeveloperWallet ? 'bg-emerald-500' : 'bg-gray-300',
          )}
          aria-hidden
        />
      </Link>
    );
  }

  return (
    <div className="border-t border-gray-200/80 px-2 py-3">
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
        <Wallet className="h-3.5 w-3.5" />
        Internal Wallet
      </div>
      {checkingWallet ? (
        <div className="flex items-center gap-2 px-2 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Checking…
        </div>
      ) : hasDeveloperWallet && developerWallet?.wallet_address ? (
        <div className="px-2 text-sm text-gray-700">
          <span className="font-medium text-emerald-600">Active</span>
          <span className="text-gray-500"> · {truncateWalletAddress(developerWallet.wallet_address)}</span>
        </div>
      ) : (
        <Button asChild variant="link" className="h-auto p-0 px-2 text-sm">
          <Link to="/dashboard">Create on Dashboard →</Link>
        </Button>
      )}
    </div>
  );
}

type ZkSocialNavToggleProps = {
  expanded: boolean;
  onClick: () => void;
  className?: string;
};

export function ZkSocialNavToggle({
  expanded,
  onClick,
  className,
}: ZkSocialNavToggleProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'px-3 py-2 rounded-2xl text-center text-sm font-medium',
        NAV_PILL_BASE,
        expanded ? NAV_PILL_ACTIVE : NAV_PILL_INACTIVE,
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
        className,
      )}
      aria-expanded={expanded}
      aria-label={`${expanded ? 'Collapse' : 'Expand'} linked identities panel`}
    >
      Accounts
    </button>
  );
}

export function ZkSocialIconRail({ className }: { className?: string }) {
  const { platforms } = useZkPlatformConnections();

  return (
    <TooltipProvider delayDuration={300}>
      <div className={cn('flex flex-col items-center gap-2', className)} aria-label="Linked identities">
        {platforms.map((platform) => (
          <PlatformRow key={platform.id} platform={platform} compact />
        ))}
      </div>
    </TooltipProvider>
  );
}

export function ZkSocialConnectionsPanel({
  expanded: expandedProp,
  onExpandedChange,
  className,
  embedded = false,
}: ZkSocialConnectionsPanelProps) {
  const motionSafe = useMotionSafe();
  const { platforms } = useZkPlatformConnections();
  const [expandedInternal, setExpandedInternal] = useState(readZkAccountsPanelExpanded);
  const expanded = embedded ? true : (expandedProp ?? expandedInternal);

  const linkedPlatforms = useMemo(
    () => platforms.filter((platform) => platform.isConnected && !platform.disabled),
    [platforms],
  );
  const availablePlatforms = useMemo(
    () => platforms.filter((platform) => !platform.isConnected && !platform.disabled),
    [platforms],
  );
  // const comingSoonPlatforms = useMemo(
  //   () => platforms.filter((platform) => platform.disabled),
  //   [platforms],
  // );

  const { primaryId, setPrimary } = usePrimaryIdentity(linkedPlatforms);

  const sortedLinkedPlatforms = useMemo(() => {
    if (!primaryId) return linkedPlatforms;
    return [...linkedPlatforms].sort((a, b) => {
      if (a.id === primaryId) return -1;
      if (b.id === primaryId) return 1;
      return 0;
    });
  }, [linkedPlatforms, primaryId]);

  const setExpanded = (value: boolean) => {
    if (onExpandedChange) onExpandedChange(value);
    else setExpandedInternal(value);
    writeZkAccountsPanelExpanded(value);
  };

  const toggleExpanded = () => setExpanded(!expanded);

  return (
    <TooltipProvider delayDuration={300}>
      <aside
        className={cn(
          MOTION_CLASS,
          'origin-right',
          !embedded &&
            'w-[20rem] rounded-2xl border border-gray-200/80 bg-white/90 shadow-circle-card backdrop-blur-sm',
          embedded && 'w-full',
          className,
        )}
        aria-label="Linked identities"
      >
        {!embedded ? (
          <div className="flex items-start justify-between gap-2 border-b border-gray-200/60 p-3">
            <div className="min-w-0 space-y-1">
              <h2 className="text-sm font-semibold text-gray-900">Linked identities</h2>
              <p className="text-xs leading-relaxed text-gray-600">
                Create Wallet and Receive payments to your social usernames.
              </p>
            </div>
            <button
              type="button"
              onClick={toggleExpanded}
              className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
                'active:scale-[0.97] motion-reduce:active:scale-100',
              )}
              aria-expanded={expanded}
              aria-label="Collapse linked identities panel"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="space-y-1 border-b border-gray-200/60 px-4 py-3">
            <h2 className="text-sm font-semibold text-gray-900">Linked identities</h2>
            <p className="text-xs leading-relaxed text-gray-600">
              Receive payments to your social usernames.
            </p>
          </div>
        )}

        <div
          className={cn(
            MOTION_CLASS,
            'space-y-1 p-2',
            expanded && motionSafe && 'translate-x-0 opacity-100',
            expanded && !motionSafe && 'opacity-100',
          )}
        >
          {sortedLinkedPlatforms.length > 0 ? (
            <>
              <SectionLabel>{primaryId ? 'Primary identity' : 'Connected'}</SectionLabel>
              <div className="space-y-1.5">
                {sortedLinkedPlatforms.map((platform) => (
                  <ConnectedPlatformRow
                    key={platform.id}
                    platform={platform}
                    isPrimary={platform.id === primaryId}
                    onSetPrimary={setPrimary}
                  />
                ))}
              </div>
            </>
          ) : null}

          {availablePlatforms.length > 0 ? (
            <>
              <SectionLabel>Available to link</SectionLabel>
              <div className="space-y-0.5">
                {availablePlatforms.map((platform) => (
                  <AvailablePlatformRow key={platform.id} platform={platform} />
                ))}
              </div>
            </>
          ) : null}

          {/* {comingSoonPlatforms.length > 0 ? (
            <>
              <SectionLabel>More soon</SectionLabel>
              <div className="space-y-0.5">
                {comingSoonPlatforms.map((platform) => (
                  <ComingSoonPlatformRow key={platform.id} platform={platform} />
                ))}
              </div>
            </>
          ) : null} */}
        </div>

        {/* {expanded ? <InternalWalletRow compact={false} /> : null} */}
      </aside>
    </TooltipProvider>
  );
}

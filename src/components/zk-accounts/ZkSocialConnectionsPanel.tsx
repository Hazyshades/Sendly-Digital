import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Check,
  Github,
  Instagram,
  Linkedin,
  Loader2,
  Mail,
  MessageCircle,
  MoreHorizontal,
  Twitch,
  Twitter,
  Wallet,
} from 'lucide-react';
import { AnimatePresence, LayoutGroup, motion } from 'motion/react';
import { Link } from 'react-router-dom';
import type { ComponentType } from 'react';

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
import { cn } from '@/components/ui/utils';
import BrandTelegramIcon from '@/components/itshover-icons/brand-telegram-icon';
import BrandTwitchIcon from '@/components/itshover-icons/brand-twitch-icon';
import GithubIcon from '@/components/itshover-icons/github-icon';
import GmailIcon from '@/components/itshover-icons/gmail-icon';
import InstagramIcon from '@/components/itshover-icons/instagram-icon';
import LinkedinIcon from '@/components/itshover-icons/linkedin-icon';
import TwitterXIcon from '@/components/itshover-icons/twitter-x-icon';

import './zk-payment-identities-transitions.css';

type PlatformIconComponent = ComponentType<{ className?: string; active?: boolean }>;

const PLATFORM_STATIC_ICONS: Record<ZkPanelPlatformId, ComponentType<{ className?: string }>> = {
  twitter: Twitter,
  twitch: Twitch,
  github: Github,
  telegram: MessageCircle,
  gmail: Mail,
  linkedin: Linkedin,
  instagram: Instagram,
};

const PLATFORM_HOVER_ICONS: Partial<Record<ZkPanelPlatformId, PlatformIconComponent>> = {
  twitter: TwitterXIcon,
  twitch: BrandTwitchIcon,
  github: GithubIcon,
  telegram: BrandTelegramIcon,
  gmail: GmailIcon,
  linkedin: LinkedinIcon,
  instagram: InstagramIcon,
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

const PRIMARY_IDENTITY_KEY = 'sendly-primary-identity';

const PANEL_COPY = {
  title: 'Payment identities',
  description: 'Link accounts to receive USDC by username or email.',
} as const;

const LAYOUT_EASE = [0.23, 1, 0.32, 1] as const;
const LAYOUT_DURATION = 0.24;

const CONNECT_BUTTON_CLASS =
  'relative h-8 min-w-[7.25rem] overflow-hidden rounded-full border border-gray-200/80 bg-white/75 px-3 text-xs font-medium text-gray-700 shadow-none hover:bg-white active:scale-[0.97] motion-reduce:active:scale-100';

export const NAV_PILL_BASE =
  'rounded-2xl transition-[background-color,color,box-shadow] duration-200 ease-[var(--ease-out)] active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100';

export const NAV_PILL_ACTIVE = 'bg-white text-blue-600 shadow-circle-card';
export const NAV_PILL_INACTIVE = 'bg-white/70 text-gray-700 hover:bg-white/90 backdrop-blur-sm';

function isZkPanelPlatformId(value: string): value is ZkPanelPlatformId {
  return value in PLATFORM_STATIC_ICONS;
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

function platformLayoutId(id: ZkPanelPlatformId) {
  return `zk-platform-${id}`;
}

function PlatformIcon({
  platform,
  connected,
  active,
}: {
  platform: ZkPlatformConnectionState;
  connected: boolean;
  active?: boolean;
}) {
  const HoverIcon = !platform.disabled ? PLATFORM_HOVER_ICONS[platform.id] : undefined;
  const Icon = HoverIcon ?? PLATFORM_STATIC_ICONS[platform.id];
  const iconProps = HoverIcon ? { active } : {};

  return (
    <div
      className={cn(
        'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
        connected ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-500',
        platform.disabled && 'opacity-40',
      )}
      aria-hidden
    >
      <Icon className="h-[1.125rem] w-[1.125rem] pointer-events-none" {...iconProps} />
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

function SuccessCheckIcon({ play }: { play: boolean }) {
  return (
    <span
      className="zk-identities-success-check text-emerald-600"
      data-state={play ? 'in' : 'out'}
      aria-hidden
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path
          d="M3 7.2L5.8 10L11 3.5"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

function ConnectedStatus({
  showSuccessCheck,
}: {
  showSuccessCheck: boolean;
}) {
  if (showSuccessCheck) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700">
        <SuccessCheckIcon play />
        <span>Connected</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700">
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" aria-hidden />
      Connected
    </span>
  );
}

function useConnectSuccessPulse(isConnected: boolean) {
  const wasConnectedRef = useRef(isConnected);
  const [showSuccessCheck, setShowSuccessCheck] = useState(false);
  const [iconPulse, setIconPulse] = useState(false);

  useEffect(() => {
    const wasConnected = wasConnectedRef.current;

    if (!wasConnected && isConnected) {
      setShowSuccessCheck(true);
      setIconPulse(true);
      const successTimer = window.setTimeout(() => setShowSuccessCheck(false), 700);
      const iconTimer = window.setTimeout(() => setIconPulse(false), 550);
      wasConnectedRef.current = true;
      return () => {
        window.clearTimeout(successTimer);
        window.clearTimeout(iconTimer);
      };
    }

    wasConnectedRef.current = isConnected;
    if (!isConnected) {
      setShowSuccessCheck(false);
      setIconPulse(false);
    }
  }, [isConnected]);

  return { showSuccessCheck, iconPulse };
}

function ConnectButtonContent({
  connecting,
  isConnected,
  motionSafe,
}: {
  connecting: boolean;
  isConnected: boolean;
  motionSafe: boolean;
}) {
  const stateKey = connecting ? 'connecting' : isConnected ? 'connected' : 'idle';

  return (
    <span className="relative flex h-full w-full items-center justify-center">
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={stateKey}
          className="inline-flex items-center justify-center gap-1.5"
          initial={
            motionSafe
              ? { opacity: 0, y: 6, filter: 'blur(2px)' }
              : false
          }
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          exit={
            motionSafe
              ? { opacity: 0, y: -6, filter: 'blur(2px)' }
              : undefined
          }
          transition={{ duration: motionSafe ? 0.18 : 0, ease: 'easeOut' }}
        >
          {connecting ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              Connecting…
            </>
          ) : isConnected ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
              Connected
            </>
          ) : (
            'Connect'
          )}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

function ConnectedPlatformRow({
  platform,
  isPrimary,
  onSetPrimary,
  motionSafe,
}: {
  platform: ZkPlatformConnectionState;
  isPrimary: boolean;
  onSetPrimary: (id: ZkPanelPlatformId) => void;
  motionSafe: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const busy = platform.connecting || platform.clearing;
  const { showSuccessCheck, iconPulse } = useConnectSuccessPulse(platform.isConnected);
  const identityLine = platform.displayNameLoading
    ? 'Loading identity…'
    : platform.displayName ?? platform.label;

  return (
    <motion.li
      layout={motionSafe}
      layoutId={motionSafe ? platformLayoutId(platform.id) : undefined}
      transition={{ type: 'tween', duration: LAYOUT_DURATION, ease: LAYOUT_EASE }}
      className={cn(
        'flex min-h-[4.25rem] list-none items-center gap-3 rounded-xl border px-3 py-2.5',
        'bg-white/65 transition-[background-color,box-shadow,border-color] duration-200',
        'hover:bg-white/90 hover:shadow-sm',
        isPrimary ? 'border-blue-200/90 bg-white/85' : 'border-gray-200/70',
        'motion-reduce:transition-none motion-reduce:hover:shadow-none',
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={() => setFocused(false)}
    >
      <PlatformIcon
        platform={platform}
        connected
        active={hovered || focused || iconPulse}
      />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-gray-900">{platform.label}</div>
        <div className="truncate text-sm text-gray-700">{identityLine}</div>
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
          {isPrimary ? (
            <span className="inline-flex items-center rounded-md bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-600">
              Primary
            </span>
          ) : null}
          <ConnectedStatus showSuccessCheck={showSuccessCheck} />
        </div>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 shrink-0 px-0 text-gray-500 hover:bg-white/80 hover:text-gray-700 active:scale-[0.97] motion-reduce:active:scale-100"
            disabled={busy}
            aria-label={`Manage ${platform.label}`}
          >
            {platform.clearing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <MoreHorizontal className="h-4 w-4" aria-hidden />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className={cn(
            'zk-identities-menu min-w-[10rem]',
            'data-[state=open]:animate-none data-[state=closed]:animate-none',
            'data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0',
            'data-[state=open]:zoom-in-100 data-[state=closed]:zoom-out-100',
            'data-[side=bottom]:slide-in-from-top-0 data-[side=top]:slide-in-from-bottom-0',
            'data-[side=left]:slide-in-from-right-0 data-[side=right]:slide-in-from-left-0',
          )}
        >
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
    </motion.li>
  );
}

function AvailablePlatformRow({
  platform,
  motionSafe,
}: {
  platform: ZkPlatformConnectionState;
  motionSafe: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const busy = platform.connecting || platform.clearing;
  const interactive = !platform.disabled && !busy;

  const runConnect = () => {
    if (!interactive) return;
    void platform.connect();
  };

  return (
    <motion.li
      layout={motionSafe}
      layoutId={motionSafe ? platformLayoutId(platform.id) : undefined}
      transition={{ type: 'tween', duration: LAYOUT_DURATION, ease: LAYOUT_EASE }}
      className="list-none"
    >
      <div
        className={cn(
          'relative flex min-h-[4rem] items-center gap-3 rounded-xl px-3 py-2.5',
          'transition-[background-color,box-shadow] duration-200',
          !platform.disabled && 'hover:bg-white/45',
          platform.disabled && 'cursor-not-allowed opacity-60',
        )}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {!platform.disabled ? (
          <button
            type="button"
            className="absolute inset-0 z-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
            aria-label={`Connect ${platform.label}`}
            disabled={!interactive}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onClick={runConnect}
          />
        ) : null}
        <div className="relative z-10 flex min-w-0 flex-1 items-center gap-3 pointer-events-none">
          <PlatformIcon
            platform={platform}
            connected={false}
            active={!platform.disabled && (hovered || focused)}
          />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-gray-900">{platform.label}</div>
            <div className="truncate text-xs text-gray-500">{PLATFORM_HINTS[platform.id]}</div>
          </div>
        </div>
        {!platform.disabled ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn(CONNECT_BUTTON_CLASS, 'relative z-10')}
            onClick={(event) => {
              event.stopPropagation();
              runConnect();
            }}
            disabled={busy}
            aria-busy={platform.connecting || undefined}
          >
            <ConnectButtonContent
              connecting={platform.connecting}
              isConnected={platform.isConnected}
              motionSafe={motionSafe}
            />
          </Button>
        ) : null}
      </div>
    </motion.li>
  );
}

function PlatformRow({
  platform,
  compact,
}: {
  platform: ZkPlatformConnectionState;
  compact: boolean;
}) {
  const [hovered, setHovered] = useState(false);
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
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={() => {
          if (platform.disabled || platform.isConnected) return;
          void platform.connect();
        }}
        aria-label={`${platform.label}: ${subtitle}`}
        title={platform.disabled ? 'Coming soon' : subtitle}
      >
        <PlatformIcon platform={platform} connected={platform.isConnected} active={hovered} />
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
      aria-label={`${expanded ? 'Collapse' : 'Expand'} payment identities panel`}
    >
      Identities
    </button>
  );
}

export function ZkSocialIconRail({ className }: { className?: string }) {
  const { platforms } = useZkPlatformConnections();

  return (
    <TooltipProvider delayDuration={300}>
      <div className={cn('flex flex-col items-center gap-2', className)} aria-label="Payment identities">
        {platforms.map((platform) => (
          <PlatformRow key={platform.id} platform={platform} compact />
        ))}
      </div>
    </TooltipProvider>
  );
}

export function ZkSocialConnectionsPanel({
  expanded: expandedProp,
  onExpandedChange: _onExpandedChange,
  className,
  embedded = false,
}: ZkSocialConnectionsPanelProps) {
  const motionSafe = useMotionSafe();
  const { platforms } = useZkPlatformConnections();
  const [expandedInternal] = useState(readZkAccountsPanelExpanded);
  const expanded = embedded ? true : (expandedProp ?? expandedInternal);

  const linkedPlatforms = useMemo(
    () => platforms.filter((platform) => platform.isConnected && !platform.disabled),
    [platforms],
  );
  const availablePlatforms = useMemo(
    () => platforms.filter((platform) => !platform.isConnected && !platform.disabled),
    [platforms],
  );

  const { primaryId, setPrimary } = usePrimaryIdentity(linkedPlatforms);

  const sortedLinkedPlatforms = useMemo(() => {
    if (!primaryId) return linkedPlatforms;
    return [...linkedPlatforms].sort((a, b) => {
      if (a.id === primaryId) return -1;
      if (b.id === primaryId) return 1;
      return 0;
    });
  }, [linkedPlatforms, primaryId]);

  return (
    <TooltipProvider delayDuration={300}>
      <aside
        className={cn(
          'origin-right',
          !embedded &&
            'w-[20rem] rounded-2xl border border-gray-200/80 bg-white/90 shadow-circle-card backdrop-blur-sm',
          embedded && 'w-full',
          className,
        )}
        aria-label="Payment identities"
        data-expanded={expanded ? 'true' : 'false'}
      >
        {!embedded ? (
          <div className="border-b border-gray-200/60 p-3">
            <div className="min-w-0 space-y-1">
              <h2 className="text-sm font-semibold text-gray-900">{PANEL_COPY.title}</h2>
              <p className="text-xs leading-relaxed text-gray-600">{PANEL_COPY.description}</p>
            </div>
          </div>
        ) : (
          <div className="space-y-1 border-b border-gray-200/60 px-4 py-3">
            <h2 className="text-sm font-semibold text-gray-900">{PANEL_COPY.title}</h2>
            <p className="text-xs leading-relaxed text-gray-600">{PANEL_COPY.description}</p>
          </div>
        )}

        <div className="space-y-1 p-2">
          <LayoutGroup id="zk-payment-identities">
            {sortedLinkedPlatforms.length > 0 ? (
              <>
                <SectionLabel>Connected identities</SectionLabel>
                <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
                  {sortedLinkedPlatforms.map((platform) => (
                    <ConnectedPlatformRow
                      key={platform.id}
                      platform={platform}
                      isPrimary={platform.id === primaryId}
                      onSetPrimary={setPrimary}
                      motionSafe={motionSafe}
                    />
                  ))}
                </ul>
              </>
            ) : null}

            {availablePlatforms.length > 0 ? (
              <>
                <SectionLabel>Available to connect</SectionLabel>
                <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
                  {availablePlatforms.map((platform) => (
                    <AvailablePlatformRow
                      key={platform.id}
                      platform={platform}
                      motionSafe={motionSafe}
                    />
                  ))}
                </ul>
              </>
            ) : null}
          </LayoutGroup>
        </div>
      </aside>
    </TooltipProvider>
  );
}

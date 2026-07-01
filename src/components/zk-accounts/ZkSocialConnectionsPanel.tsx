import { useState } from 'react';

import {

  ChevronLeft,

  Github,

  Instagram,

  Linkedin,

  Loader2,

  LogOut,

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



const PLATFORM_ICONS: Record<ZkPanelPlatformId, LucideIcon> = {

  twitter: Twitter,

  twitch: Twitch,

  github: Github,

  telegram: MessageCircle,

  gmail: Mail,

  linkedin: Linkedin,

  instagram: Instagram,

};



const MOTION_CLASS =

  'transition-[transform,opacity,width] duration-[180ms] ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none';



export const NAV_PILL_BASE =

  'rounded-2xl transition-[background-color,color,box-shadow] duration-200 ease-[var(--ease-out)] active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100';



export const NAV_PILL_ACTIVE = 'bg-white text-blue-600 shadow-circle-card';

export const NAV_PILL_INACTIVE = 'bg-white/70 text-gray-700 hover:bg-white/90 backdrop-blur-sm';



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

        ? platform.walletSupported

          ? 'Connected'

          : 'Connected'

        : platform.displayName

          ? platform.walletSupported

            ? `${platform.displayName} · Wallet`

            : platform.displayName

          : platform.walletSupported

            ? 'Connected'

            : 'Connected'

      : platform.walletSupported

        ? 'Not connected'

        : 'Not connected';



  const action = platform.disabled ? null : platform.isConnected ? (

    <Button

      type="button"

      variant="ghost"

      size="sm"

      className="h-7 px-2 text-xs shrink-0 active:scale-[0.97] motion-reduce:active:scale-100"

      onClick={platform.disconnect}

      disabled={busy}

      aria-label={`Disconnect ${platform.label}`}

    >

      {platform.clearing ? (

        <Loader2 className="h-3.5 w-3.5 animate-spin" />

      ) : (

        <LogOut className="h-3.5 w-3.5" />

      )}

    </Button>

  ) : (

    <Button

      type="button"

      variant="outline"

      size="sm"

      className="h-7 px-2.5 text-xs shrink-0 active:scale-[0.97] motion-reduce:active:scale-100"

      onClick={() => void platform.connect()}

      disabled={busy}

    >

      {platform.connecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Connect'}

    </Button>

  );



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



  const rowBody = (

    <div

      className={cn(

        'flex items-center gap-2.5 rounded-xl px-2 py-2',

        'hover:bg-gray-50/80 active:scale-[0.97] motion-reduce:active:scale-100',

        platform.disabled && 'opacity-60',

      )}

    >

      <div className="relative shrink-0">

        <Icon className="h-4 w-4 text-gray-700" />

        <span

          className={cn(

            'absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-white',

            platform.isConnected ? 'bg-emerald-500' : 'bg-gray-300',

          )}

          aria-hidden

        />

      </div>

      <div className="min-w-0 flex-1">

        <div className="text-sm font-medium text-gray-900 truncate">{platform.label}</div>

        <div className="text-xs text-gray-500 truncate">{subtitle}</div>

      </div>

      {action}

    </div>

  );



  if (platform.disabled) {

    return (

      <Tooltip>

        <TooltipTrigger asChild>

          <div>{rowBody}</div>

        </TooltipTrigger>

        <TooltipContent>Instagram connect is coming soon</TooltipContent>

      </Tooltip>

    );

  }



  return rowBody;

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

        <div className="flex items-center gap-2 text-sm text-gray-500 px-2">

          <Loader2 className="h-4 w-4 animate-spin" />

          Checking…

        </div>

      ) : hasDeveloperWallet && developerWallet?.wallet_address ? (

        <div className="px-2 text-sm text-gray-700">

          <span className="text-emerald-600 font-medium">Active</span>

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

  connectedCount: number;

  totalCount: number;

  className?: string;

};



export function ZkSocialNavToggle({

  expanded,

  onClick,

  connectedCount,

  totalCount,

  className,

}: ZkSocialNavToggleProps) {

  return (

    <button

      type="button"

      onClick={onClick}

      className={cn(

        'w-full px-3 py-2 text-center text-sm font-medium',

        NAV_PILL_BASE,

        expanded ? NAV_PILL_ACTIVE : NAV_PILL_INACTIVE,

        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',

        className,

      )}

      aria-expanded={expanded}

      aria-label={`${expanded ? 'Collapse' : 'Expand'} social accounts panel, ${connectedCount} of ${totalCount} connected`}

    >

      Social

    </button>

  );

}



export function ZkSocialIconRail({ className }: { className?: string }) {

  const { platforms } = useZkPlatformConnections();



  return (

    <TooltipProvider delayDuration={300}>

      <div className={cn('flex flex-col items-center gap-2', className)} aria-label="Connected accounts">

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

          !embedded && 'bg-white/90 backdrop-blur-sm rounded-2xl shadow-circle-card border border-gray-200/80 w-[17rem]',

          embedded && 'w-full',

          className,

        )}

        aria-label="Connected accounts"

      >

        {!embedded ? (

          <div className="flex items-center justify-between gap-2 border-b border-gray-200/60 p-2">

            <h2 className="px-1 text-sm font-semibold text-gray-900">Social</h2>

            <button

              type="button"

              onClick={toggleExpanded}

              className={cn(

                'flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100',

                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',

                'active:scale-[0.97] motion-reduce:active:scale-100',

              )}

              aria-expanded={expanded}

              aria-label="Collapse social accounts panel"

            >

              <ChevronLeft className="h-4 w-4" />

            </button>

          </div>

        ) : null}



        <div

          className={cn(

            MOTION_CLASS,

            'space-y-0.5 p-2',

            expanded && motionSafe && 'opacity-100 translate-x-0',

            expanded && !motionSafe && 'opacity-100',

          )}

        >

          {platforms.map((platform) => (

            <PlatformRow key={platform.id} platform={platform} compact={false} />

          ))}

        </div>



        {/* {expanded ? <InternalWalletRow compact={false} /> : null} */}

      </aside>

    </TooltipProvider>

  );

}



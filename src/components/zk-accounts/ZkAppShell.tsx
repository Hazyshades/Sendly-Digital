import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { Card } from '@/components/ui/card';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  NAV_PILL_ACTIVE,
  NAV_PILL_BASE,
  NAV_PILL_INACTIVE,
  ZkSocialConnectionsPanel,
  ZkSocialNavToggle,
  useZkSocialPanelState,
} from '@/components/zk-accounts/ZkSocialConnectionsPanel';
import { useZkAccountsPanelLayout } from '@/hooks/useZkAccountsPanelLayout';
import { cn } from '@/components/ui/utils';

/** Half of Tailwind `max-w-2xl` (42rem) */
const MAIN_HALF = '21rem';
const GAP = '1.25rem';

type ZkNavItem = {
  path: string;
  label: string;
};

type ZkAppShellProps = {
  children: ReactNode;
  navigationItems: ZkNavItem[];
  isActive: (path: string) => boolean;
  mobileSheetOpen: boolean;
  onMobileSheetOpenChange: (open: boolean) => void;
};

export function ZkAppShell({
  children,
  navigationItems,
  isActive,
  mobileSheetOpen,
  onMobileSheetOpenChange,
}: ZkAppShellProps) {
  const { isCompact } = useZkAccountsPanelLayout();
  const { expanded, setExpanded, toggleExpanded } = useZkSocialPanelState();

  return (
    <>
      <div className="relative w-full">
        <div className="relative z-0 mx-auto w-full min-w-0 max-w-2xl">
          <nav className="mb-4">
            <div className="flex gap-2">
              {!isCompact ? (
                <ZkSocialNavToggle
                  expanded={expanded}
                  onClick={toggleExpanded}
                  className="min-w-0 flex-1"
                />
              ) : null}

              {navigationItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    'min-w-0 flex-1 px-3 py-2 rounded-2xl text-center text-sm font-medium',
                    NAV_PILL_BASE,
                    isActive(item.path) ? NAV_PILL_ACTIVE : NAV_PILL_INACTIVE,
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </nav>

          <Card className="w-full min-w-0 bg-white shadow-circle-card rounded-2xl backdrop-blur-sm">{children}</Card>
        </div>

        {!isCompact && expanded ? (
          <div
            className="pointer-events-none absolute inset-y-0 left-0 z-10 hidden lg:flex justify-end"
            style={{ width: `calc(50% - ${MAIN_HALF} - ${GAP})` }}
          >
            <div className="pointer-events-auto sticky top-20 mt-[3.25rem] h-fit max-w-full">
              <ZkSocialConnectionsPanel expanded={expanded} onExpandedChange={setExpanded} />
            </div>
          </div>
        ) : null}
      </div>

      {isCompact ? (
        <Sheet open={mobileSheetOpen} onOpenChange={onMobileSheetOpenChange}>
          <SheetContent side="left" className="w-[min(100vw-2rem,22.5rem)] p-0 gap-0">
            <SheetHeader className="sr-only">
              <SheetTitle>Linked identities</SheetTitle>
            </SheetHeader>
            <div className="overflow-y-auto">
              <ZkSocialConnectionsPanel embedded className="bg-transparent" />
            </div>
          </SheetContent>
        </Sheet>
      ) : null}
    </>
  );
}

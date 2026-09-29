import { cn } from '@/components/ui/utils';

export const NAV_PILL_BASE =
  'rounded-2xl transition-[background-color,color,box-shadow] duration-200 ease-[var(--ease-out)] active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100';
export const NAV_PILL_ACTIVE = 'bg-white text-blue-600 shadow-circle-card';
export const NAV_PILL_INACTIVE = 'bg-white/70 text-gray-700 hover:bg-white/90 backdrop-blur-sm';

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
      data-tour="identities-trigger-desktop"
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

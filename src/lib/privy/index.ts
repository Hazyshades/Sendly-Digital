import { type PrivyAuthMode } from '@/lib/privy/authMode';

const LEGACY_PRIVY_APP_ID_FALLBACK = 'cmhg42ayn00p1l40c6jsf09pw';

export const PRIVY_APP_ID_NEW =
  import.meta.env.VITE_PRIVY_APP_ID_NEW ||
  import.meta.env.VITE_PRIVY_APP_ID ||
  LEGACY_PRIVY_APP_ID_FALLBACK;

export const PRIVY_APP_ID_LEGACY =
  import.meta.env.VITE_PRIVY_APP_ID_LEGACY ||
  import.meta.env.VITE_PRIVY_APP_ID ||
  LEGACY_PRIVY_APP_ID_FALLBACK;

export function getPrivyAppIdByMode(mode: PrivyAuthMode): string {
  return mode === 'legacy' ? PRIVY_APP_ID_LEGACY : PRIVY_APP_ID_NEW;
}






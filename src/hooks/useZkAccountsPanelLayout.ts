import { useEffect, useState } from 'react';

const ZK_ACCOUNTS_PANEL_BREAKPOINT = 1024;

export function useZkAccountsPanelLayout() {
  const [isCompact, setIsCompact] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < ZK_ACCOUNTS_PANEL_BREAKPOINT;
  });

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${ZK_ACCOUNTS_PANEL_BREAKPOINT - 1}px)`);
    const update = () => setIsCompact(window.innerWidth < ZK_ACCOUNTS_PANEL_BREAKPOINT);
    mql.addEventListener('change', update);
    update();
    return () => mql.removeEventListener('change', update);
  }, []);

  return { isCompact, breakpoint: ZK_ACCOUNTS_PANEL_BREAKPOINT };
}

export const ZK_ACCOUNTS_PANEL_EXPANDED_KEY = 'sendly:zk-accounts-panel-expanded';

export function readZkAccountsPanelExpanded(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(ZK_ACCOUNTS_PANEL_EXPANDED_KEY) === '1';
}

export function writeZkAccountsPanelExpanded(expanded: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ZK_ACCOUNTS_PANEL_EXPANDED_KEY, expanded ? '1' : '0');
}

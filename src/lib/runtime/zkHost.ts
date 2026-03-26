const ZK_PREVIEW_HOST =
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_ZK_PREVIEW_HOST
    ? (import.meta.env.VITE_ZK_PREVIEW_HOST as string)
    : 'zk.sendly-preview.xetras-projects-a56da406.vercel.app';

export function isZkHost(hostname?: string): boolean {
  const h = (hostname ?? (typeof window !== 'undefined' ? window.location.hostname : '')).toLowerCase();
  if (h === 'zk.localhost' || h.startsWith('zk.') || h.includes('.zk.')) return true;
  return h === ZK_PREVIEW_HOST;
}

export function isZkLocalhost(hostname?: string): boolean {
  return (hostname ?? (typeof window !== 'undefined' ? window.location.hostname : '')).toLowerCase() === 'zk.localhost';
}

function isUnaliasableVercelPreview(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return h.includes('sendly-arc-git-') || (h.endsWith('.vercel.app') && !h.startsWith('zk.') && h.includes('-git-'));
}

/** Maps main hostname to zk hostname (e.g. localhost -> zk.localhost, sendly.digital -> zk.sendly.digital). */
export function toZkHostname(hostname: string): string {
  let h = hostname.toLowerCase();

  // Normalize www-prefixed hostnames:
  // - www.sendly.digital -> sendly.digital
  // - www.zk.sendly.digital -> zk.sendly.digital
  if (h.startsWith('www.')) {
    h = h.slice(4);
    hostname = h;
  }

  if (h === 'zk.localhost' || h.startsWith('zk.') || h.includes('.zk.')) return hostname;
  if (h === 'localhost') return 'zk.localhost';
  if (isUnaliasableVercelPreview(h)) return ZK_PREVIEW_HOST;
  return `zk.${h}`;
}

export function toZkUrl(currentUrl: string): string {
  const url = new URL(currentUrl);
  url.hostname = toZkHostname(url.hostname);
  return url.toString();
}

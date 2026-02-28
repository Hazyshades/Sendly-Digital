export function isZkHost(hostname?: string): boolean {
  const h = (hostname ?? (typeof window !== 'undefined' ? window.location.hostname : '')).toLowerCase();
  // zk.localhost, zk.sendly.digital, or www.zk.sendly.digital (and other *.zk.*)
  if (h === 'zk.localhost' || h.startsWith('zk.') || h.includes('.zk.')) return true;
  
  // Check if it's the preview zk host
  const previewHost = (
    typeof import.meta !== 'undefined' && import.meta.env?.VITE_ZK_PREVIEW_HOST
      ? (import.meta.env.VITE_ZK_PREVIEW_HOST as string)
      : 'zk.sendly-preview.xetras-projects-a56da406.vercel.app'
  ).toLowerCase();
  
  return h === previewHost;
}

export function isZkLocalhost(hostname?: string): boolean {
  const h = (hostname ?? window.location.hostname).toLowerCase();
  return h === 'zk.localhost';
}

/**
 * Vercel preview zk alias: subdomains like *.sendly-arc-git-*.vercel.app cannot be
 * aliased (reserved for Git integration). Use a fixed alias under *.xetras-projects-*.vercel.app.
 * Set in Vercel env as VITE_ZK_PREVIEW_HOST for preview deployments.
 */
const ZK_PREVIEW_HOST =
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_ZK_PREVIEW_HOST
    ? (import.meta.env.VITE_ZK_PREVIEW_HOST as string)
    : 'zk.sendly-preview.xetras-projects-a56da406.vercel.app';

/**
 * True if hostname is a Vercel preview we can't alias (zk.* would be reserved).
 */
function isUnaliasableVercelPreview(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return (
    h.includes('sendly-arc-git-') ||
    (h.endsWith('.vercel.app') && !h.startsWith('zk.') && h.includes('-git-'))
  );
}

/**
 * Maps a "main" hostname to the corresponding zk hostname.
 *
 * Examples:
 * - localhost -> zk.localhost
 * - sendly.digital -> zk.sendly.digital
 * - preview-123.vercel.app -> zk.preview-123.vercel.app
 * - sendly-arc-git-*.vercel.app -> VITE_ZK_PREVIEW_HOST (cannot alias zk.* for that domain)
 */
export function toZkHostname(hostname: string): string {
  const h = hostname.toLowerCase();
  // Already a zk host: zk.localhost, zk.sendly.digital, www.zk.sendly.digital, etc.
  if (h === 'zk.localhost' || h.startsWith('zk.') || h.includes('.zk.')) return hostname;
  if (h === 'localhost') return 'zk.localhost';
  if (isUnaliasableVercelPreview(h)) return ZK_PREVIEW_HOST;
  return `zk.${hostname}`;
}

export function toZkUrl(currentUrl: string): string {
  const url = new URL(currentUrl);
  url.hostname = toZkHostname(url.hostname);
  return url.toString();
}


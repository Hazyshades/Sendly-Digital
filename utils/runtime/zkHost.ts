export function isZkHost(hostname?: string): boolean {
  const h = (hostname ?? window.location.hostname).toLowerCase();
  return h === 'zk.localhost' || h.startsWith('zk.');
}

export function isZkLocalhost(hostname?: string): boolean {
  const h = (hostname ?? window.location.hostname).toLowerCase();
  return h === 'zk.localhost';
}

/**
 * Maps a "main" hostname to the corresponding zk hostname.
 *
 * Examples:
 * - localhost -> zk.localhost
 * - sendly.digital -> zk.sendly.digital
 * - preview-123.vercel.app -> zk.preview-123.vercel.app
 */
export function toZkHostname(hostname: string): string {
  const h = hostname.toLowerCase();
  if (h === 'zk.localhost' || h.startsWith('zk.')) return hostname;
  if (h === 'localhost') return 'zk.localhost';
  return `zk.${hostname}`;
}

export function toZkUrl(currentUrl: string): string {
  const url = new URL(currentUrl);
  url.hostname = toZkHostname(url.hostname);
  return url.toString();
}


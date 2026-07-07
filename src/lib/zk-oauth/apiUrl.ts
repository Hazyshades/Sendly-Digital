export function getZkTlsApiUrl(): string {
  const envUrl =
    (import.meta.env.VITE_ZKTLS_SERVICE_URL as string | undefined) ||
    (import.meta.env.VITE_ZKTLS_API_URL as string | undefined);
  if (envUrl?.trim()) return envUrl.trim().replace(/\/$/, '');

  if (typeof window !== 'undefined' && window.location?.origin) {
    try {
      const url = new URL(window.location.origin);
      let hostname = url.hostname.toLowerCase();
      if (hostname.startsWith('www.')) {
        hostname = hostname.slice(4);
        url.hostname = hostname;
        return url.origin;
      }
      return window.location.origin;
    } catch {
      return window.location.origin;
    }
  }

  return 'http://localhost:3001';
}

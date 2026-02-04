import { useEffect, useRef } from 'react';

const getZkTlsApiUrl = (): string => {
  if (typeof window !== 'undefined' && window.location?.origin) return window.location.origin;
  const envUrl =
    (import.meta.env.VITE_RECLAIM_API_URL as string | undefined) ||
    (import.meta.env.VITE_ZKTLS_API_URL as string | undefined);
  if (envUrl) return envUrl;
  return 'http://localhost:3001';
};

interface TelegramWidgetUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

export function TelegramAuthRoute() {
  const containerRef = useRef<HTMLDivElement>(null);
  const scriptLoadedRef = useRef(false);

  useEffect(() => {
    (window as unknown as { onTelegramAuth?: (user: TelegramWidgetUser) => void }).onTelegramAuth =
      async function onTelegramAuth(user: TelegramWidgetUser) {
        const origin = window.location.origin;
        try {
          const apiUrl = getZkTlsApiUrl().replace(/\/$/, '');
          // Send only fields present in Telegram's user object so backend hash verification matches
          const payload: Record<string, string | number> = {
            id: user.id,
            first_name: user.first_name,
            auth_date: user.auth_date,
            hash: user.hash,
          };
          if (user.last_name !== undefined) payload.last_name = user.last_name;
          if (user.username !== undefined) payload.username = user.username;
          if (user.photo_url !== undefined) payload.photo_url = user.photo_url;

          const res = await fetch(`${apiUrl}/api/telegram/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

          const data = (await res.json().catch(() => ({}))) as {
            success?: boolean;
            accessToken?: string;
            username?: string;
            error?: string;
          };

          if (!res.ok || !data.success || !data.accessToken) {
            const errMsg = data.error || `Verify failed: ${res.status}`;
            if (window.opener && !(window.opener as Window).closed) {
              (window.opener as Window).postMessage(
                { type: 'telegram_oauth_error', error: errMsg },
                origin
              );
            }
            return;
          }

          localStorage.setItem('telegram_oauth_token', data.accessToken);
          localStorage.setItem('telegram_oauth', data.accessToken);

          if (window.opener && !(window.opener as Window).closed) {
            (window.opener as Window).postMessage(
              { type: 'telegram_oauth_token', accessToken: data.accessToken, username: data.username },
              origin
            );
          }
          window.close();
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Telegram verify failed';
          if (window.opener && !(window.opener as Window).closed) {
            (window.opener as Window).postMessage({ type: 'telegram_oauth_error', error: msg }, origin);
          }
        }
      };

    // Widget expects bot username WITHOUT @ (e.g. "MyBot", not "@MyBot")
    const raw = (import.meta.env.VITE_TELEGRAM_BOT_USERNAME as string) || '';
    const botUsername = raw.replace(/^@/, '').trim();
    if (!botUsername) {
      return;
    }

    if (scriptLoadedRef.current) return;
    scriptLoadedRef.current = true;

    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.setAttribute('data-telegram-login', botUsername);
    script.setAttribute('data-size', 'medium');
    script.setAttribute('data-onauth', 'onTelegramAuth(user)');
    script.async = true;
    const container = containerRef.current;
    if (container) {
      container.appendChild(script);
    } else {
      document.body.appendChild(script);
    }

    return () => {
      (window as unknown as { onTelegramAuth?: (user: TelegramWidgetUser) => void }).onTelegramAuth = undefined;
    };
  }, []);

  const raw = (import.meta.env.VITE_TELEGRAM_BOT_USERNAME as string) || '';
  const botUsername = raw.replace(/^@/, '').trim();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <h2 className="mb-4 text-xl font-semibold">Log in with Telegram</h2>
      {botUsername ? (
        <>
          <div ref={containerRef} id="telegram-login-container" />
          <p className="mt-4 max-w-sm text-center text-xs text-muted-foreground">
            If you see &quot;Username invalid&quot;, in @BotFather run /setdomain and add this exact origin: <code className="rounded bg-muted px-1">{typeof window !== 'undefined' ? window.location.origin : '…'}</code>
            <span className="mt-2 block"> If you see &quot;Invalid Telegram widget hash&quot; or connection errors, ensure <strong>zktls-service</strong> is running (e.g. <code className="rounded bg-muted px-1">npm start</code> from project root or <code className="rounded bg-muted px-1">node server.js</code> from zktls-service) and <code className="rounded bg-muted px-1">TELEGRAM_BOT_TOKEN</code> is set in zktls-service/.env.</span>
            {typeof window !== 'undefined' && window.location.port && window.location.port !== '443' ? (
              <span className="mt-2 block"> If you see a CSP &quot;frame-ancestors&quot; error, run dev on port 443: <code className="rounded bg-muted px-1">VITE_DEV_PORT_443=true</code> in .env, then open <code className="rounded bg-muted px-1">https://zk.localhost</code>.</span>
            ) : null}
          </p>
        </>
      ) : (
        <p className="text-red-600">VITE_TELEGRAM_BOT_USERNAME not configured</p>
      )}
    </div>
  );
}

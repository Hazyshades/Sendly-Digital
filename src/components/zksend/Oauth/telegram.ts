import { toast } from 'sonner';
import { createPopupWindow } from './utils';

/**
 * Request Telegram login via widget (popup to /auth/telegram).
 * Resolves with JWT access token on success.
 */
export const requestTelegramLoginFlow = async (): Promise<string | null> => {
  return new Promise((resolve) => {
    localStorage.setItem('telegram_oauth_redirect', window.location.href);

    const authUrl = `${window.location.origin}/auth/telegram`;
    toast.info('Opening Telegram authorization...');

    const popup = createPopupWindow(authUrl, 'Telegram Login');

    if (!popup) {
      toast.error('Popup blocked. Please allow popups for this site.');
      resolve(null);
      return;
    }

    const messageHandler = (event: MessageEvent) => {
      if (event.data?.target === 'metamask-inpage' || event.data?.name === 'metamask-provider') {
        return;
      }

      if (event.origin !== window.location.origin) {
        return;
      }

      if (
        event.data &&
        typeof event.data === 'object' &&
        event.data.type === 'telegram_oauth_token' &&
        event.data.accessToken
      ) {
        const token = event.data.accessToken as string;
        localStorage.setItem('telegram_oauth', token);
        localStorage.setItem('telegram_oauth_token', token);

        window.removeEventListener('message', messageHandler);
        if (popup) popup.close();
        resolve(token);
      } else if (
        event.data &&
        typeof event.data === 'object' &&
        event.data.type === 'telegram_oauth_error'
      ) {
        const errorMsg = event.data.error as string | undefined;
        window.removeEventListener('message', messageHandler);
        if (popup) popup.close();
        if (errorMsg) toast.error(errorMsg);
        resolve(null);
      }
    };

    window.addEventListener('message', messageHandler);

    const checkStorage = setInterval(() => {
      const token = localStorage.getItem('telegram_oauth_token') || localStorage.getItem('telegram_oauth');
      if (token && token.length > 10) {
        clearInterval(checkStorage);
        window.removeEventListener('message', messageHandler);
        if (popup) popup.close();
        resolve(token);
      }
    }, 500);

    const checkPopup = setInterval(() => {
      if (popup?.closed) {
        clearInterval(checkPopup);
        clearInterval(checkStorage);
        window.removeEventListener('message', messageHandler);
        resolve(null);
      }
    }, 500);
  });
};

/**
 * Connect to Telegram via Login Widget
 */
export const connectTelegram = async (): Promise<string | null> => {
  try {
    const token = await requestTelegramLoginFlow();
    if (!token) {
      throw new Error(
        'Telegram authorization failed or was cancelled. Check the domain in BotFather /setdomain.'
      );
    }
    toast.success('Telegram connected');
    return token;
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to connect Telegram';
    toast.error(msg);
    return null;
  }
};

/**
 * Clear Telegram token from storage
 */
export const clearTelegramToken = (): void => {
  try {
    localStorage.removeItem('telegram_oauth');
    localStorage.removeItem('telegram_oauth_token');
    localStorage.removeItem('telegram_oauth_redirect');
    toast.success('Telegram token cleared');
  } catch (error) {
    console.error('[zkSEND] Failed to clear Telegram token:', error);
    toast.error('Failed to clear Telegram token');
  }
};
